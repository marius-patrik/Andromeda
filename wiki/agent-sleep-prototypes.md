# Agent Sleep Prototypes

Three lightweight “sleep” systems for improving long-term memory, consolidation, and regression resilience in autonomous agents.

---

## 1. Nightly Embedding-Based Consolidation

### Goal
Convert raw chats and ephemeral sessions into a small set of durable topic summaries.

### Pipeline
1. Collect the last 24h of messages and tool traces.
2. Strip boilerplate and retain intents, outcomes, failures, and decisions.
3. Generate embeddings per chunk or message.
4. Cluster semantically similar entries.
5. Summarize each cluster into a Topic Card.
6. Store summaries in long-term memory + vector index.

### Example Topic Card
```md
# Data Pipeline Failures

TL;DR:
CSV ingestion failed due to malformed UTF-8.

Key Decisions:
- Add transcoding step before parquet conversion.
- Retry failed jobs once.

Open Questions:
- Should transcoding happen in Rust or Python?
```

### Pseudo-Code
```ts
const msgs = loadLogs('24h');
const chunks = preprocess(msgs);
const embs = embed(chunks);
const groups = cluster(embs);

for (const g of groups) {
  const card = llmSummarize(g.items);
  persist(card);
}
```

### Suggested Defaults
- Chunk size: 500–1000 chars
- Overlap: 100 chars
- Clusterer: HDBSCAN or k-means
- Schedule: nightly at 02:00

---

## 2. Probabilistic Downsampling + Canonical Notes

### Goal
Prevent note sprawl by maintaining a single canonical note per concept.

### Merge Strategy
When a new note overlaps strongly with an existing concept:

- Merge instead of append.
- Accept merge probabilistically using similarity, recency, and quality.
- Preserve stable facts while rotating volatile context.

### Merge Function
```ts
if (similarity(newNote, canonical) >= τ) {
  const p = sigmoid(
    α * similarity +
    β * recencyBoost +
    γ * qualityScore
  );

  if (rand() < p) {
    canonical = smartMerge(canonical, newNote);
  }
} else {
  createNewCanonical(newNote);
}
```

### Recommended Structure
```md
# Canonical Concept Note

## Stable Core
- APIs
- IDs
- protocols

## Recent Changes
- latest decisions
- new failures
- updated constraints

## Changelog
- 2026-05-24: added replay validation
```

### Benefits
- Prevents duplicate memory growth
- Reduces retrieval noise
- Stabilizes semantic drift

---

## 3. Lightweight Replay Harness

### Goal
Replay successful and failed trajectories to detect regressions.

### Replay Loop
1. Sample tagged trajectories.
2. Rehydrate only Topic Cards + canonical notes.
3. Re-run the agent in a sandbox.
4. Compare outputs, tool calls, latency, and cost.
5. Auto-file regressions.

### Example Replay Spec
```yaml
- id: convert-csv-to-parquet
  seed_context:
    - topics/2026-05-22-data-pipeline.md#etl

  input:
    path: data/users.csv

  expect:
    files:
      - data/users.parquet

    metrics:
      rows: ">=1000"
```

### Suggested Metrics
- Artifact equality
- Tool-call similarity
- Token consumption
- Runtime latency
- Success rate over time

### Suggested Cadence
- Nightly: 3–5 replay cases
- Weekly: 20-case regression sweep

---

## Suggested Repository Layout

```txt
/memory/
  ingest/
  embed/
  cluster/
  merge/
  cards/

/replay/
  specs/
  runner/
```

---

## Success Criteria

### Memory Consolidation
- 500 turns → <= 50 Topic Cards/week

### Retrieval Quality
- K=5 retrieval answers >= 80% of “what changed?” queries

### Replay Stability
- >= 90% deterministic reproduction on successful cases

---

## Implementation Notes

These systems intentionally avoid heavyweight training or infrastructure.
They can be implemented incrementally on top of:

- vector databases
- markdown note stores
- cron jobs
- Bun / Node workers
- lightweight sandbox runners

The primary goal is to make agents:

1. compress experience,
2. retain stable abstractions,
3. and continuously self-check behavior over time.
