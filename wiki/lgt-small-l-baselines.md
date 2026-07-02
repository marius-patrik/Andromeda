# Small-L lattice gauge theory baselines

A compact implementation note for choosing runnable lattice gauge theory (LGT) baselines before scaling into tensor-network, TDVP, or agent-assisted experiment pipelines.

The goal is not to pick a final production solver. The goal is to keep a small set of reproducible smoke tests that answer two questions quickly:

1. Does the implementation reproduce exact diagonalization on tiny lattices?
2. Does it preserve the gauge constraints, especially Gauss's law, before any scaling experiment starts?

---

## Practical shortlist

### 1. Gauge-invariant tensor-network builders

**Use case:** construct gauge-invariant tensor-network states and compare them against exact diagonalization on tiny lattices.

**Why it is useful**

A tensor-network pipeline is easy to make numerically impressive while accidentally violating the gauge sector. A builder that enforces gauge invariance by construction gives a safer starting point for MPS/PEPS-style experiments.

**Smoke test**

Run the smallest included notebook or script at `L = 2`, then repeat at `L = 4` or `L = 6` if available. Check:

- ground-state energy against the repository's ED reference,
- Gauss-law residual on every site/link,
- Hilbert-space truncation parameters,
- deterministic seed handling,
- whether the notebook can run from a clean clone.

**Expected artifact**

A table with lattice size, truncation, variational bond dimension, ED energy, TN energy, absolute error, and max Gauss-law violation.

---

### 2. Rust or compiled-kernel U(1) simulation harness

**Use case:** keep a fast deterministic engine for 2D U(1) toy simulations and regression tests.

**Why it is useful**

Compiled kernels are useful when Python notebooks become the bottleneck. A Rust/C++ baseline can provide deterministic reference runs, unit tests, and fast CI checks for small lattices.

**Smoke test**

Run the smallest supported 2D U(1) configuration with fixed seed and save:

- plaquette expectation value,
- energy or mass-gap proxy if implemented,
- Gauss-law constraint residual,
- runtime and memory footprint,
- exact command used.

**Expected artifact**

A `results/smoke/<date>/` folder containing the command, config, output log, and a JSON summary.

---

### 3. Exact-diagonalization LGT toolkit

**Use case:** generate verified spectra for Abelian and non-Abelian link truncations on very small lattices.

**Why it is useful**

ED is usually the most trustworthy baseline for `L <= 4`, even when it is too expensive to scale. It should be the source of truth for the first regression tests in any TN or learned-solver pipeline.

**Smoke test**

For each model family, run the smallest Hamiltonian construction and record:

- basis size before and after gauge-sector projection,
- first few eigenvalues,
- Gauss-law residual,
- link truncation convention,
- boundary conditions,
- symmetry sector labels.

**Expected artifact**

A tiny checked-in reference file such as `fixtures/lgt/ed_u1_L2.json` or `fixtures/lgt/su2_L2.json`.

---

### 4. Minimal demos and published-number reproducers

**Use case:** keep small examples that reproduce one table, one spectrum, or one observable from a paper.

**Why it is useful**

These demos are not necessarily good long-term frameworks, but they are good sanity checks. A short script that reproduces a known result is often more valuable than a larger library with unclear defaults.

**Smoke test**

Prefer demos that have:

- a single entrypoint,
- pinned dependencies,
- a known numeric target,
- a short runtime,
- explicit boundary and truncation conventions.

---

## Candidate repositories from the current notes

These names came from the working shortlist and should be treated as candidates until each is cloned and verified locally. Do not build automation around them until the smoke-test checklist below passes.

| Candidate | Intended role | Verification status |
| --- | --- | --- |
| `tobiasosborne/lattice-gauge-theory-and-tensor-networks` | gauge-invariant TN builders and small-lattice notebooks | candidate; verify repo availability and runnable notebooks |
| `RAPIDENN/HK-core` | compiled Rust kernel for 2D U(1)-style tests | candidate; verify repo availability, tests, and simulation harness |
| `gcataldi96/ed-lgt` | exact diagonalization for truncated LGT systems | candidate; verify repo availability and ED reference examples |
| TurinLatticeFieldTheoryGroup SNF SU(3)-style demos | small published-number reproducer | candidate; identify exact repo and script |
| quantum-basis-like ED utilities | generic ED support library | candidate; identify exact package and LGT examples |

---

## Baseline acceptance checklist

A repo is accepted as a baseline only after these pass from a clean clone:

```bash
# Example structure; adapt per repo.
git clone <repo-url>
cd <repo>
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
pytest -q
python examples/smoke_lgt.py --L 2 --seed 0 --out smoke.json
```

Required checks:

- clean install instructions work,
- at least one `L = 2` or similarly tiny lattice run completes,
- ED or analytic reference is documented,
- gauge constraints are measured, not assumed,
- result is deterministic under a fixed seed,
- output can be serialized to JSON for CI comparison.

---

## Suggested local fixture schema

```json
{
  "model": "u1_ks_hamiltonian",
  "lattice": {"dimension": 1, "L": 4, "boundary": "open"},
  "truncation": {"electric_field_max": 1},
  "sector": {"total_charge": 0},
  "basis_size": 35,
  "observables": {
    "ground_state_energy": -2.123456789,
    "max_gauss_law_residual": 1e-12
  },
  "source": {
    "repo": "owner/name",
    "commit": "<sha>",
    "command": "python examples/smoke_lgt.py --L 4 --seed 0"
  }
}
```

---

## Agent workflow

1. Search candidate repos and identify the smallest runnable example.
2. Clone and pin a commit SHA.
3. Run the repo's own unit tests.
4. Run `L = 2` and, if cheap, `L = 4` or `L = 6`.
5. Extract ED energy and Gauss-law residual into JSON.
6. Add the JSON to fixtures only after the command is deterministic.
7. Use the fixture as the first regression target before any TN, TDVP, or learned-solver scaling run.

---

## Notes and caveats

- Treat ED as the reference for very small systems, not as a scalable solver.
- Avoid comparing energies across repos unless truncation, boundary conditions, and symmetry sector match exactly.
- Prefer gauge-invariant parameterizations over penalty-only constraints when testing TN or neural solvers.
- Keep every accepted baseline small enough to run in CI or on a laptop.
- Promote a baseline only after recording repo URL, commit SHA, command, dependencies, and numeric output.
