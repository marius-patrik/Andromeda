# Cortex — universal predictive core with a Reality Constraint Nucleus

**Why:** Unify “model anything” work behind a tiny, stable API so training and ops can move independently and fast.

**What:** A predictive core (Transformer/Perceiver style) that emits next-state deltas; an RCN layer that enforces observables/physics via composable evaluators + differentiable projections; two agents (Scientist, Ops) that close the loop from metrics → checkpoints → deployment; signed, semver’d checkpoints and a canonical `CortexState`.

**How (flow):** `CortexState` → Predictive Core → `Predictions` → RCN (validate/project) → metrics → Scientist Agent (update weights) → Ops Agent (promote).

**Key rules:**
- gRPC+protobuf API is stable and tiny.
- Checkpoints are semver’d, signed, and reproducible (deterministic replay hash).
- Adapters are manifest-driven and discoverable.
- Every PR must pass deterministic smoke + manifest validation.

**Repo map:** see `/model`, `/ops`, `/proto`, `/wiki/architecture/Cortex-onepage.md`.
