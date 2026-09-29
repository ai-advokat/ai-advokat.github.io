# Paragraf corpus classification policy

Only records with `knowledge_eligible = 1` may be exposed to AI Advokat retrieval.

## Eligible by default after provenance verification
- primary legislation and official consolidated texts
- case law / judgments
- the five Zoran Stojankich publications
- legal commentary owned/authorized for migration
- legal templates intended for public/professional knowledge use

## Never knowledge-eligible
- payment instructions
- bank/account details
- subscription pages
- login/session/account records
- credentials, tokens, API keys
- billing identities
- private client or case files
- private uploads
- administrative telemetry

## Restricted material
Restricted/private legal material must be isolated from the public corpus and may not be queried by the public bot. A future authenticated workspace can use it only with separate authorization and audit controls.

## Retrieval order
1. Official/primary law
2. Official case law
3. Verified author publications
4. Verified authorized commentary
5. Templates/reference material

If sources conflict, the bot must surface the conflict and prefer the authoritative/current source rather than silently blending them.
