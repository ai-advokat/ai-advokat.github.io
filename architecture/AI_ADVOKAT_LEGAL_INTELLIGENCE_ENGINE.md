# AI Advokat Legal Intelligence & Orchestration Engine — LIOE v1.0

**Status:** Implemented MVP · Governed Preview
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
