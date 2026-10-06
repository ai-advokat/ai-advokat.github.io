# AI Advokat Legal Intelligence & Orchestration Engine — LIOE v1.0

**Status:** Full Runtime Candidate · Production Activation Pending
**Date:** 6 October 2026

## Purpose

LIOE is the internal problem-solving and orchestration engine that operationalises the AI Advokat Legal Operating Protocol.

It sits inside the Chief Legal Orchestrator workflow:

**User → Chief Legal Orchestrator → Legal Operating Protocol → LIOE → bounded legal specialists → Legal Stress Test → Verification & Citation → named Human Gates → bounded implementation → verification → governed learning**

LIOE is not a lawyer, court, authority, filing service or source of legal force.

## Five mission profiles

### L0 — Informational

Guide navigation, orientation and low-consequence explanation. Use the smallest justified route.

### L1 — Verified Research

Source-backed legal research. Current-law claims require source/version/date verification. Publication date, entry into force and application date must not be silently treated as the same thing.

### L2 — Strategy / Procedure

Case planning, procedure, deadlines, remedies, comparative work and materially different options. Requires system mapping, legal stress testing and adversarial review.

### L3 — Consequential

Pleading/contract/action preparation, high-stakes reliance, public/professional release or production-changing implementation. Human review is mandatory; AI Advokat does not autonomously file, send, sign or legally represent.

### L4 — Legal Truth / Governance

Current-law promotion, legal-corpus/RAG promotion, production legal-truth changes, provider activation or foundational governance changes. Named Human Gates are isolated and fail closed.

## Selective activation

More specialists do not automatically mean better legal work.

Every specialist must have a routing reason. Jurisdictions remain separate. A simple AI Advokat guide lookup must not fan out to MK, EU, ECHR, international and common-law agents. A comparative problem may use several specialists, but each output keeps its authority label.

## Legal stress test

For L2-L4, test the preferred approach against:

- amendment or supersession;
- publication vs entry into force vs application date;
- transitional provisions;
- wrong jurisdiction or authority level;
- limitation/deadline expiry;
- contrary or distinguishable case law;
- missing facts/evidence;
- procedural inadmissibility;
- remedy/enforcement failure;
- contrary official source;
- citation/locator failure.

## Human Gate isolation

Mission depth is not permission.

LIOE can determine that a task requires deeper analysis while still having no authority to:
- file a pleading;
- send a submission to a court/authority;
- bind a client;
- promote a legal version to current;
- promote material to RAG/corpus;
- write to production legal truth;
- activate a provider.

Those actions require the applicable named Human Gate and version/fingerprint binding where relevant.

## Effectiveness and efficiency

The legal optimisation target is:

> Maximum verified legal usefulness with the minimum justified specialist activation, duplication, latency and rework — without weakening source, authority, jurisdiction, version/date, citation, deadline, privacy or Human Gate integrity.

A faster answer that loses legal reliability is a failed optimisation.

## Real Legal Run Records

LIOE uses real run records for evidence-backed improvement:

- schema: `/data/legal-runs/legal-run-record.schema.json`
- index: `/data/legal-runs/index.json`
- baseline: `/data/legal-intelligence-metrics-baseline.json`
- evaluation suite: `/data/legal-intelligence-evaluation-suite.json`
- validator: `/scripts/validate-legal-run-records.mjs`

Run records do not replace the Human Gate Decision Ledger or the append-only legal audit trail. They measure the mission; the existing ledgers govern legal decisions and artifact state.

## Learning boundary

LIOE may produce a learning candidate, new regression test or workflow improvement.

It may not silently change:
- legal status;
- current-law truth labels;
- corpus/RAG eligibility;
- Human Gate policy;
- source authority;
- jurisdiction hierarchy.

**Self-improving legal workflow does not mean self-authorising legal authority.**


## Runtime enforcement

The full runtime implementation adds deterministic release governance around `/api/chat`.

For governed legal missions, the Worker now returns visible LIOE metadata including mission profile, source verification, temporal verification, release state, execution authorization and Human Gate requirements.

Current-law output is classified as:

- **VERIFIED_CURRENT_RESEARCH** only where Human-Gate approved current article-level evidence and postflight temporal verification are both present;
- **PROVISIONAL_CURRENT_LAW_EXTERNAL_RESEARCH** where external Web research exists but current-law status is not established by the governed native corpus;
- **UNVERIFIED_CURRENT_LAW** where the necessary current-law evidence is absent.

L3 remains advisory/draft-only with `NO_EXTERNAL_ACTION`. L4 remains `NO_LEGAL_TRUTH_MUTATION`.

## Structured legal postflight

Current-law missions and L2–L4 missions receive a second bounded verifier pass using OpenAI Responses Structured Outputs.

The verifier checks source integrity, temporal integrity, jurisdiction integrity, legal stress testing, adversarial review and Human Gate boundaries.

A first `REVISE` result triggers one correction and exactly one re-verification attempt. A second non-PASS result fails closed and the draft is not released.

## Two-tier observability

AI Advokat now separates two evidence layers:

1. **Canonical engineering runs** — `LIOE-2026-NNNN` records in the repository for major architecture/release missions.
2. **Live runtime telemetry** — `LIOE-RT-...` rows in production D1 for privacy-minimised operational measurement.

Runtime telemetry stores metadata only: mission profile, verification/release states, source counts, postflight attempts, provider calls, token counts and elapsed time. It does not store questions, answers, conversation history, attachments, identities, client facts or source text.

L2–L4 runtime release fails closed when required telemetry persistence is unavailable.

## Production activation

Production activation is separately governed:

**GitHub merge ≠ production schema migration ≠ production runtime deploy ≠ provider activation.**

Migration 0028 creates the telemetry table. The dedicated production activation workflow verifies the exact D1 target, rejects unexpected pending migrations, applies 0028, verifies the privacy schema, deploys the Worker, checks live LIOE readiness and, only when the provider is independently configured, runs a live legal postflight + telemetry smoke test.


## Real bounded specialist execution

For L2–L4, selected specialist roles are now executable bounded sub-agents rather than routing labels only.

The Chief Legal Orchestrator remains the sole owner of the user-facing conversation. LIOE activates up to four justified specialists in parallel, each inside its jurisdiction/source boundary. Their findings return to the Chief as bounded research inputs.

L0/L1 do not automatically fan out. This preserves the minimal-sufficient-activation rule.

If a required specialist execution fails, the mission fails closed rather than silently continuing as if the specialist had completed. When Web research is explicitly enabled, specialists may use governed Web search; if they already obtain Web sources, the Chief avoids a duplicate Web-search call where possible.

Specialist consensus does not create legal authority. Verification & Citation and the structured postflight remain separate controls.
