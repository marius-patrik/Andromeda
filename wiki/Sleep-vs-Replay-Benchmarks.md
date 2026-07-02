# Sleep vs. Replay Benchmarks

## Overview

This benchmark suite compares biologically inspired **sleep-style consolidation** against classical **experience replay** methods in continual learning.

The goal is to quantify retained task performance, catastrophic forgetting, transfer effects, and compute efficiency under controlled incremental learning settings.

## Motivation

Continual learning systems drift and forget as tasks accumulate. Replay buffers partially mitigate forgetting, but biological systems appear to use additional offline consolidation phases such as sleep. This benchmark evaluates whether periodic offline replay bursts improve retention-efficiency tradeoffs compared with standard online replay.

## Benchmark Tasks

### Split-MNIST

MNIST digits are split into five binary tasks:

| Task | Classes |
|---|---|
| T1 | 0, 1 |
| T2 | 2, 3 |
| T3 | 4, 5 |
| T4 | 6, 7 |
| T5 | 8, 9 |

Tasks are presented sequentially. Evaluation occurs after each task.

### CIFAR-10 Incremental Learning

CIFAR-10 classes are split into five two-class tasks:

| Task | Classes |
|---|---|
| T1 | airplane, automobile |
| T2 | bird, cat |
| T3 | deer, dog |
| T4 | frog, horse |
| T5 | ship, truck |

Use standard CIFAR augmentation: random crop, horizontal flip, and normalization.

## Models

### Split-MNIST Model

MLP architecture:

- Linear(784 → 512), ReLU, Dropout(0.1)
- Linear(512 → 512), ReLU, Dropout(0.1)
- Linear(512 → 10)

### CIFAR-10-IL Model

Small ResNet-8:

- Basic residual blocks
- Width = 16
- BatchNorm
- ReLU

### Optimizer

```yaml
name: adam
lr: 1e-3
weight_decay: 1e-5
```

## Experimental Conditions

### 1. No Replay

Baseline continual learning. Train only on the current task stream. No memory buffer and no revisiting prior data.

Expected: high forgetting, lowest compute cost.

### 2. Uniform Replay

Use a reservoir replay buffer. Sample uniformly from the buffer and augment each online batch with replay samples.

Expected: reduced forgetting, moderate compute overhead.

### 3. Prioritized Experience Replay

Replay is prioritized by a loss proxy or TD-error:

\[
p_i \propto |\delta_i|^\alpha
\]

Where:

- \(\delta_i\) is the replay priority signal
- \(\alpha \in \{0.4, 0.6, 0.8\}\)

Expected: better replay efficiency, higher replay complexity.

### 4. Sleep-Style Hybrid

Online learning plus periodic offline consolidation.

Online phase is the same as uniform replay. Every `sleep_freq` optimizer steps, pause the online stream and train offline over the replay buffer for multiple consolidation epochs.

```yaml
offline_epochs: [1, 5, 10]
sleep_freq: 1000
```

Expected: improved retention, higher compute usage, and potentially better compute/accuracy tradeoffs.

## Hyperparameters

```yaml
buffer_size: 200000
replay_batch: 256
batch_size: 128
sleep_freq: 1000
offline_epochs: [1, 5, 10]
priority_alpha: [0.4, 0.6, 0.8]
```

Training length:

```yaml
split_mnist_steps: 10000
cifar10_il_steps: 50000
```

Seeds:

```yaml
pilot_seeds: 5
publication_seeds: 20
```

## Metrics

Let \(A_{i,j}\) be accuracy on task \(i\) after training task \(j\).

### Final Mean Accuracy

\[
\text{FinalAcc} = \frac{1}{T}\sum_{i=1}^{T} A_{i,T}
\]

### Forgetting Index

Per task:

\[
F_i = \max_{k \in [i,\dots,T]} A_{i,k} - A_{i,T}
\]

Report mean forgetting:

\[
\bar{F} = \frac{1}{T}\sum_i F_i
\]

### Backward Transfer

\[
\text{BWT} = \frac{1}{T-1}\sum_{i=1}^{T-1}(A_{i,T} - A_{i,i})
\]

Positive values indicate improvement on old tasks after future learning.

### Forward Transfer

Evaluate each task before training it:

\[
\text{FWT} = \frac{1}{T-1}\sum_{i=2}^{T}(A_i^{pre} - A_i^{chance})
\]

## Compute Metrics

Track:

- Wallclock time
- GPU utilization
- Host/device bytes transferred

Define the baseline as No Replay FinalAcc.

\[
\text{compute\_per\_retained\_acc} = \frac{\text{GPU Hours}}{\text{FinalAcc} - \text{BaselineFinalAcc}}
\]

Lower is better.

## Evaluation Protocol

After each task:

1. Evaluate on all previously seen tasks.
2. Populate the accuracy matrix \(A_{i,j}\).
3. Record online accuracy and average retained accuracy.

Requirements:

- Same data ordering across conditions
- Fixed training lengths
- No early stopping
- Consistent compute accounting across conditions

## Suggested Repository Layout

```text
bench/
  data/
  models/
    mlp_mnist.py
    resnet8_cifar.py
  replay/
    buffers.py
    sleep.py
  tasks/
    split_mnist.py
    cifar10_il.py
  train.py
  eval.py
  loggers.py
  utils/
    seed.py
    timer.py
    gpu.py

configs/
  mnist.yaml
  cifar_il.yaml

scripts/
  run_grid.sh
  analyze.py

results/
plots/
```

## Reference Training Loop

```python
for step, (x, y, tid) in stream:
    loss = CE(model(x), y)

    if condition in {"uniform", "per"}:
        buf.add(x, y, tid, loss.detach())
        bx, by, _ = buf.sample(
            replay_batch,
            alpha=priority_alpha_if_PER,
        )
        loss = loss + CE(model(bx), by)

    loss.backward()
    opt.step()
    opt.zero_grad()

    if condition == "sleep" and step % sleep_freq == 0:
        for _ in range(offline_epochs):
            for bx, by, _ in buf.loader(batch_size=replay_batch, shuffle=True):
                sl = CE(model(bx), by)
                sl.backward()
                opt.step()
                opt.zero_grad()
```

## Example Config

`configs/cifar_il.yaml`:

```yaml
dataset: cifar10_il
model: resnet8

opt:
  name: adam
  lr: 1e-3
  weight_decay: 1e-5

steps: 50000
batch_size: 128
buffer_size: 200000
replay_batch: 256
sleep_freq: 1000
offline_epochs: 5
priority_alpha: 0.6
log_every: 50
eval_every_task: true
```

## Reproduction Commands

### Split-MNIST

```bash
python bench/train.py --config configs/mnist.yaml --condition noreplay --seed 0
python bench/train.py --config configs/mnist.yaml --condition uniform --seed 0
python bench/train.py --config configs/mnist.yaml --condition per --seed 0 --priority_alpha 0.6
python bench/train.py --config configs/mnist.yaml --condition sleep --seed 0 --sleep_freq 1000 --offline_epochs 5
```

### CIFAR-10-IL

```bash
python bench/train.py --config configs/cifar_il.yaml --condition sleep --seed 0 --offline_epochs 5
```

## Reporting

For each condition × dataset, produce:

- Curves: step vs. online accuracy, step vs. average retained accuracy
- Tables: FinalAcc, forgetting, BWT, FWT, GPU hours, compute efficiency
- Boxplots across seeds
- Hyperparameter sweeps for sleep epochs and PER alpha

## Deliverables

```text
results/summary.csv
plots/*
report.md
```

The report should include aggregate metrics, compute accounting, hyperparameter winners, statistical summaries, and retention-efficiency analysis.
