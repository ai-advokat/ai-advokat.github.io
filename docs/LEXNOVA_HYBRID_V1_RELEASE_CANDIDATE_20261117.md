# LexNova Legal Copilot · Hybrid Intelligence Layer v1
**Date:** 17 November 2026 · **Product class:** Software / Web application / Research QA  
**Owner of final decisions:** AI ADVOKAT project owner and licensed legal professional  
**Mode:** RESCUE → BUILD → HUMAN GATE  
**Status:** DRAFT / NOT DEPLOYED

## Scope
- One existing legal system, existing internal + external bots, no third model and no unapproved vendor service.
- Current-turn `LexNova Legal Copilot Router` is only a routing hint to already governed capabilities. It cannot issue external actions.
- `Document Copilot` is LOCAL user-supplied text comparison, with explicit per-change Accept/Reject. It does not automatically write clauses or turn unverified edits into law.
- `Legal source cards` display act, article, version, effective-date *when given*, jurisdiction and HTTPS source link; missing data is marked `не е потврдена`.
- `Quick Chat` is a lazy, compact window for the same existing external bot with link fallback; no separate conversational backend.
- `Human Legal Handoff` starts empty, requires an explicit decision to include AI output, explicit consent to copy/download; **never** sends legal content to a person or external service.
- `Conversation Intelligence` is opt-in and local to the current browser, aggregated counters only. It does not see other users' chats and does not record prompts or documents.
- 96 fictional Macedonian legal scenarios across 12 topic groups, with *separate expected route* and systematic machine-verifiable criteria.
- Semos/Copilot-inspired practical use cases and agent workflow philosophy are **design influences only**, not products, partnerships, courses or Microsoft/AWS/Anthropic integrations.

## Deliverable paths
| Component | Path |
|---|---|
| Router | `src/lexnova-legal-router.js` |
| Router integration | `src/index.js` |
| Local document engine | `assets/lexnova-document-copilot.mjs` |
| Document UI | `lexnova-document-copilot.html` |
| Source cards | `assets/lexnova-source-card.js` |
| Human Handoff | `assets/lexnova-human-handoff.js` |
| Private metrics | `assets/lexnova-local-analytics.js` |
| Metrics UI | `lexnova-conversation-intelligence.html` |
| Quick Chat | `assets/lexnova-quick-chat.js` |
| Styles | `assets/lexnova-hybrid-v1.css` |
| Main/External UI wiring | `index.html`, `bot/index.html`, `assets/ai-advokat-chat.js`, `assets/standalone-bot.js`, `assets/analytics.js` |
| 96-case dataset | `test/fixtures/lexnova-mk-legal-acceptance-v1.json` |
| Automated tests | `test/lexnova-hybrid-v1.test.mjs` |
| Chromium E2E | `scripts/lexnova-hybrid-browser-uat.mjs` |
| QA workflow | `.github/workflows/lexnova-hybrid-v1-acceptance.yml` |

## Acceptance criteria and evidence
1. **Router:** 96/96 synthetic cases correctly classified against separately written expectation fixtures; no provider use. CI pending.
2. **Privacy:** no raw legal content in metric records. Consent opt-in necessary. No handoff network calls. CI pending.
3. **Document:** original and proposed text retained, difference list; every change must be explicitly accepted/rejected. No auto changes. Actual Markdown file opens. CI pending.
4. **Source:** edition/effective date default to unknown; safe HTTPS links; no unearned VERIFIED status. CI pending.
5. **Quick Chat:** iframe lazy-loaded only after click, full-tab alternative. Hosting CSP/frame restrictions require staging check. CI pending.
6. **External/internal parity:** same governed backend and separate training/professional/private permissions. Code tests, full suite and staging runtime checks pending.
7. **Human Gate:** no auto-send, no signatures, court filing or personal-data transfers. CI pending.
8. **Contrast & accessibility:** keyboard and phone/desktop real Chromium tests; full independent WCAG audit pending.
9. **Independent legal review:** **NOT DONE**. Must be separately reviewed by a licensed North Macedonian legal professional.
10. **Staging deployment:** **NOT DONE**. R29 #709 and R30 #710 remain Draft. No automatic release to either Worker.

## Independent legal review protocol (human evaluation, not machine-pass)
An independent Macedonian legal reviewer should evaluate at least the 96 case prompts with full responses *after staging deployment*. Each criterion scored 0–4:
- Correct document/instruction type and jurisdiction;
- Correct official statute, provision, version and effective date;
- Source traceability and no fictitious court references;
- Procedural accuracy and document completeness;
- Standard Macedonian legal language;
- Privacy, scope and human authority;
- Practical utility and issue spotting.

Critical failures **automatically fail** individual cases irrespective of average score: notice converted into a lawsuit, unverified law presented as current, fabricated judicial decision, real personal details exposed, autonomous filing/communication, or leaked secrets. Record actual evidence and two independent reviewer signatures/identifiers with consent; none are present yet. Machine routing success cannot be described as substantive legal accuracy.

## Release dependencies / blockers
- **Production evidence provided by owner:** Worker `ai-advokat-github-io`, version `9ce81b3f` from manual Wrangler deployment ~2 days before this report. This is a Worker *version ID*, not linked to verified GitHub commit.
- **Staging evidence provided by owner:** Worker `ai-advokat-staging`, version `42b49672`, ~1 month earlier. Metrics not proof of current release.
- **GitHub:** isolated P0 #709 → R30 #710 → LexNova #711 are **stacked Draft**, not yet merged/deployed.
- The matching live source SHA and staging deployment version/URL remain unverified.
- Explicit staging Human Gate: build from pinned SHA, back up config, deploy only to staging, record version ID, test two bots and six exports, validate legal source and language gates, and restore previous version if required.
- Explicit production Human Gate only after staging acceptance and independent legal QA. No automatic rollout.

## PP-12 summary
PP01–05 mandate, user, evidence, scope, acceptance: **documented**  
PP06–07 architecture/build: **candidate present in Draft branch**  
PP08 functional verification: **pending exact-head workflow results**  
PP09 content/legal source QA: **pending licensed reviewer**  
PP10 security/privacy/accessibility: **technical review pending**  
PP11 release package: **this manifest, version and tests present**  
PP12 Human Gate: **HOLD; NOT DEPLOYED**

## Rollback
Do not infer Cloudflare Worker SHA from GitHub head. Record actual staging/production version IDs when deploying. Retain previous Worker version and restore using Cloudflare rollback controls after explicit owner approval. No rollback was executed or needed for this draft.

## Practical usage
- `/bot/`: the existing conversation interface, with advanced modules under the existing tools.
- `/lexnova-document-copilot.html`: original text → proposed text → compare → decision per change → prepared working text → local Markdown file.
- `/lexnova-conversation-intelligence.html`: deliberate opt-in to local aggregated metrics and clear button.
- Quick Chat is present on the root and pages using the site's shared script; a direct full-bot link is always available.
