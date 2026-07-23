# Project

Agent OS is one personal-agent product. This `Andromeda` repository owns the
implementation; `andromeda` is the only operator/runtime CLI. The personal
installation's only state root is `$ANDROMEDA_HOME`, the checkout of the
repository named by `.agents/managed-repository.json.dataRepo`
(`marius-patrik/private-data`).

The repository is a single monorepo with **no submodules**. Everything that was
once a separate repository is folded in with its full history:

- **Target components** — `sdk`, `mcp`, `server`, `clients/{cli,app,web}`, and
  `plugins` — carry their contracts and are where new implementation belongs.
- **Carried trees** — `src/bot/` and `templates/<project>/` — hold former
  standalone repositories. They keep their own identity and versioning,
  nothing outside them may depend on them, and code leaves `src/bot` by
  reimplementation against the sdk rather than by re-import or deletion.
  Former `agents/<project>/` paths are historical migration evidence, not live
  repository topology.

Durable state is not part of this repository. It lives in the manifest-declared
`marius-patrik/private-data` repository and is reached through
`$ANDROMEDA_HOME`. DarkFactory runtime ledgers live below the manifest-declared
`ledgerPath` (`darkfactory-data/runs`) in that same repository; there is no
separate ledger repository.

All repository authority is rooted here: `.agents/project/` owns project
guidance, `.agents/managed-repository.json` owns the external data-repository
and ledger-path declarations, the remaining `.agents/` policy files own managed
enforcement, and `docs/` owns component, protocol, architecture, and
specification documentation. Target components carry exactly one contract
README at their own root and no nested documentation trees. Carried trees
retain their original project docs as historical evidence, which does not make
them Andromeda authority.

Target component ownership:

- `sdk` — the core package everything is implemented through: types, receipts,
  client bindings, the plugin contract. A pure library.
- `mcp` — the protocol and orchestration layer every call passes through.
  Passive: no daemon of its own. Carries MCP in both directions and integrates
  standard agent harnesses.
- `server` — per-machine deployment of the cluster system.
- `clients/cli`, `clients/app`, `clients/web` — clients only, no business logic.
- `plugins` — capabilities loaded through the sdk plugin contract.

Carried component ownership, frozen under `src/bot` and mined by
reimplementation:

- `src/cli` — `andromeda` CLI, state, installs, credentials/secrets,
  providers, sessions, memory, package/capability registries, lifecycle
  management, and — until the #218 harness migration is implemented and
  accepted — the orchestrator runtime.
- `src/sdk` — generated Go, TypeScript, and Python contracts and the
  suite that verifies them. The protobuf sources are `src/mcp/proto`.
- `src/sdk/harness` — canonical session event handling and tool execution.
  Owner-ruled target (2026-07-13, #218): the operation engine owning
  orchestration, with the orchestrator runtime migrating from the manager.
- `src/server/gateway` — local model registry, routing, health, quota, and
  transient control-plane relay.
- `src/server/inference` — gateway-backed Python agent loop, status, persistence,
  redaction, and package validation.

Historical product names, provider-home paths, launchers, and variables are
recovery evidence only. Do not add aliases, bridges, forwarding shims, or
fallback loaders.

`ANDROMEDA_SYSTEM_DATA_ROOT` and `$ANDROMEDA_HOME` must resolve to the same physical
private-data checkout. Plaintext runtime state remains local and ignored;
authenticated encrypted bundles under `backups/events/` are the only Git-backed
state backup and synchronization surface.

Branch policy: `main` is the only long-lived branch and the canonical released
product state. Active implementation branches from `main` and returns through a
reviewed pull request into `main`; there is no `dev` integration branch or
separate release-convergence pull request.
