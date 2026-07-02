# Quantum-Simulated Lattice Gauge Theories

_Source migrated from `marius-patrik/marius-patrik:research/quantum-simulated-lattice-gauge-theories.md`._

## What this does

This note tracks the shift in quantum-simulated lattice gauge theory from isolated proof-of-concept work toward coordinated experimental infrastructure. The important signal is standardization: shared benchmark systems, reproducible workflows, hardware-aware abstractions, and cross-institution tooling.

## Why it is worth tracking

Quantum LGT work is becoming less about one-off demonstrations and more about infrastructure that can support reusable hybrid classical/quantum experiments. The strongest leverage is likely in orchestration and validation layers that connect gauge-theory formalism, hardware-aware compilation, experiment automation, and benchmark replay.

## Core trend

The field is moving toward:

- hardware-aware lattice gauge simulations,
- hybrid classical/quantum workflows,
- qudit-native architectures,
- reproducible benchmark suites,
- shared tooling and cross-lab infrastructure.

A practical near-term stack looks like:

1. classical tensor preprocessing,
2. constraint reduction,
3. quantum subroutine execution,
4. classical optimization and validation,
5. benchmark replay.

## Technical focus areas

High-leverage implementation areas:

- gauge-invariant compiler passes,
- automated hybrid experiment orchestration,
- tensor-network to quantum-runtime bridges,
- qudit-native simulation APIs,
- benchmark replay systems,
- error-mitigation pipelines for gauge simulations.

## Runnable today

Use this as a design checklist for a hybrid LGT experiment harness:

- define a small gauge-invariant benchmark problem,
- preserve Hamiltonian and truncation metadata,
- run a classical tensor-network baseline,
- expose a quantum subroutine boundary,
- log hardware/compiler settings,
- replay results against deterministic fixtures.

## Limitations and caveats

The source note identifies ecosystem and infrastructure signals, not a validated local implementation. Funding and vendor signals should be treated as strategic context, not proof that a given stack is mature. Exact non-Abelian scalability remains a frontier problem.

## Source pointers

- Horizon Europe quantum simulation initiatives.
- Trapped-ion qudit lattice gauge simulation research.
- Hybrid quantum-classical gauge simulation methods.
- Gauge protection and regularization techniques.
