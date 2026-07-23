# Handoff

Resume planning from `context/TASK.md` in the repository declared by
`.agents/managed-repository.json.dataRepo`
(`marius-patrik/private-data`), reached through `$ANDROMEDA_HOME`. It is the
owner-facing authorization and sequencing board. Do not reconstruct completed
rows from provider task stores or transcripts; those are evidence, not
authority.

Andromeda v0.10.0 is released on `main`. `main` is the only long-lived branch;
work branches from it and returns through a reviewed pull request into `main`.
The full CI gate passes including the DarkFactory managed setup check.

```powershell
$env:ANDROMEDA_HOME = "$HOME\.agents"
$env:ANDROMEDA_USER_HOME = "$HOME"
$env:ANDROMEDA_ROOT = "$HOME\marius-patrik\Andromeda"
Set-Location $env:ANDROMEDA_ROOT
andromeda state doctor --json
```

## What the next session should know

The target components — `sdk`, `mcp`, `server`, `clients/*`, `plugins` — exist
as contracts without implementation. The work ahead is reimplementing capability
out of `src/bot` against the sdk, not extending the frozen tree in place.
Nothing outside a carried tree may depend on one.

Carried trees (`src/bot/` and `templates/<project>/`) hold former standalone
repositories with their full history. Former `agents/<project>/` paths are
historical migration evidence, not live repository topology. Repository-wide
contracts that govern what is built and shipped do not apply inside carried
trees; every live surface is still fully scanned. If a rule needs relaxing for
a carried tree, scope the exemption to that tree rather than weakening the
rule.

State lives in the manifest-declared `marius-patrik/private-data` repository,
not as a submodule. `andromeda state backup|restore|sync` operates on
authenticated encrypted event bundles there. DarkFactory runtime ledgers live
below the manifest-declared `ledgerPath` (`darkfactory-data/runs`) in the same
repository, not in a second ledger repository. Never commit plaintext
credentials, provider homes, keys, locks, caches, or projections.

Before deleting any repository that has been folded in, verify coverage first:
compare file counts and branch tips, and preserve anything that will not merge
as an `archive/<repo>/<branch>` tag. Several such tags already exist in this
repository for exactly that reason.
