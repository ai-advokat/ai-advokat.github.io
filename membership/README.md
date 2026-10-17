# AI Advokat Membership v1

Membership v1 is a staging-first entitlement layer for the AI Advokat legal research bot.

## Plans

| Plan | Monthly | Annual | Monthly AI quota | Seats |
|---|---:|---:|---:|---:|
| FREE | 0 MKD | 0 MKD | target 10 | 1 |
| START | 490 MKD | 4,900 MKD | 15 | 1 |
| PRO | 1,490 MKD | 14,900 MKD | 45 | 1 |
| OFFICE | 4,990 MKD | 49,900 MKD | 150 | 5 |

PRO supports a 7-day trial request. Trial activation remains Human-Gate controlled until secure account verification is implemented.

## Safety boundaries

- Official laws, legal sources and basic search remain free.
- Membership pays for AI usage and workflow capacity, not ownership of public law.
- Human Review is a separate professional legal service.
- No card numbers, passwords or confidential client files are stored by Membership v1.
- Membership keys are stored in D1 only as SHA-256 hashes.
- The browser keeps a pasted membership key only in sessionStorage.
- Card payment remains locked until a payment provider is selected and integrated.
- Bank-transfer activation is manual and requires Human Gate confirmation.
- Public FREE AI uses Workers AI only and is capped at 10 monthly requests; it does not automatically spill into paid OpenAI. Paid quotas are enforced for valid membership keys.

## Activation flow

1. User submits a trial/subscription request on `/membership.html`.
2. Worker stores a pending row in `membership_requests`.
3. Human Gate reviews the request and, for paid plans, confirms payment.
4. Operator creates/activates the membership account + entitlement.
5. Operator generates a random private key locally, hashes it with `npm run membership:key-hash -- "<key>"`, and stores only the hash + short prefix in D1.
6. User receives the private key through an appropriate channel.
7. Bot validates the key server-side and consumes the applicable monthly quota.

## Manual provisioning

Do not paste real private membership keys into GitHub, issues, pull requests or SQL committed to the repository.

Generate a sufficiently random key outside source control. Example shape:

`AIADV-<high-entropy-random-secret>`

Hash it locally:

`npm run membership:key-hash -- "AIADV-..."`

Use the resulting SHA-256 hash when inserting `membership_access_keys.key_hash`.

Production activation must not occur until migration 0017 has passed staging migration, membership safety checks, preview testing and Human Gate approval.
