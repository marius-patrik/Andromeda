# Decisions

## 2026-07-11 — One Agent OS authority

- Shared identity, memory, roles, skills, sessions, providers, and model choices
  are authoritative only under `$AGENTS_HOME`.
- DarkFactory synchronizes repository-local guidance and policy; it does not
  publish or version a copied global agent floor.
- The sole `agent-os-data` registration resolves directly to the canonical
  `marius-patrik/Andromeda-data` checkout at `$AGENTS_HOME`; unrelated data
  registrations may coexist but cannot claim that repository or path.
- Local worker execution uses the canonical `agents` launcher and its configured
  defaults. DarkFactory carries no provider registry, failover list, or model pin.
- The Codex pull-request reviewer remains an isolated CI-only execution path and
  relies on the Codex CLI default model.
- Managed setup is reviewable through pull requests and never bypasses protected
  default branches.
