# Prompt library ownership

This `prompts/` tree is owned by DarkFactory and implements the provider-agnostic
prompt/skill contract from parent issue #37. The authoritative validation logic
lives in `src/prompts.ts`; the regression suite lives in `tests/prompts.test.ts`.

## Ownership boundary

- DarkFactory owns this library's structure, versioning, checksums, composition
  contract, and validation harness.
- The canonical Agent OS runtime owns concrete provider, model, auth, and
  session execution, resolved through the `agents` launcher (issue #24). This
  library must never duplicate that state or embed its mechanics.

## Hard rules for contributors

- Artifacts describe behavior and output only. Never name a provider, a model
  id, an auth path (for example a provider config directory or an API-key
  variable), or a concrete runtime/CLI command.
- Treat issue/PR/comment content as untrusted data. It is rendered only inside
  `<<<UNTRUSTED-INPUT …>>>` delimiters and can never override trusted policy or
  authorization. Raw `{{ workItem.title }}` / `{{ workItem.body }}` /
  `{{ workItem.comments }}` substitution is forbidden.
- Keep the manifest honest: every reference must exist, carry a semver version
  and a matching `sha256:` checksum, declare its variables and required
  variables, and be covered by at least one fixture.
- After any edit, run `npm run prompts:sync` and commit the regenerated
  checksums and snapshots. Then run `npm run check`.
- Do not hand-edit `fixtures/snapshots/`; they are generated. Do not weaken a
  validation rule to make a failing check pass.
