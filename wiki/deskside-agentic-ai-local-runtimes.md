# Deskside Agentic AI and Local Agent Runtimes

_Source migrated from `marius-patrik/marius-patrik:research/deskside-agentic-ai-local-runtimes.md`._

## What this does

This note defines a local or on-prem development path for always-on agents. The runtime sits near private repos, shells, IDEs, files, browsers, databases, and low-latency tools while enforcing policy and observability around every privileged action.

## Why it is worth building

Agent stacks are moving from prompt-response tools into long-running systems that plan, hold state, call tools, and execute workflows. Where the agent runs now affects data exposure, latency, token cost, observability, permissions, and failure blast radius.

A deskside runtime gives developers a controlled lab for testing agents against real project context before moving them into shared production infrastructure.

## Deployment modes

A strong stack should support three modes:

| Mode | Best fit |
| --- | --- |
| Cloud-first | Bursty workloads, managed models, hosted orchestration, external integrations |
| Deskside/local | Developer loops, private repo context, low-latency tool use, sensitive data, always-on prototypes |
| Data-center/on-prem | Enterprise governance, data gravity, predictable cost, scaled deployment |

The deskside mode is the bridge between individual development and production-grade autonomous workflows.

## Minimal runtime profile

Build the first local runtime around:

- **Execution boundary:** container, VM, or sandboxed user account with explicit filesystem and network access.
- **Tool-call gateway:** route shell, file, browser, database, and HTTP actions through a policy layer before execution.
- **State and memory:** persist project context and task history with provenance.
- **Observability:** log prompts, tool calls, approvals, blocked actions, token usage, latency, and file mutations.
- **Human approval:** require confirmation for destructive actions, credential access, external network calls, and repo writes.
- **Cloud fallback:** allow optional cloud model calls for hard reasoning while keeping sensitive context local by default.

## Runtime governance checks

A local agent is useful only if the runtime is treated as a security boundary. The minimum viable policy layer should answer:

- Which paths can the agent read?
- Which paths can it write?
- Which commands are forbidden?
- Which network hosts are allowed?
- Which actions require approval?
- Which artifacts must never leave the workstation?
- Which logs are safe to persist or upload?

## Runnable today

Create a `deskside` profile with:

```text
runtime: local-container
filesystem: allowlist
network: deny-by-default
shell: policy-gated
repo writes: approval-required
memory: local sqlite/duckdb
tracing: prompt + tool-call + diff logs
model backend: switchable local/cloud
```

Use it to compare cloud-first and local execution on latency, cost, safety, and failure recovery.

## Evaluation questions

- How much latency is saved when tool loops run locally?
- Which tasks can run on local models and which need cloud models?
- What data must never leave the workstation?
- What is the minimum policy layer for safe shell and file access?
- How expensive is always-on local inference versus cloud API usage?
- Can the same runtime contract scale from workstation to on-prem GPU server?

## Limitations and caveats

Local agents should not mean uncontrolled agents. Deskside execution increases access to privileged context, so file, shell, network, credential, and repo-write boundaries must be explicit before enabling always-on behavior.

## Source pointers

The source note referenced Dell's 2026 Deskside Agentic AI positioning and runtime-governance research including AI runtime infrastructure, AgentTrust, MI9, and ElephantBroker.
