# PraVI / PRAKSIS — Public Feature Benchmark

Date: 2026-09-29
Mode: CLEAN-ROOM FEATURE BENCHMARK

## Publicly described four work modes

1. Legislation information
2. Court-decision search and synthesis
3. Legal-document drafting
4. Legal analysis and research

## Public interaction model

PraVI publicly describes:
- natural-language legal questions;
- automatic or manual mode selection;
- Standard / Fast response modes for legislation;
- direct source links for legal conclusions;
- search across current legislation and court decisions;
- document upload for analysis;
- template-assisted drafting;
- structured first drafts for contracts, claims, appeals, requests, decisions and internal acts;
- analysis of uploaded contracts, judgments, rulebooks and drafts;
- risk/issue highlighting;
- linking document analysis back to legislation and case law.

## AI Advokat mapping

### 1. Legislation
AI Advokat modules:
- Legal Research
- LDBIS Version Engine
- Article-Level Corpus

Required:
- one article = one authoritative chunk;
- current-version check;
- effective-date check;
- Official Gazette/LDBIS provenance;
- direct citations.

### 2. Court decisions
AI Advokat modules:
- Case Law Engine
- Supporting / Adverse / Distinguishing Authority

Required:
- originating court;
- case number/date;
- legal issue;
- cited articles;
- holding;
- factual similarity;
- hierarchy/finality;
- direct court-source link.

### 3. Legal-document drafting
AI Advokat modules:
- Document Generator
- Workflow Engine
- Human Gate

Outputs may include:
- contract;
- claim;
- appeal;
- objection;
- request;
- decision;
- internal act;
- procedural submission.

Drafting rule:
No final-use draft without verified current law and Human Gate.

### 4. Legal analysis and research
AI Advokat modules:
- Analyzer
- Case Intake & Legal Opinion Engine
- Document Intelligence

Capabilities:
- upload/document intake;
- fact extraction;
- legal-issue tree;
- compliance review;
- risk flags;
- linked legislation;
- linked case law;
- missing-evidence checklist;
- practical next steps.

## Response depth

PraVI publicly exposes a Fast / Standard distinction.

AI Advokat target:
- QUICK: concise controlling law + answer + citations;
- STANDARD: fuller legal analysis + related law + case law + risks;
- DEEP: complete case/document analysis + evidence matrix + procedural strategy + drafts.

## Competitive boundary

Use PraVI/PRAKSIS only as a public product benchmark.

Do NOT:
- copy subscriber-only PRAKSIS legal texts;
- copy proprietary court-decision corpus;
- copy templates or internal prompts;
- bypass login/subscription;
- reproduce proprietary editorial consolidation.

AI Advokat equivalents must be built independently from:
- Official Gazette;
- LDBIS;
- Judicial Portal / originating courts;
- Constitutional Court;
- Supreme Court;
- HUDOC / EUR-Lex where relevant;
- other official sources.

## Design principle

Every AI Advokat conclusion should be:
- source-backed;
- date-aware;
- article-specific;
- court-aware;
- reviewable by a human lawyer.
