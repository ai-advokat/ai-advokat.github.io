# AI Advokat — Governed Legal Agent Architecture V2

**Date:** 4 October 2026  
**Status:** architecture implemented on candidate branch; provider execution remains separately gated  
**Architecture ID:** `AI_ADVOKAT_GOVERNED_AGENT_ARCHITECTURE_v2`

## 1. Objective

AI Advokat is designed as one user-facing legal orchestrator, not a loose collection of chatbots.

The user sees:

**AI Advokat — Chief Legal Orchestrator**

The Chief routes bounded sub-tasks to specialist legal agents, requires a Verification & Citation pass, and then produces one final answer.

## 2. Manager-style pattern

The architecture follows the manager / agents-as-tools pattern:

`user → Chief → bounded specialists → Verification & Citation → Chief final synthesis`

The Chief retains the conversation. Specialists do not become independent user-facing personalities by default.

## 3. Specialist set

- Macedonian Law Agent
- EU Law Agent
- ECHR Agent
- International Law Agent
- Anglo-American / Common Law Agent
- AI Advokat Knowledge Agent
- Verification & Citation Agent

Each specialist has a fixed jurisdiction/source boundary.

## 4. Jurisdiction isolation

A single answer may contain multiple legal systems, but authority must remain separate.

Examples:
- UK precedent may be comparative authority but is never silently presented as Macedonian controlling law.
- EU law and ECHR/ECtHR authority are separate systems.
- International-law instruments must identify the instrument/body/source.
- Macedonian current-law claims require official-source/version evidence and the applicable Human Gate.

## 5. Two principal modes

### PROACTIVE LEGAL AGENT

The Chief plans the legal research task, selects specialist agents, compares source-backed findings and requires verification before synthesis.

### AI ADVOKAT KNOWLEDGE / PASSIVE SOURCE AGENT

The governing rule is:

`Corpus first → exact source → exact version → citation → only then synthesis`

If the native corpus does not support the proposition, the Knowledge Agent must return a corpus miss rather than silently fill the gap from model memory.

External research, if later authorised, is a separate labelled step:

**External legal research**

It must never be represented as Zoran Stojankich / AI Advokat native content.

## 6. Knowledge intake for incoming author material

Every new instruction/document received from Zoran follows:

1. preserve original;
2. calculate exact SHA-256;
3. read without editing;
4. classify;
5. assign authority role;
6. perform legal-source review where applicable;
7. record author Human Gate where applicable;
8. consider RAG in a separate gate;
9. consider publication/production in separate gates.

Supported intake classes:
- `authoritative_internal_instruction`
- `legal_reference_document`
- `user_facing_guide`
- `research_working_material`
- `unclassified_pending_review`

An internal instruction may govern system behaviour only after author approval. It is not automatically a source of law.

## 7. Current implementation

Implemented:
- governed role registry in `src/agent-orchestrator.js`;
- manager-style execution graph;
- corpus-first and external-research separation;
- jurisdiction-aware routing;
- mandatory verifier stage;
- fail-closed execution preconditions;
- knowledge intake module;
- public architecture API;
- planning-only orchestrator API;
- public knowledge-intake policy API;
- public transparency page;
- architecture and intake JSON registries;
- deterministic tests.

Public endpoints:
- `GET /api/orchestrator`
- `POST /api/orchestrator/plan`
- `GET /api/knowledge-intake-policy`

The planning endpoint does **not** execute OpenAI or external legal research.

## 8. OpenAI runtime target and Cloudflare constraint

The target orchestration model is compatible with the OpenAI Agents SDK manager-style pattern.

Current official OpenAI Agents SDK documentation states that the SDK supports agents, tools/handoffs, guardrails, sessions and tracing, and identifies manager-style “agents as tools” as the pattern where one manager keeps control and synthesises specialist outputs.

Cloudflare Workers support is currently limited:
- `nodejs_compat` is required for the Agents SDK;
- traces need manual flushing before the Worker request lifecycle ends;
- some trace accuracy may be affected by Cloudflare Workers' AsyncLocalStorage limitations.

Therefore this change does **not** silently enable the SDK or change production runtime compatibility flags. That requires a separate implementation/activation gate with staging verification.

Official references reviewed on 4 October 2026:
- https://openai.github.io/openai-agents-js/
- https://openai.github.io/openai-agents-js/guides/multi-agent/
- https://openai.github.io/openai-agents-js/guides/troubleshooting/
- https://openai.github.io/openai-agents-js/guides/tracing/

## 9. Human Gate invariants

The following remain independent:
- author approval;
- current-law verification;
- corpus promotion;
- RAG eligibility;
- GitHub merge;
- public release;
- production corpus write;
- provider activation.

No gate implies another.

## 10. Next technical stage after author instructions arrive

When the new instructions arrive:
1. ingest nothing automatically;
2. fingerprint the exact originals;
3. classify each item;
4. identify which instructions are authoritative for agent behaviour;
5. identify which documents are legal references;
6. identify user-facing guides;
7. build the native corpus manifest;
8. only then propose a separately gated retrieval/RAG adapter.

The intended final formula is:

**AI Advokat = GPT-powered Chief Legal Orchestrator + governed specialist legal agents + proprietary AI Advokat knowledge base + Verification & Citation + Human Gate.**
