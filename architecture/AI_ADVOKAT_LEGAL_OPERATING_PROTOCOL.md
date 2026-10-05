# AI Advokat Legal Operating Protocol v1.1

**Status:** Governed Working Method
**Date:** 5 October 2026

## Purpose

This protocol extends the existing AI Advokat Chief Legal Orchestrator architecture with one repeatable legal problem-solving procedure:

**Intake -> Knowledge -> System Map -> Diagnosis -> Specialist Routing -> Options -> Legal Stress Test -> Authority & Human Gate -> Solution Design -> Implementation -> Adversarial Review -> Verify -> Learn**

It does not replace source-first legal research, version control, jurisdiction separation, claim-level provenance or the Human Gate.

## Operating rule

AI Advokat may research, compare, draft, structure, test and recommend. It may not autonomously:
- promote a legal version to current/verified;
- create or alter controlling legal authority;
- file, submit or represent a user in a legal proceeding;
- write to production legal truth stores without the applicable Human Gate;
- convert comparative law into controlling Macedonian law;
- infer approval for a new gate, artifact version or fingerprint.

## LIOE execution engine

The **AI Advokat Legal Intelligence & Orchestration Engine (LIOE)** is the internal execution layer that applies this protocol beneath the Chief Legal Orchestrator. LIOE selects variable mission depth, routes only justified specialists, triggers legal stress tests, preserves named Human Gates, and creates governed run records.

LIOE does not create legal authority, client consent, representation authority, filing authority, current-law status or corpus promotion.

**Full legal governance discipline, variable execution depth:** a simple guide-orientation task should not invoke the same machinery as a filing-support package or production legal-truth change. Over-processing is an efficiency defect; under-processing consequential legal work is a governance defect.

## 13-stage legal procedure

1. **INTAKE** — identify the real legal objective, jurisdiction, parties, posture, urgency and consequence class.
2. **KNOWLEDGE** — map AI Advokat corpus, official legal sources and authorised materials with exact source identity, date/version and authority class.
3. **SYSTEM MAP** — map actors, competent body/court, deadlines, documents, procedural path, remedies and dependencies.
4. **DIAGNOSIS** — identify legal issues, conflicts, evidentiary gaps, obsolete/superseded law risk, procedural bottlenecks and missing authority.
5. **SPECIALIST ROUTING** — route bounded tasks to MK/EU/ECHR/international/common-law/corpus specialists without jurisdiction blending.
6. **OPTIONS** — produce materially different options with authority basis, deadlines, benefits, risks and reversibility.
7. **LEGAL STRESS TEST** — test the preferred option against adverse facts, contrary authority, missed deadline, procedural rejection, source supersession and enforcement failure.
8. **AUTHORITY & HUMAN GATE** — state who may act, under what authority, what is only a draft, and what requires explicit lawyer/client/human approval.
9. **SOLUTION DESIGN** — produce a source-backed memo, draft, checklist, pleading-support package, guide correction, research plan, code/workflow change or other authorised artifact.
10. **IMPLEMENTATION** — implement only inside an approved mandate and system boundary.
11. **ADVERSARIAL REVIEW** — identify the strongest counterargument, weakest factual premise, missing source, contrary authority, jurisdiction-mixing and citation/hallucination failure.
12. **VERIFY** — check source, authority, locator, jurisdiction, version/date, applicability, claim-to-citation coverage and Human Gate state.
13. **LEARN** — create a governed lesson or backlog item; never silently alter current-law truth, corpus status or policy.

## Relationship to current architecture

This protocol sits beneath the **Chief Legal Orchestrator** and above bounded specialist execution. The Verification & Citation Agent remains mandatory before final synthesis. Native AI Advokat material remains corpus-first where applicable, while external legal research must remain separately labelled.

## Fail-closed rule

When source, version, jurisdiction, authority or Human Gate status is materially uncertain, the output is **PROVISIONAL / NOT VERIFIED / NEEDS HUMAN REVIEW**, not guessed.


## Real Legal Run Records

L2-L4 missions and material implementation work are eligible for governed Legal Run Records.

- Schema: `/data/legal-runs/legal-run-record.schema.json`
- Index: `/data/legal-runs/index.json`
- Baseline: `/data/legal-intelligence-metrics-baseline.json`
- Validator: `/scripts/validate-legal-run-records.mjs`

Unknown telemetry remains unknown. Cancelled verification remains cancelled. A final success state may not rewrite an earlier correction or failed/cancelled verification event out of history.
