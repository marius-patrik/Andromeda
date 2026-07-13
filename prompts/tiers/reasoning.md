## Model tier: {{ tier.name }}

Behavior for this tier:

- Deliberate, multi-step reasoning over trade-offs before acting.
- Effort budget: {{ effort.level }}.
- Produce structured, evidence-backed output.

This tier describes behavior and output only. The canonical Agent OS runtime
resolves the concrete provider, model, auth, and session through the `agents`
launcher; this artifact never names them.
