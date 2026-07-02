# Continual Replay Experiment

_Source migrated from `marius-patrik/marius-patrik:research/continual-replay-experiment.md`._

## What this does

This experiment compares replay-based memory-consolidation strategies for reducing catastrophic forgetting in continual learning. It tests no replay, uniform replay, prioritized replay, and sleep-style offline replay across supervised continual learning and reinforcement learning.

## Research question

Which replay strategy gives the best retained performance per unit of compute?

## Hypotheses

1. Uniform replay reduces forgetting relative to no replay.
2. Prioritized replay improves sample efficiency when priority aligns with task loss or TD error.
3. Sleep-style replay reduces forgetting most strongly but may cost more compute.
4. The best method improves retained accuracy or return while staying under a 2x compute budget.

## Conditions

| Condition | Description |
| --- | --- |
| No replay | Train only on the current stream or environment interaction. |
| Uniform replay | Sample past items uniformly from a fixed-size buffer. |
| Prioritized replay | Sample past items proportional to loss or TD error. |
| Sleep replay | Pause online training and run offline consolidation over buffered or synthetic replay data. |

## First-run grid

| Domain | Task | Replay modes | Seeds |
| --- | --- | ---: | ---: |
| Supervised | Split-MNIST | none, uniform, per, sleep | 5 |
| RL | CartPole-v1 | none, uniform, per, sleep | 5 |

Use 10k to 50k total training steps per run. Save checkpoints after each task and at the final checkpoint.

## Metrics

Primary:

- average accuracy across supervised tasks,
- average return for RL,
- forgetting index per task: `max_performance(task) - final_performance(task)`,
- mean forgetting across tasks.

Secondary:

- forward transfer,
- sample efficiency,
- representation overlap using CKA, CCA, or PCA subspace similarity,
- retained performance per wall-time or FLOP estimate.

## Success criteria

A replay method is promising if it achieves:

- at least 10% reduction in forgetting versus no replay,
- no more than 2x wall-time or FLOP overhead,
- stable results across 5 seeds.

## Minimal API

```python
class MemoryConsolidator:
    def __init__(self, mode, buf_size=50_000, priority_alpha=0.6,
                 sleep_freq=1000, offline_epochs=5):
        ...

    def observe(self, x, y=None, reward=None, info=None, loss=None, td_error=None):
        ...

    def sample(self, batch_size):
        ...

    def update_priorities(self, idxs, new_priorities):
        ...

    def maybe_sleep(self, model, optimizer, data_loader_fn):
        ...
```

## Commands

```bash
python -m src.train_sup --task split_mnist --mode none --seeds 5
python -m src.train_sup --task split_mnist --mode uniform --seeds 5
python -m src.train_sup --task split_mnist --mode per --seeds 5 --priority_alpha 0.6
python -m src.train_sup --task split_mnist --mode sleep --seeds 5 --sleep_freq 1000 --offline_epochs 5

python -m src.train_rl --env CartPole-v1 --mode none --seeds 5
python -m src.train_rl --env CartPole-v1 --mode uniform --seeds 5
python -m src.train_rl --env CartPole-v1 --mode per --seeds 5 --priority_alpha 0.6
python -m src.train_rl --env CartPole-v1 --mode sleep --seeds 5 --sleep_freq 1000 --offline_epochs 5
```

## Expected outputs

- `results/metrics.csv`
- `results/forgetting_summary.csv`
- `results/compute_summary.csv`
- `plots/avg_accuracy.png` or `plots/avg_return.png`
- `plots/forgetting_index.png`
- `plots/retain_vs_compute.png`
- `plots/cka_similarity.png`

## Follow-up ablations

- buffer size: 5k, 10k, 50k, 100k,
- replay ratio: 0.25x, 0.5x, 1x, 2x,
- sleep trigger: fixed interval versus validation-drop trigger,
- PER priority signal: loss, gradient norm, TD error, mixed score,
- synthetic replay: buffered-only versus generated samples.

## Limitations and caveats

Split-MNIST and CartPole are fast sanity checks, not final proof. Use them to validate the harness, then move to CIFAR-10 incremental and a stronger RL environment if the first run passes the success criteria.
