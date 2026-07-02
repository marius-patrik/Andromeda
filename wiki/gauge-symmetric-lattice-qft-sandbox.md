# Gauge-symmetric lattice QFT sandbox

This note captures a small, reproducible starting point for a gauge-symmetric lattice quantum field theory sandbox. The goal is to start with a tiny, correct pure-gauge model and leave clean seams for autodiff backends, parameter sweeps, GPU builds, and later quantum or neuromorphic emulation experiments.

## Scope

Start with a Wilson pure-gauge action on a tiny lattice, exact gauge-link updates, and a couple of smoke-test observables. Keep the first version CPU-friendly and deterministic.

Recommended first target:

- gauge group: `SU(2)`, because the group operations and update rules are simpler than `SU(3)`;
- lattice: `8x8`, optionally `8x8x8` once the 2D run works;
- action: Wilson plaquette action;
- update: heatbath, with overrelaxation or HMC added later;
- observables: average plaquette and optional Polyakov loop;
- backend: JAX first, with a PyTorch adapter kept behind a small backend interface.

## Repository layout

```text
lqft/
  configs/
    base.yaml
    sweep.yaml
  src/
    __init__.py
    lattice.py          # lattice shapes and boundary conditions
    su2.py              # group ops: exp, projection, random links
    action.py           # Wilson and future improved actions
    mcmc.py             # heatbath, overrelaxation, HMC later
    observables.py      # plaquette, Polyakov loop
    autodiff_backend.py # JAX or PyTorch plumbing
    cli.py              # run/eval entrypoints
    sweep.py            # parameter sweep runner
  tests/
    test_group.py
    test_action.py
  Dockerfile
  Makefile
  pyproject.toml
  requirements.txt
  README.md
```

## Base configuration

`configs/base.yaml`:

```yaml
backend: jax
 group: su2
lattice_shape: [8, 8]
beta: 2.3
updates:
  kind: heatbath
  sweeps: 50
seed: 123
checkpoint:
  dir: ./ckpts
  every_sweeps: 10
log:
  every_sweeps: 5
```

Note: remove the extra leading space before `group` if copied from this page into a YAML parser.

## CLI sketch

`src/cli.py`:

```python
from pathlib import Path

import tyro

from autodiff_backend import Backend
from lattice import make_links
from mcmc import run_heatbath
from observables import avg_plaquette
from utils import load_config, save_ckpt


def main(cfg_path: str) -> None:
    cfg = load_config(cfg_path)
    xp = Backend(cfg["backend"])
    links = make_links(
        xp,
        cfg["lattice_shape"],
        group=cfg["group"],
        seed=cfg["seed"],
    )

    for sweep in range(cfg["updates"]["sweeps"]):
        links = run_heatbath(xp, links, beta=cfg["beta"])

        if sweep % cfg["log"]["every_sweeps"] == 0:
            print(f"sweep={sweep} plaq={avg_plaquette(xp, links):.6f}")

        if sweep > 0 and sweep % cfg["checkpoint"]["every_sweeps"] == 0:
            save_ckpt(Path(cfg["checkpoint"]["dir"]), links, step=sweep)


if __name__ == "__main__":
    tyro.cli(main)
```

## Container

`Dockerfile`:

```dockerfile
FROM python:3.11-slim

ENV PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    git build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt pyproject.toml ./
RUN pip install -U pip && pip install -r requirements.txt

COPY . .
CMD ["python", "-m", "src.cli", "configs/base.yaml"]
```

`requirements.txt`:

```text
numpy
typy
pyyaml
jax
# torch
```

Use `tyro`, not `typy`, when turning this into a runnable file. Keep either JAX or PyTorch enabled for the first pass, not both.

`Makefile`:

```make
RUN?=python -m src.cli configs/base.yaml
IMG?=lqft:cpu

build:
	docker build -t $(IMG) .

run:
	docker run --rm -it -v $$(pwd):/app $(IMG) $(RUN)

test:
	docker run --rm -it -v $$(pwd):/app $(IMG) pytest -q
```

Smoke test:

```bash
make build
make run
```

Expected behavior: the run prints plaquette values every few sweeps and writes checkpoints under `ckpts/`.

## Parameter sweeps

`configs/sweep.yaml`:

```yaml
extends: base.yaml
grid:
  beta: [1.8, 2.0, 2.2, 2.4]
  lattice_shape:
    - [8, 8]
    - [8, 8, 8]
updates.sweeps: 100
checkpoint.dir: ./ckpts/${group}/${backend}/b${beta}/L${lattice_shape}
```

`src/sweep.py`:

```python
import copy
import itertools
import os
import subprocess

import yaml


def product_grid(grid: dict):
    keys = list(grid.keys())
    values = [grid[key] for key in keys]
    for combo in itertools.product(*values):
        yield dict(zip(keys, combo))


def set_in(target: dict, dotted_key: str, value) -> None:
    node = target
    keys = dotted_key.split(".")
    for key in keys[:-1]:
        node = node.setdefault(key, {})
    node[keys[-1]] = value


def merge(base: dict, patch: dict) -> dict:
    out = copy.deepcopy(base)
    for key, value in patch.items():
        if key == "grid":
            continue
        if isinstance(value, dict):
            out.setdefault(key, {}).update(value)
        else:
            set_in(out, key, value)
    return out


def main() -> None:
    with open("configs/base.yaml") as f:
        base = yaml.safe_load(f)
    with open("configs/sweep.yaml") as f:
        sweep = yaml.safe_load(f)

    os.makedirs("configs/.runs", exist_ok=True)

    for point in product_grid(sweep["grid"]):
        cfg = merge(base, {k: v for k, v in sweep.items() if k != "grid"})
        for key, value in point.items():
            cfg[key] = value

        shape = "x".join(map(str, cfg["lattice_shape"]))
        path = f"configs/.runs/run_b{cfg['beta']}_L{shape}.yaml"
        with open(path, "w") as f:
            yaml.safe_dump(cfg, f)

        subprocess.check_call(["python", "-m", "src.cli", path])


if __name__ == "__main__":
    main()
```

Run the sweep:

```bash
docker run --rm -it -v $(pwd):/app lqft:cpu python -m src.sweep
```

## Checkpoint contract

Every run should write:

- link state, for example `step_0010.npz`;
- resolved config, for example `config.resolved.yaml`;
- scalar metrics, for example `metrics.jsonl`.

This makes runs resumable and keeps the format stable for future backends.

## First tests

Add tests before scaling the model:

```text
tests/test_group.py
  - SU(2) matrices are unitary within tolerance
  - determinant is near 1
  - random-link generation is deterministic for a fixed seed

tests/test_action.py
  - plaquette action is finite on hot-start links
  - cold-start links produce the expected near-trivial plaquette
  - gauge transformation leaves the Wilson action invariant
```

## Growth path

Once the minimal sandbox works:

1. add `SU(3)` group operations;
2. add HMC with gauge-covariant momenta;
3. add improved actions such as Symanzik;
4. add smearing and multi-level algorithms;
5. add CUDA-enabled JAX or PyTorch images;
6. add experiment tracking through W&B or MLflow;
7. keep the same config/checkpoint interface while swapping kernels for quantum or neuromorphic emulators.

## Current caveats

This page is a scaffold, not a finished implementation. The code blocks show the intended module boundaries and run contract. Before using them as-is, fix the deliberate notes in the dependency and YAML examples, then add the missing implementation modules under `src/`.
