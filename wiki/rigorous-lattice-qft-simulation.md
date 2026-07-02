# Rigorous lattice QFT simulation

A compact research note on the current simulation frontier for lattice quantum field theory, with emphasis on exact gauge structure, controlled truncation, Hamiltonian dynamics, tensor networks, and quantum algorithms.

---

## Core principle

The rigorous simulation program is converging on one rule:

> Preserve gauge structure exactly, compress only physical degrees of freedom, and make every truncation mathematically controllable.

Many older shortcuts violated at least one of those constraints: unconstrained variational states, soft gauge penalties, naive qubit encodings, or truncations without convergence checks.

The current direction is cleaner: impose Gauss law exactly, remove redundant gauge sectors as early as possible, and treat truncation, continuum scaling, and finite-size effects as explicit extrapolation axes.

---

## Euclidean and Hamiltonian formulations

### Wilson Euclidean lattice gauge theory

The Wilson formulation places group-valued variables on links:

```text
U_l in G
```

with plaquette action

```text
S = beta sum_p (1 - (1/N) Re Tr U_p)
```

This exactly preserves gauge invariance at finite lattice spacing and remains the standard framework for equilibrium lattice QCD.

It is strongest for:

- equilibrium observables,
- hadron spectra,
- confinement,
- thermodynamics.

Its weaknesses are equally important:

- real-time dynamics,
- finite density,
- sign-problem regimes.

### Kogut-Susskind Hamiltonian formulation

The Hamiltonian formulation uses link operators and electric fields:

```text
H = (g^2 / 2) sum_l E_l^2 - (1/g^2) sum_p Re Tr(U_p) + H_matter
```

Physical states satisfy Gauss law:

```text
G_x^a |psi> = 0
```

This is the natural setting for tensor networks, real-time dynamics, and quantum simulation.

---

## Exact gauge invariance is now essential

A common older strategy added a penalty term:

```text
H -> H + lambda sum_x G_x^2
```

This suppresses gauge violations energetically but does not remove them from the Hilbert space.

The more rigorous strategy is to construct only physical states from the beginning:

- encode Gauss law exactly,
- use gauge-invariant tensor bases,
- eliminate redundant gauge degrees of freedom before simulation,
- keep all truncations compatible with group representation theory.

This is especially important for scalable non-Abelian simulations, where the unphysical Hilbert space grows extremely fast.

---

## The central truncation problem

Continuous compact gauge groups have infinite-dimensional link Hilbert spaces.

For SU(2), a link basis can be labeled as

```text
|j, m_L, m_R>
```

with

```text
j = 0, 1/2, 1, 3/2, ...
```

Any finite simulation must impose a cutoff:

```text
j <= j_max
```

The hard research problem is not just choosing `j_max`. It is proving or measuring how physical observables converge as

```text
j_max -> infinity
```

while simultaneously taking the bond-dimension, volume, and continuum limits.

A controlled simulation must track at least:

```text
j_max -> infinity
chi   -> infinity
a     -> 0
L     -> infinity
```

where `chi` is the tensor-network bond dimension, `a` is lattice spacing, and `L` is system size.

---

## Tensor networks as the strongest classical alternative

Tensor networks are the main non-Monte-Carlo classical route because they can work directly in the Hamiltonian picture.

Important families include:

- MPS in 1D,
- PEPS in 2D,
- MERA and tree tensor networks for renormalization-style ansätze,
- tensor renormalization group methods for partition functions.

Their advantages:

- no Monte Carlo sign problem in the usual sampling sense,
- direct real-time evolution,
- finite density is more accessible,
- local constraints can be imposed exactly.

The key design pattern is to build symmetry into the tensors themselves. Local tensors act as intertwiners between group representations, so the tensor network spans only the gauge-invariant subspace.

Consequences:

- Gauss law is exact,
- tensors become block sparse,
- unphysical states are removed,
- variational optimization is more stable.

---

## Concrete clean target: SU(2) Yang-Mills in 2+1D

A serious intermediate target is pure SU(2) Yang-Mills in 2+1 dimensions.

Use a representation basis:

```text
|j, m_L, m_R>,   j <= j_max
```

At vertices, enforce singlet fusion and construct a gauge-invariant local basis.

Simulation tools:

- gauge-invariant PEPS,
- TDVP real-time evolution,
- Krylov methods,
- DMRG ground-state searches,
- tensor renormalization/coarse-graining.

Observables:

- Wilson loops,
- glueball spectrum,
- string tension,
- static potential,
- flux-tube dynamics.

This target is computationally hard but conceptually clean: the theory is non-Abelian, lower-dimensional than QCD, and free of dynamical-fermion complications.

---

## Tensor-network bottlenecks

The dominant failure mode is entanglement growth.

In real-time dynamics, entropy often grows approximately linearly:

```text
S(t) ~ v t
```

The required bond dimension can then scale roughly as

```text
chi ~ exp(S)
```

which rapidly becomes impossible.

In two spatial dimensions, PEPS also face hard contraction costs. For non-Abelian gauge theories, the representation structure adds another layer of computational expense.

This is why tensor networks are powerful for low-dimensional and structured regimes, but not yet a general replacement for lattice QCD Monte Carlo.

---

## Tensor renormalization group

Tensor renormalization group methods rewrite the partition function as a tensor network and coarse-grain tensors directly rather than sampling configurations.

Advantages:

- no sampling sign problem,
- explicit blocking structure,
- direct connection to renormalization-group flow,
- potential for systematic truncation studies.

This direction is promising for SU(2), SU(3), and lower-dimensional gauge theories, but continuum control remains difficult.

---

## Quantum simulation direction

Quantum computers matter because they directly implement real-time unitary dynamics:

```text
exp(-i H t)
```

This is exactly where Euclidean Monte Carlo is weakest.

The rigorous quantum-simulation trend is toward:

- gauge-invariant bases,
- local multiplet formulations,
- plaquette or loop Hilbert spaces,
- eliminating gauge redundancy before qubit mapping,
- symmetry-preserving error models and encodings.

This is a major improvement over naive link-qubit mappings that represent huge unphysical sectors.

---

## SU(3) and plaquette encodings

For SU(3), the scalable direction is to reduce gauge redundancy before circuit synthesis.

Current design ideas include:

- precomputed plaquette-operator dictionaries,
- optimized multi-controlled unitaries,
- local multiplet bases,
- plaquette Hilbert spaces,
- large-`N_c` expansions,
- minimal electric-field truncations.

One aggressive minimal truncation keeps only

```text
1, 3, anti-3
```

on each link. This produces a much smaller local Hilbert space, sometimes interpretable through qutrit-like encodings.

The open question is convergence: how quickly do spectra, string tensions, static potentials, and thermal observables approach the full theory as the truncation is enlarged?

---

## Main unresolved problems

### Controlled continuum limit

A credible simulation must show simultaneous control over:

```text
a -> 0
j_max -> infinity
chi -> infinity
circuit depth -> infinity
L -> infinity
```

Few methods can do this beyond low dimensions.

### Dynamical fermions

The deepest barrier is adding realistic matter:

- chiral fermions,
- anomaly structure,
- finite density,
- sign structure,
- gauge-matter entanglement.

### Entanglement explosion

Real-time Yang-Mills dynamics may generate volume-law entanglement. Tensor networks may then fail asymptotically even when they are excellent at early times or in low-entanglement sectors.

### Fault-tolerant hardware

Current quantum hardware is far from full QCD simulation. The valuable progress today is mainly algorithmic: better encodings, better resource estimates, and better symmetry preservation.

---

## Most promising rigorous research directions

### Gauge-invariant PEPS and symmetric tensors

Likely essential for scalable non-Abelian tensor-network simulations.

### Rigorous truncation theory

Needed ingredients:

- convergence proofs,
- operator-norm or observable-error bounds,
- RG matching,
- benchmark observables across increasing cutoffs.

### Hamiltonian renormalization

Promising combination:

- MERA,
- tensor RG,
- gauge symmetry,
- continuum EFT matching.

### Plaquette and loop formulations

These remove gauge redundancy before simulation and may be critical for quantum scalability.

### Fault-tolerant SU(3) algorithms

Key techniques:

- qubitization,
- sparse Hamiltonian simulation,
- precomputed group-theory dictionaries,
- symmetry-preserving error correction.

---

## Research roadmap

### Stage 1: Schwinger model

Use 1+1D U(1) gauge theory to learn Gauss law, confinement, tensor-network workflows, and exact constraint handling.

### Stage 2: SU(2) pure gauge in 2+1D

Move to a non-Abelian theory with explicit representation truncation, gauge-invariant PEPS, and observable extrapolation.

### Stage 3: SU(3) pure Yang-Mills

Introduce local multiplet bases, plaquette formulations, scalable circuit constructions, and resource estimates.

### Stage 4: Dynamical fermions and continuum scaling

This is the true frontier: realistic matter, anomaly control, finite density, and continuum extrapolation.

---

## Bottom line

The field is moving away from heuristic toy simulations and toward a unified architecture:

- exact gauge symmetry,
- physical Hilbert-space compression,
- controlled truncation,
- Hamiltonian real-time dynamics,
- tensor-network structure,
- eventual fault-tolerant quantum computation.

The central question is no longer whether toy gauge theories can be simulated. It is whether the exact non-Abelian structure of continuum quantum gauge theory can be preserved while scaling computationally.

---

## Suggested follow-up experiments

- Implement SU(2) pure gauge theory in 2+1D with `j_max = 1/2, 1, 3/2` and track Wilson-loop convergence.
- Build a small gauge-invariant PEPS basis using explicit Clebsch-Gordan fusion rules.
- Compare link-basis, plaquette-basis, and loop-basis Hilbert-space sizes on small lattices.
- Prototype truncation-error diagnostics using static potential and string tension.
- Estimate logical qubits for minimal SU(3) truncations versus larger representation cutoffs.
