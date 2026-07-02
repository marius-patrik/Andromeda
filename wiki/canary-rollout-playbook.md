# Canary Rollout Playbook

This page is a runnable checklist for shipping risky adapter, routing, and model-serving changes safely: deterministic tests first, a small canary cohort, fast Prometheus checks, and automatic rollback when thresholds breach.

```text
CI -> deterministic replay tests -> 5% canary -> Prometheus checks -> progressive traffic -> rollback on breach
```

## What this protects

- Non-deterministic model outputs before traffic shift.
- Validation regressions after adapter/model changes.
- P99 latency regressions during serving changes.
- MoE-style routing imbalance or hot experts.
- Human error during rollout and rollback.

## Workflow gate

Create `.github/workflows/canary-deploy.yml`:

```yaml
name: Canary deploy (adapters)
on: [workflow_dispatch]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v4
        with: {python-version: '3.10'}
      - name: Install deps
        run: pip install -r requirements-dev.txt requests pytest
      - name: Run deterministic replay unit tests
        run: pytest tests/test_deterministic_replay.py -q
      - name: Deploy canary (5%)
        env: {KUBECONFIG: ${{ secrets.KUBECONFIG }}}
        run: ./scripts/deploy_canary.sh --canary 5
      - name: Wait for canary to warm
        run: sleep 90
      - name: Check metrics and auto-rollback
        env:
          PROM_URL: ${{ secrets.PROM_URL }}
          BASELINE_HASH: ${{ secrets.BASELINE_HASH }}
          VALIDATION_DROP: '0.01'
          P99_DELTA: '0.20'
          ROUTING_STD: '0.05'
        run: |
          python ci/check_prometheus.py \
            --prom $PROM_URL \
            --baseline-hash $BASELINE_HASH \
            --val-drop-thresh $VALIDATION_DROP \
            --p99-delta $P99_DELTA \
            --routing-std $ROUTING_STD || (
              echo "Thresholds breached — rolling back" && ./scripts/rollback_canary.sh && exit 1
            )
```

## Prometheus checker

Create `ci/check_prometheus.py` and adapt the metric names and labels to the service.

```python
import argparse
import os
import sys
from statistics import pstdev

import requests


def prom_query(prom_url: str, query: str):
    response = requests.get(f"{prom_url}/api/v1/query", params={"query": query}, timeout=15)
    response.raise_for_status()
    return response.json()["data"]["result"]


def scalar(prom_url: str, query: str) -> float:
    result = prom_query(prom_url, query)
    if not result:
        raise RuntimeError(f"Prometheus query returned no series: {query}")
    return float(result[0]["value"][1])


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prom", required=True)
    parser.add_argument("--baseline-hash", required=False)
    parser.add_argument("--val-drop-thresh", type=float, default=float(os.getenv("VALIDATION_DROP", "0.01")))
    parser.add_argument("--p99-delta", type=float, default=float(os.getenv("P99_DELTA", "0.20")))
    parser.add_argument("--routing-std", type=float, default=float(os.getenv("ROUTING_STD", "0.05")))
    args = parser.parse_args()

    q_val = "sum(rate(model_validation_accuracy_sum[5m])) / sum(rate(model_validation_accuracy_count[5m]))"
    q_p99 = "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))"
    q_routing = "sum by(expert)(rate(moe_tokens_routed_total[5m]))"

    val_now = scalar(args.prom, q_val)
    baseline_val = float(os.getenv("BASELINE_VAL", str(val_now)))
    if baseline_val - val_now > args.val_drop_thresh:
        print(f"validation drop exceeded: baseline={baseline_val:.4f} current={val_now:.4f}")
        return 2

    p99_now = scalar(args.prom, q_p99)
    p99_base = float(os.getenv("P99_BASE", str(p99_now)))
    if (p99_now - p99_base) / max(1e-6, p99_base) > args.p99_delta:
        print(f"p99 latency delta exceeded: baseline={p99_base:.4f} current={p99_now:.4f}")
        return 3

    routes = prom_query(args.prom, q_routing)
    vals = [float(row["value"][1]) for row in routes]
    if vals:
        mean = sum(vals) / len(vals)
        if mean > 0 and pstdev(vals) / mean > args.routing_std:
            print("routing imbalance high")
            return 4

    print("checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

## Deterministic replay test

Create `tests/test_deterministic_replay.py`:

```python
import hashlib

import torch

from model import load_adapter, load_base_model


def deterministic_forward(model, inputs):
    torch.manual_seed(42)
    torch.cuda.manual_seed_all(42)
    torch.use_deterministic_algorithms(True)
    with torch.no_grad():
        out = model(inputs)
    return out.cpu().numpy().tobytes()


def test_replay_hash():
    base = load_base_model("models/base.pt", device="cpu")
    load_adapter("adapters/latest.adapter", base)
    base.eval()

    sample = torch.load("ci/seed_inputs.pt", map_location="cpu")
    digest = hashlib.sha256(deterministic_forward(base, sample)).hexdigest()
    assert digest == "REPLACE_WITH_KNOWN_GOOD_HASH"
```

## Argo Rollouts analysis

Use Argo Rollouts or Flagger to move traffic only while the analysis succeeds.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: adapter-canary-analysis
spec:
  metrics:
    - name: validation-drop
      interval: 30s
      failureLimit: 1
      provider:
        prometheus:
          address: http://prometheus.monitoring.svc:9090
          query: "(baseline_val - current_val) > 0.01"
    - name: p99-latency
      interval: 30s
      failureLimit: 1
      provider:
        prometheus:
          address: http://prometheus.monitoring.svc:9090
          query: "(p99_canary / p99_primary) > 1.2"
---
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: adapter-service
spec:
  strategy:
    canary:
      steps:
        - setWeight: 5
        - analysis:
            templates:
              - name: adapter-canary-analysis
        - setWeight: 25
        - analysis:
            templates:
              - name: adapter-canary-analysis
        - setWeight: 100
```

## Wiring checklist

1. Set repository secrets: `PROM_URL`, `KUBECONFIG`, and `BASELINE_HASH`.
2. Optionally set `BASELINE_VAL` and `P99_BASE` from a known-good production window.
3. Add `ci/seed_inputs.pt` and replace the replay hash after validating a known-good model.
4. Implement `scripts/deploy_canary.sh` and `scripts/rollback_canary.sh` with the repo's Helm, kubectl, or rollout commands.
5. Replace example PromQL with service-specific metric names and labels.

## Threshold defaults

Use stricter thresholds at lower canary percentages and relax only after stable evidence:

| Canary | Max validation drop | Max P99 delta | Routing std/mean |
| --- | ---: | ---: | ---: |
| 1% | 0.5% absolute | 10% | 3% |
| 5% | 1.0% absolute | 20% | 5% |
| 20% | 1.5% absolute | 25% | 7% |

## Rollback rule

The deterministic replay hash must pass before traffic shift. Any Prometheus threshold breach at canary weight should immediately call rollback and fail the workflow so the rollout cannot silently continue.
