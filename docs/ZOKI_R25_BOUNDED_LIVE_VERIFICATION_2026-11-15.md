# AI Advokat R25 — bounded live provider verification (15 November 2026)

**State before this test:** DRAFT / NOT APPROVED FOR PRODUCTION. This
record deliberately does not assert that real AI is operational.

## Evidence from two previous Preview runs

- Run 43721222197, exact Preview source parity PASS. Real MK→SQ
  translation: HTTP 503 `ui_translation_provider_unavailable`.
  Real synthetic Whisper: HTTP 503 `voice_transcription_capacity_exhausted`.
  FREE internal chat: HTTP 503 `gpt_provider_locked`.
  External without membership: HTTP 401 `bot_membership_required`.
- Run 43721582770, after adding Preview-specific Workers AI variables:
  source parity and capabilities PASS, `freeChatModel` advertised.
  Translation HTTP 503, Whisper HTTP 503, internal chat HTTP 503
  `lioe_runtime_governance_locked`. External test greeting HTTP 200
  `canonical_corpus_no_model`, **not a real model conversation**.

These results do not prove that Cloudflare is actually out of its current
daily 10,000 free Neurons. The account dashboard supplied by the owner
displayed 0/10k earlier. HTTP 503 alone is insufficient to identify the
Cloudflare account-level billing/capacity condition.

## Repairs staged since the prior runs

1. R25 Preview explicitly configures FREE Workers AI and LIOE governance,
   postflight and telemetry while disabling paid OpenAI and autonomous
   specialist execution. Uses staging D1.
2. Voice distinguishes temporary provider capacity code 3040 from genuine
   free daily allocation code 3036, and does not silently retry paid.
3. M2M100 translation no longer expands temporary failures into GPT-OSS
   120B requests. Only empty model content can use one bounded GLM rescue;
   3036, 3040, timeout and unknown failures stop safely.
4. Source tests enforce Preview isolation, translation fail-closed and no
   uncontrolled paid fallback.
5. Live acceptance uses one brief MK→SQ translation, one synthetic
   English Whisper recording, one anonymous Workers AI chat, and a gated
   external training greeting. Never uploads client documents or invokes
   production mutations. The Workflow must fail when the real service fails.

## Human Gate after live acceptance

- Verify the exact Preview SHA and read the R25 workflow report.
- Compare `403/401/429/503` with configured Preview secrets and
  Cloudflare Workers AI model usage/Observability (do not paste keys).
- Use fictitious examples in both bots; attorney verifies actual semantic
  answer and primary-law version/date.
- Verify PDF/DOCX/JPG visual integrity and secure-case content permissions
  separately. 0/28 RC84 lawyer review and RC16 HG11/HG35 remain HOLD.
- No `main` merge, billing activation, production deployment or law
  promotion without explicit Human Gate.

**Run scope:** one CI run only, 3 bounded real Workers AI calls at most,
no automatic repeats, no paid model fallback.
