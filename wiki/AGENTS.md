# AGENTS

This document explains how autonomous agents and coding assistants should use the `wiki/` folder.

The wiki is the operational memory layer for the repository.
It is intended to store concise, executable, research-oriented knowledge that helps agents:

- bootstrap environments,
- reproduce experiments,
- understand project structure,
- locate canonical workflows,
- avoid repeating failed approaches,
- preserve implementation conventions.

## Core principles

Agents should treat wiki pages as:

- executable references,
- implementation guides,
- reproducibility contracts,
- architectural memory.

Agents should NOT treat the wiki as:

- marketing documentation,
- long-form prose,
- speculative brainstorming without runnable artifacts,
- duplicated README material.

## Expected workflow

Before making substantial repository changes, agents should:

1. Read `wiki/README.md`.
2. Scan relevant wiki pages.
3. Reuse documented workflows instead of inventing parallel ones.
4. Preserve documented reproducibility constraints.
5. Update wiki pages when repository behavior changes.

## When to update the wiki

Agents should update or create wiki pages when they:

- add new CI workflows,
- change environment requirements,
- introduce new experiment pipelines,
- add benchmark suites,
- add research infrastructure,
- discover important implementation caveats,
- stabilize previously experimental workflows.

If code changes invalidate a wiki page, the page should be updated in the same commit whenever possible.

## Writing style

Wiki pages should be:

- short,
- technical,
- runnable,
- explicit about limitations,
- focused on operational knowledge.

Prefer:

- checklists,
- minimal examples,
- exact commands,
- pinned versions,
- deterministic workflows.

Avoid:

- vague summaries,
- unnecessary introductions,
- duplicated content from papers,
- unverifiable claims.

## Reproducibility policy

Reproducibility guidance is mandatory for:

- physics simulations,
- ML training pipelines,
- benchmark generation,
- dataset preprocessing,
- numerical experiments.

Relevant pages should specify:

- dependency versions,
- runtime assumptions,
- seed handling,
- determinism constraints,
- expected outputs,
- smoke tests.

The canonical CI reference is:

- `wiki/reproducible-ci.md`

## Preferred structure for new pages

```md
# Title

## Goal

Short statement of purpose.

## Requirements

Pinned dependencies and environment assumptions.

## Quickstart

Minimal runnable commands.

## Validation

How to verify correctness.

## Caveats

Known limitations and failure modes.

## References

Primary papers, repositories, or specs.
```

## Relationship to README

- `README.md` explains the repository to humans.
- `wiki/` preserves operational and research knowledge.
- `wiki/AGENTS.md` defines expected agent behavior.

Agents should prioritize correctness, reproducibility, and maintainability over verbosity.
