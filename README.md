# darkfactory-agent

TypeScript GitHub App bot that receives GitHub webhooks, verifies signatures, and responds to basic repository activity.

## What it does

- Exposes `POST /webhook` for GitHub App webhooks.
- Exposes `GET /healthz` for deploy and uptime checks.
- Logs GitHub App `ping` events.
- Comments on newly opened issues.
- Comments on newly opened pull requests.
- Checks pull requests in installed repositories for shared repository setup:
  - `.agents/.global/VERSION` must match the current Dark Factory version.
  - `.github/workflows/dark-factory-bootstrap.yml` should exist as the baseline GitHub Actions scaffold.
- Installs the managed Codex Review workflow, Dockerfile, runner script, and output schema used to run `codex exec` in a container for pull request review.
- Reads managed `.agents` and `.github` files from the `darkfactory-workspace` repository.
- Opens managed setup PRs when the app is installed on a repository or when repositories are added to an installation.
- Can sync all installed repositories from the `Sync Managed Repositories` workflow.

## Requirements

- Node.js 22 or newer.
- Agentos shared state for managed secrets and workspace paths.
- A GitHub App installed on the target repositories.
- A public HTTPS URL for local webhook testing, such as an ngrok or Cloudflare Tunnel URL.

## GitHub App setup

Create a GitHub App and configure:

- Webhook URL: `https://<your-public-host>/webhook`
- Webhook secret: any high-entropy random value, also used as `GITHUB_WEBHOOK_SECRET`
- Subscribe to events:
  - `Issues`
  - `Pull requests`
  - `Ping`
- Repository permissions:
  - Contents: Read and write
  - Issues: Read and write
  - Pull requests: Read and write
  - Metadata: Read-only, granted by GitHub automatically

`Contents: Read and write` is required so Dark Factory can create managed setup branches. `Pull requests: Read and write` is required so it can open setup PRs.

Generate a private key for the app and install the app on the repositories where it should run.

To install the app on every repository, use the GitHub App installation UI and choose all repositories. The user token used by `gh` cannot grant GitHub App repository access by itself.

## Agentos setup

```powershell
npm ci
npm run build
agents packages register packages/darkfactory-agent
```

Store local secrets through Agentos. Secret values are not printed by the manager:

```powershell
agents secrets set GITHUB_APP_ID
agents secrets set GITHUB_PRIVATE_KEY
agents secrets set GITHUB_WEBHOOK_SECRET
agents secrets set CODEX_AUTH_JSON --from-file "$env:USERPROFILE\.codex\auth.json"
```

Run DarkFactory through Agentos so it receives `AGENTS_SECRETS` and the other shared state paths:

```powershell
agents packages run darkfactory-agent -- serve
```

The bot listens on `http://localhost:3000/webhook`. Point the GitHub App webhook URL at your tunnel URL, for example `https://example.ngrok.app/webhook`.

## Scripts

```powershell
npm run typecheck
npm test
npm run build
darkfactory serve
darkfactory install-url
darkfactory sync-managed
```

## Deployment

Build and run with Docker:

```powershell
git clone https://github.com/marius-patrik/darkfactory-workspace.git darkfactory-workspace
docker build -t darkfactory-agent .
docker run --rm -p 3000:3000 --env-file .env darkfactory-agent
```

Production hosts must provide these environment variables:

- `GITHUB_APP_ID`
- `GITHUB_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`
- `DARK_FACTORY_WORKSPACE_ROOT`, optional when the image bundles `darkfactory-workspace/managed-repository`
- `PORT`, optional and defaults to `3000`

Use `GET /healthz` as the health check endpoint.

## Managed repository setup

Dark Factory manages shared setup through pull requests. It does not write directly to default branches.

Managed files:

- `.agents/.global/**`
- `.agents/.project/**`, only when `darkfactory-workspace/managed-repository/repositories/<owner>/<repo>/.agents/.project/**` exists
- `.github/workflows/dark-factory-bootstrap.yml`
- `.github/workflows/codex-review.yml`
- `.github/codex-review.Dockerfile`
- `.github/codex-review.schema.json`
- `.github/scripts/run-codex-review.sh`

The workspace repository is the single source of truth for managed setup. Keep reusable policy in `managed-repository/.agents/.global/` and per-repository context in `managed-repository/repositories/<owner>/<repo>/.agents/.project/`.

Managed sync runs automatically when:

- the GitHub App is installed on repositories
- repositories are added to an existing GitHub App installation

Managed sync can also be run manually from the `Sync Managed Repositories` workflow.

GitHub Actions still consumes repository secrets, but those secrets should be written by Agentos Manager:

```powershell
agents secrets github sync GITHUB_APP_ID --repo marius-patrik/darkfactory-agent --as DARK_FACTORY_APP_ID
agents secrets github sync GITHUB_PRIVATE_KEY --repo marius-patrik/darkfactory-agent --as DARK_FACTORY_PRIVATE_KEY
agents secrets github sync CODEX_AUTH_JSON --owner marius-patrik
```

The workflow requires these repository secrets in `marius-patrik/darkfactory-agent`:

- `DARK_FACTORY_APP_ID`
- `DARK_FACTORY_PRIVATE_KEY`

Every managed repository that should enforce Codex Review also needs this repository secret:

- `CODEX_AUTH_JSON`, containing a Codex OAuth `auth.json`

The local equivalent is:

```powershell
agents packages run darkfactory-agent -- sync-managed
```

To print the GitHub App installation URL from local credentials:

```powershell
npm run install:url
```

## Release

Releases are tag-driven. To publish a release:

```powershell
npm version patch
git push origin main --follow-tags
```

Pushing a `v*.*.*` tag runs the release workflow. It validates the repo, builds the Docker image, publishes it to GitHub Container Registry, and creates a GitHub release.

Image tags are published under:

```text
ghcr.io/marius-patrik/darkfactory-agent
```

## Development notes

- Keep webhook handlers registered in `src/bot.ts`.
- Keep managed file templates in `darkfactory-workspace/managed-repository/`.
- Keep managed sync logic in `src/managed-sync.ts`.
- Keep installed-repository setup enforcement in `src/repository-setup.ts`.
- Keep HTTP routing and signature handoff behavior in `src/server.ts`.
- Keep environment parsing in `src/config.ts`.
- Add tests under `tests/` for any new route, config branch, or webhook behavior.
