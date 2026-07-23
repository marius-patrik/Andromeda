# Andromeda Maintainer Notes

This repository is the Andromeda implementation root. Keep root workflows and
managed enforcement files at the root. Bump submodule gitlinks only when the
task explicitly reconciles that package version, and validate each changed
submodule independently.

Use `andromeda` as the sole operator and runtime CLI. Resolve canonical state
through `$ANDROMEDA_HOME`. `.agents/managed-repository.json` is the sole
external data-repository authority: `dataRepo` names
`marius-patrik/private-data`, and `ledgerPath` names the nested
`darkfactory-data/runs` directory in that same repository.

Managed code work branches from `main` and returns through a reviewed pull
request into `main`; there is no `dev` integration branch.
