# DarkFactory Branching Policy

Managed code repositories are trunk-based: `main` is the only long-lived branch
and is the canonical released product state.

- Work branches off `main` and returns through a reviewed pull request into
  `main`. There is no `dev` integration branch and no separate release pull
  request.
- `main` requires strict, GitHub-Actions-bound `Validate` and
  `DarkFactory Autoreview` checks.
- Force-pushes, deletion, and administrative gate bypass remain disabled.
- Every merge into `main` publishes a release when the product version changes.
- Post-merge convergence is exact because there is no second long-lived branch.

This policy is owned by the canonical Andromeda source and distributed from the
manifest-declared `.agents` authority in private-data.
