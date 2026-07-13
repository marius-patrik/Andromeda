# DarkFactory prompt/skill library

This directory is the versioned, provider-agnostic prompt/skill library defined
by parent issue #37 (epic #35) and scaffolded by issue #49. It owns **what** a
role should do and **what** it should emit — never **how** to run a model.
Concrete provider, model, auth, and session execution is resolved exclusively by
the canonical Agent OS runtime through the `agents` launcher (issue #24).

## Layout

- `manifest.json` — the checksummed index of every artifact and fixture.
- `roles/` — role prompts (planner, implementer, issue drafter/reviewer, PR
  reviewer/fixer, releaser, verifier, auditor, L0 orchestrator).
- `skills/` — reusable capability snippets composed into a role.
- `tiers/` — logical model tiers (`reasoning`, `standard`, `fast`) describing
  behavior and output only.
- `overlays/` — cross-cutting context (GitHub control plane, Agent OS boundary,
  token economy).
- `fixtures/compose/` — typed composition inputs, one per composable role.
- `fixtures/snapshots/` — deterministic composed output for each fixture.
- `schema/manifest.schema.json` — the manifest contract.

## Composition contract

A prompt is composed deterministically (no model in the loop) from typed inputs:

1. role → selected skills → model tier → selected overlays, then
2. trusted input sections: immutable policy, run, repository, validation,
   work item, verified state, and required output.

Typed inputs are `run`, `repository`, `workItem` (issue/PR), `policy`
(immutable), `validation`, `effort` (independent effort), `selection`
(role + skills + tier + overlays), `verified` (verified state), and `output`
(output schema). The logical model tier and effort describe behavior only.

Issue, pull request, and comment `title`/`body`/`comments` are **untrusted
data**. They are rendered only inside `<<<UNTRUSTED-INPUT …>>>` delimiters and
can never override the trusted policy, the instructions, or any authorization.
Untrusted content that contains a reserved delimiter is rejected outright.

## Schema, versioning, and checksums

- Every artifact declares a semver `version` and a `sha256:` `checksum` of its
  normalized content in `manifest.json`.
- Every manifest reference must exist on disk and hash to its declared checksum.
- Every artifact declares the `variables` it uses (a subset of the trusted
  template variables) and the `requiredVariables` that must be present to
  compose it, plus fixture coverage in `fixtures[].covers`.

## Editing rules

- Edit an artifact or fixture, then run `npm run prompts:sync` to recompute
  checksums and regenerate snapshots, and commit the result.
- `npm run check` (via `tests/prompts.test.ts`) fails on: a missing reference, a
  checksum/version mismatch, an unknown or raw untrusted variable, a missing
  required input, an untrusted-data delimiter escape, missing fixture coverage,
  or any provider CLI mechanic, auth path, or concrete runtime command.
- Prompt content is filled in by follow-up issue #50; this scaffold provides the
  structure, contract, and validation harness.
