# Membership onboarding

**Principle.** Laws, official sources and basic search are free. Membership pays for a larger monthly AI Researcher quota (and, later, clearly labelled professional tools).

| Plan | Monthly (MKD) | Annual (MKD) | AI questions / month | Seats | Trial |
|---|---|---|---|---|---|
| FREE | 0 | 0 | 10 | 1 | — |
| START | 199 | 1.990 | 100 | 1 | — |
| PRO | 399 | 3.990 | 500 | 1 | 7 days, after review |
| OFFICE | 999 | 9.990 | 2.000 | 5 | — |

These values must match `MEMBERSHIP_PLANS` in `src/index.js`. `test/public-layer.test.mjs` fails if `membership.html` drifts.

**Flow (v1):**

1. The user sends a request on `membership.html`. There is no payment and no card at this step. The request is protected by Cloudflare Turnstile.
2. The request is stored as `pending_human_gate`.
3. For a paid plan, a human confirms the request and sends bank-transfer instructions.
4. After payment and review, a private membership key is issued.
5. The user enters the key in the AI Researcher. It is stored only for the browser session.

**What v1 does not have:** card payments, stored payment data, automatic renewal, automatic charging. A trial does not convert to a paid plan automatically.

**Duplicate requests.** One pending request per e-mail per 24 hours. The form answers identically either way.
