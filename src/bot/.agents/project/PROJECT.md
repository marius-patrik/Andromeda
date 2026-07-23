# Project

- Name: DarkFactory
- Repository: `marius-patrik/DarkFactory`
- Product role: Independent GitHub-native autonomous engineering product
- Runtime: Node.js 22, TypeScript, ESM
- Package manager: npm
- Test runner: Node test runner with `tsx`

DarkFactory receives GitHub App events, synchronizes repository-local policy
from the `managed-repository` child of canonical private-data, and drives
deterministic planning, repository diagnosis, orchestration, enforcement, and
follow-through. Shared Agent OS state lives only under `$ANDROMEDA_HOME`.
DarkFactory operational ledgers live under `darkfactory-data/runs` in that
same manifest-authorized repository. Managed sync enforces the exact canonical
repository and checkout root before reading the `managed-repository` child.
