# Research Agent

A compact research-assistant workflow for turning local papers, notes, and project documents into daily next-step digests.

If this workflow is integrated into the Agents platform, keep it aligned with the platform source of truth:
GitHub Issues are the API, the Go daemon is the sole scheduler, and CI is orchestration/validation/record, not
the executor.

The loop is intentionally simple:

```text
PDFs / Markdown / notes
        ↓
chunk + embed
        ↓
semantic index
        ↓
nightly extraction
        ↓
claims, open questions, priority experiments
        ↓
morning digest
```

## Goals

- Index local PDFs, Markdown, and text notes into a semantic search store.
- Extract key claims, open questions, and suggested experiments on a nightly cadence.
- Generate a short morning digest with source paths so work can resume quickly.
- Keep the first implementation small enough to audit, modify, and run locally.

## Repository layout

Recommended drop-in structure:

```text
research/
  data/                # PDFs, Markdown notes, papers, text files
  index/               # vector store and chunk metadata
  runs/                # nightly extraction artifacts
  digests/             # daily Markdown digests
  agent/
    config.yaml
    embed.py
    extract.py
    summarize.py
    digest.py
```

## Dependencies

Use Python 3.11+.

```bash
pip install pypdf markdown-it-py sentence-transformers faiss-cpu rapidfuzz python-dateutil pyyaml
```

## Configuration

Create `research/agent/config.yaml`:

```yaml
data_dir: "research/data"
index_dir: "research/index"
runs_dir: "research/runs"
digests_dir: "research/digests"
model: "sentence-transformers/all-MiniLM-L6-v2"
chunk_chars: 1500
chunk_overlap: 200
top_k: 12
```

## Indexing

`embed.py` reads PDFs, Markdown, and text files, chunks the content, embeds each chunk, and writes:

- `research/index/store.faiss`
- `research/index/meta.jsonl`

The metadata file should include the source path and chunk text for every vector so digest output can link back to source material.

## Nightly extraction

`extract.py` retrieves chunks for broad research prompts and extracts:

- claims and results
- open questions and gaps
- suggested experiments, evaluations, measurements, and benchmarks

The first implementation can use conservative regex heuristics. Replace the extraction step with an LLM prompt over retrieved chunks once the workflow is stable.

## Summarization

`summarize.py` groups extraction results by source path, deduplicates repeated statements, and writes a compact JSON summary for the current date:

```text
research/runs/summary-YYYY-MM-DD.json
```

Each summary item should contain:

```json
{
  "path": "research/data/example-paper.pdf",
  "claims": [],
  "open_questions": [],
  "priority_experiments": []
}
```

## Digest generation

`digest.py` converts the daily summary into a Markdown digest:

```text
research/digests/digest-YYYY-MM-DD.md
```

The digest should be short and action-oriented:

```markdown
# Research Digest — YYYY-MM-DD

## source-file.pdf

**Claims**
- ...

**Open Questions**
- ...

**Priority Experiments**
- ...
```

## Local schedule

For standalone experimentation, run the steps manually or from a one-shot wrapper script. If you integrate this
into the platform, do **not** use cron or scheduled GitHub Actions as the production scheduler; route intake
through GitHub Issues and the daemon instead.

## Upgrade path

- Store byte offsets or line anchors for exact source links.
- Replace regex extraction with a structured LLM call over retrieved chunks.
- Emit `tasks.yaml` from the digest for issue creation or scheduler intake.
- Convert digest output into issue-backed intake for the platform manager.
- Track digest-to-experiment follow-through so the agent can learn which recommendations were useful.

## Operating notes

Keep this agent boring by default. It should write transparent artifacts, avoid hidden state, and make every recommendation traceable to a source chunk. The initial loop is retrieval-first and summarization-second; it should not invent experiments without a supporting source or clearly marked inference.
