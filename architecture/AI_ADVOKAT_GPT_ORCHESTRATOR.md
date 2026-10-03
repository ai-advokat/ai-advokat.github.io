# AI Advokat — GPT Legal Orchestrator Architecture (Phase 1)

## Decision

AI Advokat is to operate as one user-facing legal intelligence system with a **Chief Legal Orchestrator** powered by an OpenAI GPT model, while specialist agents perform bounded legal research tasks.

This implements the concept confirmed by Zoran Stojankich on 3 October 2026.

## Two operating modes

### 1. Passive / AI Advokat native corpus

When the answer is requested from materials uploaded or authored for AI Advokat, the system is **corpus-first**.

Order:

1. identify the native AI Advokat document/corpus;
2. retrieve the exact passage/version;
3. preserve document provenance;
4. synthesize only from supported material;
5. cite the native source;
6. if the corpus does not support a proposition, say so;
7. outside research, if later permitted, must be separately labelled **External legal research**.

Native AI Advokat material must never be silently blended with general model knowledge.

### 2. Proactive legal research

The Chief Legal Orchestrator may coordinate bounded specialist agents:

- Macedonian Law Agent;
- EU Law Agent;
- ECHR Agent;
- Common Law Agent;
- International Law Agent;
- AI Advokat Knowledge Agent;
- Verification & Citation Agent.

The orchestrator may compare systems, but must never collapse their authority. A UK/US precedent is comparative authority for a Macedonian-law question unless an applicable rule expressly makes it otherwise. EU law, ECHR law and international law must also remain separately labelled.

## Human Gate

The Human Gate remains mandatory for:

- promotion of any Macedonian legal text/version to current/verified;
- production D1 corpus writes;
- migration application in production;
- high-stakes reliance where version/source status is not already verified.

The model may research, route, compare and draft. It may not autonomously change legal-status truth labels.

## OpenAI provider

New integrations use the OpenAI **Responses API**. The provider is fail-closed and remains dormant unless all three runtime values exist:

- `OPENAI_ORCHESTRATOR_ENABLED=true`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

No API key is stored in the repository.

Phase 1 adds the provider/orchestration foundation only. It does **not** enable production GPT calls and does not replace the current source-backed assistant yet.

## Phase sequence

**Phase 1 — foundation (this PR)**  
Agent registry, deterministic routing plan, OpenAI Responses API adapter, fail-closed activation contract, tests and architecture record.

**Phase 2 — passive knowledge ingestion**  
Governed document registry for Zoran's instructions, papers and uploaded materials; chunk provenance; document/version IDs; native-source citations; no silent model-memory fallback.

**Phase 3 — proactive specialist tools**  
Official MK source tools, EUR-Lex/CJEU, HUDOC, international-law sources and jurisdiction-scoped common-law research connectors.

**Phase 4 — chief orchestrator activation**  
Wire `/api/assistant` to the GPT orchestrator behind an explicit environment gate, while retaining quota, citation guardrails, version logic, Human Gate and fallback behavior.

**Phase 5 — evaluation and production gate**  
Adversarial jurisdiction-mixing tests, citation completeness, temporal/version tests, privacy review, cost limits, staging, then separate explicit production authorization.

## Non-goals of Phase 1

- no production deployment;
- no D1 writes;
- no law import;
- no legal-status promotion;
- no API key or secret committed;
- no autonomous legal representation.
