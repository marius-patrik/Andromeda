# Reproducible CI for physics and agent experiments

This page documents a compact CI pattern for making experiments repeatable across commits. It is intended for small, fast checks that protect longer physics or agent runs from silent drift.

## Goal

Reproducible results require the same runtime, the same package versions, the same seeds, and the same checks on every commit. The baseline setup is:

- pinned Python or Julia dependencies;
- deterministic runtime flags;
- two fast smoke tests;
- notebook execution for plots;
- CI artifacts for metrics and image digests.

## Commit checklist

Add these files to the repo:

```text
.
├─ Dockerfile
├─ environment.yml            # or Project.toml for Julia
├─ scripts/
│  ├─ lanczos_check.py
│  └─ mps_smoke_test.py
├─ notebooks/
│  └─ run_plots.ipynb
└─ .github/workflows/ci-verify.yml
```

The two scripts should exit non-zero on failure. CI should run a CPU target and, when available, a CUDA target. Nightly runs should upload metrics, executed notebooks, and the built image digest.

## Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
ARG BASE=python:3.11-slim
FROM ${BASE}

# For CUDA builds, switch BASE to:
# nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04
# Keep the rest identical.

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=0 \
    CUBLAS_WORKSPACE_CONFIG=:16:8 \
    TORCH_USE_CUDA_DSA=0

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential git curl libfftw3-3 \
    && rm -rf /var/lib/apt/lists/*

COPY environment.yml /app/
RUN pip install --upgrade pip && python - <<'PY'
import subprocess
import sys
import yaml

with open('environment.yml', 'r', encoding='utf-8') as f:
    env = yaml.safe_load(f)

requirements = env.get('pip', [])
subprocess.check_call([sys.executable, '-m', 'pip', 'install', *requirements])
PY

COPY . /app

ENV FORCE_DETERMINISTIC=1
```

## environment.yml

```yaml
name: lgt
dependencies: []
pip:
  - numpy==1.26.4
  - scipy==1.13.1
  - matplotlib==3.8.4
  - numba==0.59.1
  - torch==2.2.2
  - torchvision==0.17.2
  - jax[cpu]==0.4.26
  - opt_einsum==3.3.0
  - tensornetwork==0.4.6
  - papermill==2.5.0
  - ipykernel==6.29.4
  - PyYAML==6.0.2
```

## scripts/lanczos_check.py

```python
import json
import sys

import numpy as np

np.random.seed(0)


def lanczos(H: np.ndarray, v0: np.ndarray, k: int) -> float:
    v = v0 / np.linalg.norm(v0)
    alpha = []
    beta = []

    w = H @ v
    a = float(np.dot(v, w))
    w = w - a * v
    alpha.append(a)

    for _ in range(1, k):
        b = float(np.linalg.norm(w))
        if b == 0:
            break
        beta.append(b)
        v_next = w / b
        w = H @ v_next - b * v
        a = float(np.dot(v_next, w))
        w = w - a * v_next
        alpha.append(a)
        v = v_next

    T = np.diag(alpha) + np.diag(beta, 1) + np.diag(beta, -1)
    return float(np.linalg.eigvalsh(T)[0])


def exact_ground(H: np.ndarray) -> float:
    return float(np.linalg.eigvalsh(H)[0])


L = 6
J = 1.0
H = np.diag(np.full(L, 2 * J)) - J * (
    np.diag(np.ones(L - 1), 1) + np.diag(np.ones(L - 1), -1)
)
v0 = np.random.randn(L)

e_lanczos = lanczos(H, v0, k=6)
e_exact = exact_ground(H)
err = abs(e_lanczos - e_exact)

print(json.dumps({
    'lanczos_ground': e_lanczos,
    'exact_ground': e_exact,
    'abs_error': err,
}, indent=2))

sys.exit(0 if err < 1e-8 else 1)
```

## scripts/mps_smoke_test.py

Replace this minimal stand-in with the real MPS engine when it is available. Keep the CI version tiny so it runs in seconds.

```python
import json
import sys

import numpy as np

np.random.seed(0)


def gauss_law_violation(state: np.ndarray) -> float:
    return float(abs(np.linalg.norm(state) - 1.0))


def evolve_one_step(state: np.ndarray, dt: float = 1e-3) -> np.ndarray:
    del dt
    return state / np.linalg.norm(state)


psi0 = np.random.randn(32)
psi0 /= np.linalg.norm(psi0)

g0 = gauss_law_violation(psi0)
psi1 = evolve_one_step(psi0)
g1 = gauss_law_violation(psi1)
drift = g1 - g0

print(json.dumps({
    'g0': g0,
    'g1': g1,
    'gauss_drift': drift,
}, indent=2))

sys.exit(0 if abs(drift) < 1e-10 else 1)
```

## .github/workflows/ci-verify.yml

```yaml
name: CI Verify

on:
  push:
  pull_request:
  schedule:
    - cron: "0 2 * * *"

jobs:
  build-and-test:
    strategy:
      fail-fast: false
      matrix:
        target: [cpu, cuda]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Select base
        id: base
        run: |
          if [ "${{ matrix.target }}" = "cuda" ]; then
            echo "BASE=nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04" >> "$GITHUB_OUTPUT"
          else
            echo "BASE=python:3.11-slim" >> "$GITHUB_OUTPUT"
          fi

      - name: Build image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          load: true
          tags: lgt-ci:${{ matrix.target }}
          build-args: |
            BASE=${{ steps.base.outputs.BASE }}

      - name: Record image digest
        run: docker image inspect lgt-ci:${{ matrix.target }} --format='{{.Id}}' | tee image_digest_${{ matrix.target }}.txt

      - name: Run Lanczos check
        run: docker run --rm -e FORCE_DETERMINISTIC=1 lgt-ci:${{ matrix.target }} python scripts/lanczos_check.py | tee lanczos_${{ matrix.target }}.json

      - name: Run MPS smoke test
        run: docker run --rm -e FORCE_DETERMINISTIC=1 lgt-ci:${{ matrix.target }} python scripts/mps_smoke_test.py | tee mps_${{ matrix.target }}.json

      - name: Execute plots with Papermill
        run: |
          mkdir -p artifacts
          docker run --rm -v "$PWD:/w" -w /w lgt-ci:${{ matrix.target }} \
            papermill notebooks/run_plots.ipynb artifacts/run_plots_${{ matrix.target }}.ipynb

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ci-${{ matrix.target }}
          path: |
            image_digest_${{ matrix.target }}.txt
            lanczos_${{ matrix.target }}.json
            mps_${{ matrix.target }}.json
            artifacts/*.ipynb
```

## Determinism notes

Set these environment variables for Python experiments:

```bash
export PYTHONHASHSEED=0
export CUBLAS_WORKSPACE_CONFIG=:16:8
export FORCE_DETERMINISTIC=1
```

When using PyTorch in the test scripts, also enable deterministic algorithms:

```python
import torch

torch.use_deterministic_algorithms(True)
```

For Julia experiments, prefer a pinned `Project.toml` and set single-threaded execution for exact CI comparisons:

```bash
export JULIA_NUM_THREADS=1
export JULIA_CPU_THREADS=1
```

## Local sanity run

```bash
docker build -t lgt-ci:cpu . && \
docker run --rm lgt-ci:cpu python scripts/lanczos_check.py && \
docker run --rm lgt-ci:cpu python scripts/mps_smoke_test.py
```

## Failure policy

CI should fail when any of the following occur:

- the Lanczos ground-state error exceeds the tolerance;
- the one-step MPS evolution increases Gauss-law drift beyond tolerance;
- the notebook cannot execute cleanly;
- the environment cannot be rebuilt from pinned files.

Keep these checks intentionally small. They are regression guards, not production benchmarks.
