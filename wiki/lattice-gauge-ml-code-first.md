# Code-first lattice gauge ML papers

A compact set of runnable and implementation-oriented papers/projects around lattice gauge field theory, diffusion models, and gauge-equivariant neural networks.

---

## 1. Physics-Conditioned Diffusion Models for Lattice Gauge Field Theory

**Paper**

- Zhu et al., *Physics-Conditioned Diffusion Models for Lattice Gauge Field Theory* (JHEP 2026)
- arXiv: https://arxiv.org/abs/2502.05504

**Repository**

- DM4U1: https://github.com/nftqcd/DM4U1

### Why it matters

This project treats diffusion sampling as a physically constrained generative process for lattice gauge configurations. The model is trained on small-coupling ensembles and then generalized to larger couplings and lattice sizes.

The important implementation idea is that stochastic quantization and gauge constraints are integrated into the denoising process rather than bolted on afterward.

### What is runnable

The repository includes:

- PyTorch training scripts,
- U(1) lattice sampling notebooks,
- Langevin and MAALA correction experiments,
- observable estimation notebooks,
- topology and beta-extrapolation demos.

Most experiments are reproducible on a single GPU.

### Strengths

- physically informed diffusion process,
- stable toy-lattice generation,
- clear bridge between score models and stochastic quantization,
- comparatively readable codebase.

### Limitations

- mostly demonstrated on 2D U(1),
- still relies on Metropolis correction for exactness,
- scaling to realistic QCD remains open.

### Suggested experiments

- replace the score network with a gauge-equivariant backbone,
- benchmark autocorrelation against HMC,
- test transfer across lattice sizes,
- combine with normalizing-flow warm starts.

---

## 2. Gauge-Equivariant Neural-Network Preconditioners for Lattice QCD

**Paper**

- Pfahler, Knüttel, Lehner, Wettig
- *A Novel Gauge-Equivariant Neural-Network Architecture for Preconditioners in Lattice QCD*
- arXiv: https://arxiv.org/abs/2602.23840

**Repository**

- https://github.com/simonpfahler/LATTICE2025

### Why it matters

This work attacks one of the largest practical bottlenecks in lattice QCD: solving Dirac systems efficiently.

Instead of replacing Monte Carlo sampling directly, the neural network acts as a learned preconditioner while preserving gauge equivariance.

### What is runnable

The repository includes:

- training scripts for equivariant preconditioners,
- lattice configuration loaders,
- solver benchmarks,
- transfer experiments between lattice sizes,
- inference and spectrum-analysis utilities.

### Strengths

- directly targets compute bottlenecks,
- gauge symmetry preserved by construction,
- transfer learning across lattices is promising,
- useful for integration into existing HPC workflows.

### Limitations

- still early-stage research,
- benchmark scope is relatively narrow,
- integration into production HMC pipelines needs engineering work.

### Suggested experiments

- compare against classical multigrid,
- profile inference overhead on GPU clusters,
- combine with adaptive precision solvers,
- explore transformer-based equivariant architectures.

---

## 3. Diffusion Models as Stochastic Quantization (DMasSQ)

**Paper**

- *Diffusion Models as Stochastic Quantization in Lattice Field Theory*
- arXiv: https://arxiv.org/abs/2312.06780

**Repository**

- https://github.com/orginos/DMasSQ

### Why it matters

This is one of the clearest runnable bridges between diffusion-model mathematics and stochastic quantization for lattice field theory.

While older than the two projects above, it is still one of the best educational starting points for experimenting with diffusion-based field generation.

### What is runnable

The repository includes:

- compact PyTorch notebooks,
- phi^4 toy systems,
- diffusion-SDE experiments,
- Langevin dynamics demonstrations,
- small lattice visualizations.

### Strengths

- minimal and readable implementation,
- excellent educational value,
- low hardware requirements,
- easy experimentation platform.

### Limitations

- mostly toy-scale systems,
- not designed for production-scale QCD,
- limited benchmarking against established samplers.

### Suggested experiments

- add gauge-equivariant layers,
- benchmark score quality versus lattice size,
- test consistency under different discretizations,
- compare DDPM-style and SDE-style formulations.

---

# Quick comparison

| Project | Main Idea | Best Use Case | Compute Cost |
|---|---|---|---|
| DM4U1 | Physics-constrained diffusion sampling | Generative lattice experiments | Medium |
| LATTICE2025 | Gauge-equivariant preconditioning | Faster lattice solves | Medium/High |
| DMasSQ | Diffusion as stochastic quantization | Educational experimentation | Low |

---

# Recommended setup

For fast experimentation:

```bash
conda create -n lattice-ml python=3.11
conda activate lattice-ml
pip install torch jupyter matplotlib numpy scipy
```

Clone one repository at a time and start with notebook-based demos before attempting full training runs.

---

# Suggested next directions

Interesting adjacent topics:

- gauge-equivariant transformers,
- diffusion-assisted HMC,
- learned action surrogates,
- tensor-network + diffusion hybrids,
- normalizing flows for topological sectors,
- graph neural operators for lattice observables.
