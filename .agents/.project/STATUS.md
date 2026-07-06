# Status

## Current State

| Area | State |
| --- | --- |
| Repository | `marius-patrik/agent-darkfactory` |
| Branch | `df/68-m3-orchestrator-loop-streams` |
| Issue | `#68` - M3 orchestrator loop & streams |
| Purpose | GitHub-native DarkFactory control plane for planning, worker dispatch, review/follow-through, and managed repository automation |
| Version | `0.2.0` |
| Managed setup | Workspace-backed `.agents/.global`, optional repo-specific `.agents/.project`, GitHub bootstrap, Codex Review, planning, audit, orchestration, worker, follow-through, and fix-forward workflows |
| Release | `v0.2.0` shipped (M2 planning loop); M3 orchestration work in progress on issue #68 |
| CI | GitHub Actions `validate` job |

## Validation

Run before committing:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`

## Next Actions

- Configure `DARK_FACTORY_APP_ID` and `DARK_FACTORY_PRIVATE_KEY` secrets before using managed sync or release workflows.
- Configure `CODEX_AUTH_JSON` in every managed repository where Codex Review should approve pull requests.
- Enable GitHub repository auto-merge on dogfood target repositories before expecting protected-branch `df:ready` issues to go label-to-merged.
- Install the GitHub App on all repositories through GitHub's installation UI.
- Keep privileged DarkFactory control workflows running from the default `dev` branch.
