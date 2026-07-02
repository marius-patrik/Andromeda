# MoE and Adapter-Augmented Rollout Playbook

_Source migrated from `marius-patrik/marius-patrik:research/moe-adapter-rollout-playbook.md`._

## What this does

This page defines a rollout checklist for Mixture-of-Experts and adapter-augmented model stacks. It focuses on reproducibility, quality, latency, memory pressure, routing stability, observability, and rollback safety before live traffic reaches a new candidate build.

## Why it is worth using

MoE and adapter deployments can fail in ways that do not show up in ordinary model-quality tests. Routing collapse, expert-cache misses, adapter-order drift, quantization mismatch, cold-start regression, and KV-cache pressure all need release gates.

## Acceptance before canary

A candidate build should pass these checks before it receives live traffic:

- pin model ID, adapter ID, routing table, quantization config, tokenizer, serving image, and adapter order,
- run held-out evaluation against the last known-good baseline,
- block if quality drops by more than 1.5 percentage points absolute,
- enforce P99 latency no worse than 1.2x baseline,
- sweep batch size, sequence length, KV-cache residency, adapter load, adapter merge, and quantized initialization,
- capture peak GPU/CPU memory, allocator retries, cache eviction, and OOM events,
- validate deterministic tiny-fixture hashes when bit-for-bit determinism is feasible.

## MoE routing gates

For MoE releases, collect representative token-volume telemetry:

- per-expert token counts,
- expert-load standard deviation divided by mean,
- gate entropy,
- gate saturation or collapse indicators,
- capacity overflow and token-drop counts,
- expert cache hit rate,
- prefetch or offload success rate.

Default rollback thresholds:

| Area | Rollback trigger |
| --- | --- |
| Quality | Validation metric drops more than 1.5 percentage points absolute |
| Latency | P99 end-to-end latency exceeds 1.2x baseline for five checks |
| Routing | Expert-load standard deviation divided by mean exceeds 0.05 |
| Cache | Expert cache hit rate falls below 0.80 |
| Errors | 5xx or timeout rate rises more than 50% above baseline |
| Memory | Repeated OOM, allocator failure, or severe eviction storm |

## Canary plan

1. Start with 1% traffic or one low-risk tenant cohort.
2. Hold for 30 to 60 minutes of peak traffic or a fixed request threshold.
3. Promote to 10% only if all gates remain healthy.
4. Hold again using the same checks.
5. Promote to 100% only after the 10% stage is clean.

Keep the previous serving stack hot and health checked until the rollout is stable.

## CI/CD automation

Pull request checks should include:

- adapter load and merge tests,
- routing config parsing tests,
- deterministic tiny-fixture forward-pass test,
- tokenizer/checkpoint/quantization schema checks,
- custom-kernel ABI checks,
- serving smoke test through base model plus adapter.

Nightly benchmarks should upload P50/P95/P99 latency, tokens per second, memory peaks, allocator fragmentation, KV-cache residency, per-expert utilization, gate entropy, and expert cache hit rate.

## Runnable today

Start by wiring a release job that exports these artifacts for every candidate:

```text
model_id
adapter_id
routing_table_id
quantization_config
serving_image_digest
p99_latency_ms
validation_score
expert_load_stddev_ratio
expert_cache_hit_rate
oom_count
rollback_flag
```

Block promotion if any rollback threshold is breached.

## Limitations and caveats

Thresholds are safe defaults, not universal SLOs. Tune them per product, model size, tenant risk, and hardware target. A deployment without MoE can ignore expert telemetry but should still preserve adapter, quantization, cold-start, memory, and rollback gates.
