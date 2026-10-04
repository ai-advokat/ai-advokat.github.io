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


## Approved production target model — 4 October 2026

Zoran Stojankich approved **GPT-6.1 Sol** as the primary GPT model for AI Advokat.

Author approval received through the project lead:

> vo celos se soglasuvam  
> so 6,1

Governed target:

- model ID: `gpt-6.1-sol`
- API: OpenAI Responses API
- default reasoning effort: `medium`
- escalation effort for harder legal/professional tasks: `high`
- role: Chief Legal Orchestrator / proactive GPT layer behind the AI Advokat identity

This approval selects the model. It does **not** activate production provider execution.

Production activation still requires all of the following:

1. server-side `OPENAI_API_KEY`;
2. `OPENAI_ORCHESTRATOR_ENABLED=true`;
3. billing and an explicit spend limit;
4. a separate production provider Human Gate.

The API key must never be committed to GitHub or exposed to browser code.


## GPT-style product experience — implemented shell, provider gated

The user-facing design target confirmed by the project lead is **one AI Advokat assistant identity with GPT operating in the background**.

Implemented public workspace controls:

- New chat;
- current-session conversation history;
- attachment picker for PDF/DOC/DOCX/TXT/MD/CSV/JSON/images;
- browser voice dictation when supported;
- Auto / AI Advokat Library / Web modes;
- Send / Stop;
- Copy / Retry;
- export conversation;
- clickable Citizen Guide Router recommendations.

Backend contract:

- `POST /api/chat`;
- OpenAI Responses API;
- browser-session conversation history replayed to the Responses API with `store:false`;
- target model selected by Human Gate: `gpt-6.1-sol`;
- general non-legal tasks route to a GPT General Assistant;
- legal tasks retain jurisdiction/source governance;
- native AI Advokat catalogue/corpus context is used first when governed context exists.

### Current activation boundary

The shell and routing contract may be public while provider/tool execution remains fail-closed.

Still separate gates:

- `OPENAI_API_KEY` secret;
- `OPENAI_ORCHESTRATOR_ENABLED=true`;
- billing/spend controls;
- Web search tool activation;
- attachment-content processing;
- RAG / production corpus write;
- production provider Human Gate.

The interface must not imply that a visible button is an already-authorised tool. Attachment contents and Web search are not sent/executed until their corresponding server-side gate is enabled.


## Production-ready activation — 4 October 2026

The project lead requested implementation of the GPT background runtime.

Production configuration is now **armed but fail-closed**:

- `OPENAI_MODEL=gpt-6.1-sol`;
- `OPENAI_REASONING_EFFORT=medium`;
- `OPENAI_ORCHESTRATOR_ENABLED=true`;
- `OPENAI_EXTERNAL_RESEARCH_TOOLS_ENABLED=true`;
- `OPENAI_FILE_INPUT_ENABLED=true`.

The exact model ID `gpt-6.1-sol` was re-verified against current official OpenAI API documentation before activation work.

### Privacy correction before provider activation

AI Advokat does **not** use a durable OpenAI Conversation object for portal chat history.

Instead:

- the browser keeps the current session in `sessionStorage`;
- up to 12 prior user/assistant messages are replayed as context;
- the context is explicitly labelled **context only, not legal authority**;
- Responses API requests use `store:false`;
- no portal chat conversation is intentionally persisted by AI Advokat as an OpenAI Conversation object.

### Final external prerequisites

Provider execution still fails closed until:

1. a valid `OPENAI_API_KEY` is installed as a Cloudflare Worker secret;
2. billing and an explicit spend limit are configured in the OpenAI project;
3. the production activation workflow deploys the Worker and the live GPT smoke test passes.

The API key must never appear in GitHub source, workflow logs, browser JavaScript or public configuration.
