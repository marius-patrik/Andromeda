# Agent OS manager

`agents-manager` implements the `agents` CLI: the single management and runtime
surface for Agent OS. It manages canonical state and memory, provider CLI
homes, sessions, orchestration, package checkouts, harness execution,
capabilities, data repositories, environments, secrets, and credits.

## Requirements and setup

- Bun 1.1 or newer
- Git
- GitHub CLI only for explicit GitHub-secret synchronization
- Optional provider CLIs installed below `AGENTS_HOME/clis/<provider>/bin`:
  `codex`, `claude`, `kimi`, and `agy`

From the repository root:

```sh
bun install
bun run ci
AGENTS_HOME="$HOME/.agents" AGENTS_USER_HOME="$HOME" AGENTS_ROOT="$PWD" \
  bun run agents -- state init
```

The package is currently source-installed. Old product checkouts and installers
are not supported update sources.

## State contract

`AGENTS_HOME` is the only runtime state root. For the personal installation it
is `/Users/user/.agents`; otherwise it is an absolute `~/.agents` path.
`AGENTS_USER_HOME` identifies the real OS user home. `AGENTS_ROOT` may identify
the active code/distribution checkout, but it is not state.

The canonical layout includes:

- `identity/` — agent identity, persona, and user model;
- `clis/<provider>/` — opaque provider-native runtime state;
- `sessions/` — canonical session events, provider handles, and projections;
- `memory/` — provenance-backed records, events, indexes, and generated views;
- `orchestrator/` — orchestrator events, lease, and projected state;
- `skills/`, `plugins/`, `hooks/`, and `templates/` — shared capabilities;
- `secrets/` — local secret registry and explicit materializations;
- `runtime/` — locks, process state, temporary data, caches, and logs;
- `sync/` — encrypted bundle exchange configuration and import journals;
- `provenance/` — source and migration evidence;
- `harnesses/<id>/runtime/` — harness-local runtime data;
- top-level canonical registries such as `installs.json`, `packages.json`,
  `data-repos.json`, `environments.json`, and `providers.json`.

No `~/.agents/state` tree, provider bridge, or standalone-only provider root is
supported. Physical Windows `.codex` and `.claude` desktop-runtime directories
may coexist only as non-authoritative `app-owned` surfaces when their canonical
CLI homes also exist. Legacy product-specific root variables are not state
locators. Provider-native environment variables are derived projections into
`AGENTS_HOME/clis/`.

The complete authority and migration contract is
[`docs/state-memory-v2.md`](state-memory-v2.md).

## Root and exchange safety

- `agents state doctor` is read-only.
- `agents state status` classifies provider roots as `forbidden`, `canonical`,
  `app-owned`, `split`, or `missing`. `app-owned` is limited to declared
  Windows desktop roots and never changes Agent OS authority.
- Retired move-and-link adoption and Git snapshot-sync commands do not exist.
- Cross-machine exchange is disabled by default. When explicitly enabled, it
  exchanges only encrypted immutable events, validates a deterministic merged
  history before publication, journals recovery, and rejects secrets,
  symlinks, path escapes, and collisions.

There is no compatibility mode or alternate loader to bypass.

## Command surface

```text
agents run [--mode orchestrator|default] [--provider <id>] [--model <model>] [--tui] <prompt>
agents tui [--provider <id>] [--model <model>] [--mode <mode>]
agents sessions list [--json]
agents sessions resume <id> <prompt>
agents list [--json]
agents info <name-or-path> [--json]
agents add <name> <git-url> [--kind app|data|package|template|workspace|harness|cli|plugin] [--branch main] [--path path]
agents remove <name-or-path>
agents sync [source]
agents sync enable [--generate-key]
agents sync disable
agents sync status [--json]
agents sync export <bundle-file> [--json]
agents sync import <bundle-file> [--json]
agents state init
agents state env
agents state doctor [--json]
agents state status [--json]
agents memory <remember|list|status|supersede|retract|render> [options]
agents identity activate <source-directory> [--replace]
agents cli list|doctor
agents cli pin [codex|claude|kimi|agy|all]
agents cli env <codex|claude|kimi|agy>
agents packages register <path>
agents packages list [--json]
agents packages run <name-or-path> -- <args...>
agents packages distro <define|install|upgrade|remove> ...
agents packages container <define|pull|pin|upgrade|remove> ...
agents env list [--json]
agents env create <id> [--kind host|container|agent-workspace]
agents env switch <id>
agents env sync <id>
agents data repo list [--json]
agents data repo set <id> <owner/name> [--path data/name] [--branch main] [--managed-path path] [--env NAME]
agents data repo path <id>
agents data repo env <id>
agents harness list [--json]
agents harness doctor <name>
agents harness run <name> -- <args...>
agents session run --provider <id> --model <model> [--mode chat|task] [--session <id>] [--stream] <prompt>
agents session list [--json]
agents session show <id> [--json]
agents install <skill|plugin|hook|template|cli|harness> <name> <source-path-or-git-url> [--replace]
agents installs [--json]
agents secrets list [--json]
agents secrets set <NAME> [--from-file path]
agents secrets path <NAME>
agents secrets github sync <NAME> [--as SECRET_NAME] [--repo owner/name | --owner owner] [--dry-run]
agents credits [--json]
agents credits credit <provider> <consumer> <amount> [--note text] [--json]
agents credits debit <provider> <consumer> <amount> [--note text] [--json]
agents credits usage <provider> <consumer> [--amount n] [--tokens-in n] [--tokens-out n] [--note text] [--json]
agents credits provider <provider> [--balance n] [--soft-limit n] [--window-seconds n] [--window-started-at iso] [--json]
agents doctor
agents os doctor [--json]
agents os image list [--json]
agents os image build --image <image> [--channel dev] [--file path] [--context path] [--dry-run]
agents os image pull --image <image> [--channel dev] [--dry-run]
agents os create --name <name> --image <image> [--env agents-os] [--channel dev] [--dry-run]
agents os start <name> [--dry-run]
agents os stop <name> [--dry-run]
agents os status <name> [--json]
agents os logs <name> [--follow]
agents os exec <name> -- <args...>
agents os terminal <name> [--shell bash]
agents os remove <name> [--prune-data] [--dry-run]
agents os deploy <profile> [--image agents-os] [--env agents-os] [--channel dev] [--dry-run]
agents runner install|enable|disable|status|repair [--json]
```

Memory mutations require `--source`, `--hash`, `--source-class`, and
`--confidence`. Secret commands never print secret values. A live
`agents secrets github sync` is an external mutation and requires an explicit
repository or owner target; use `--dry-run` to validate command construction.

`agents runner ...` manages the persistent lifecycle of the trusted DarkFactory
`df-local` GitHub Actions runner (`df-darkfactory-agent`): it provisions and
registers the runner with the `self-hosted, Windows, X64, df-local` labels,
persists it across reboot/logon through a least-privilege per-user scheduled
task bound to the canonical `bin\agents.ps1` launcher, starts only after a
healthy `agents state doctor`, never persists a registration token, reconciles
stale/duplicate registrations and processes, and reports redacted health via
`status --json`. The checksum-verified runner build is version-pinned with its
upstream self-updater disabled, so local version truth remains Agent OS-owned.
Runner mutations are Windows-only and fail closed on other platforms; `status`
is read-only everywhere.

### Runner status contract

The authoritative readiness result is the seven-field `readiness` block:
`installed`, `registered`, `enabled`, `persistent`, `process`, `online`, and
`launcherBinding`. Each field is tri-state: `true` means the condition was
proven healthy, `false` means it was proven absent, drifted, or unhealthy, and
`null` means the observation boundary was inaccessible, rejected, malformed,
or ambiguous. Human status prints `unknown` for `null`; JSON preserves `null`.
Consumers must not reinterpret unknown as false, zero, an empty list, offline,
missing, disabled, or healthy.

The top-level `installed`, `registered`, and `enabled` fields are compatibility
booleans only. Each is true exactly when its matching readiness field is
`true`, so these projections fail closed and cannot distinguish false from
unknown. New consumers, including DarkFactory #263, must use `readiness`
together with the detailed evidence and issues. Detailed process, task,
registration, and doctor fields are also `null` when their observation is
uncertain; counts and lists are zero or empty only after a positive
observation.

Runner `ok` requires Windows, all seven readiness fields to be true, the
complete state doctor to be healthy, and no remaining runner issue. A busy
runner is still online; capacity is a separate concern.

`readiness.persistent` is deliberately limited to one uniquely identified task
at the exact Task Scheduler root, exactly one `AtLogOn` trigger for the current
principal, Interactive logon, and Limited run level. Task enabled state is
reported separately by `readiness.enabled`. Canonical constants and state paths
are always the observation targets; a persisted runner record is comparison
evidence and never redirects status.

`readiness.launcherBinding` exclusively owns the canonical `bin\agents.ps1`
launcher and the scheduled-task action's correctness and cardinality. It does
not prove that the DarkFactory package build, `dist/cli.js`, global `df`
command, or TUI is runnable; DarkFactory #263 must test those surfaces
separately.

Status is read-only and performs no live repair. Install, enable, disable, and
repair remain the mutation commands, and each fails closed when required
evidence is uncertain.

All mutations serialize through one renewable runner-lifecycle lock. Local
ownership comes from the physical `.runner` file's exact positive runner ID;
the canonical `runner.json` ID is only a recovery fallback when `.runner` is
absent. Same-name rows never authorize deletion or takeover without that exact
ID, and every retained or removed row must also match the canonical Windows OS
and exact label set. Runner enumeration consumes every GitHub API page before
reconciliation. A stale local configuration is cleared with the upstream
runner's local-only `config.cmd remove --local` operation before a fresh
short-lived registration token is used; no removal or registration token is
persisted.

The scheduled-task definition also fixes duplicate and durability behavior:
`IgnoreNew`, battery-safe start/continuation, three one-minute restart attempts,
and no execution time limit. Drift in any of those settings is unhealthy and
repair recreates the exact task. Failed actions report `changed: true` with
`details.partialMutation: true` once an external mutation may have occurred.
Status never creates shared state, and reports provider version/heartbeat plus
the observed registration OS and labels when the GitHub API exposes them.

## Validation

```sh
bun run check
bun run test
bun run ci
```

These scripts typecheck the repository and run the manager tests. Provider
authentication still requires explicit integration proofs at its real
boundary; cross-machine exchange is covered by encrypted convergence,
interruption recovery, idempotence, collision, tamper, and secret-rejection
tests.
