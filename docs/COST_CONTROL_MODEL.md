# AI Advokat cost-control model

The launch economics are intentionally conservative until enough governed runtime telemetry exists.

## Launch plans

| Plan | Monthly | Annual | Included monthly requests |
| --- | ---: | ---: | ---: |
| FREE | 0 MKD | 0 MKD | 10 |
| START | 490 MKD | 4,900 MKD | 10 |
| PRO | 1,490 MKD | 14,900 MKD | 30 |
| OFFICE | 4,990 MKD | 49,900 MKD | 100 |

FREE is isolated to Workers AI. It must not automatically spill into paid OpenAI.

## Weighted credit telemetry

LIOE runtime telemetry schema 1.1 calculates a privacy-minimised `estimated_credit_units` value from mission depth, provider-call count, web-search use and attachment count. It does not store the user's question, answer, source text, attachment text, client identity or membership key.

Current weights are calibration-only and do not yet change customer billing:
- GENERAL/L0: base 1
- L1: base 2
- L2: base 3
- L3: base 5
- L4: base 8
- Web search: +1
- Attachments: +1 per two attachments, capped at +5
- Additional provider calls: +1 each
- Per-run telemetry cap: 25 credit units

The commercial model may move from raw request quotas to weighted credits only after Human Gate review of real production telemetry and margin data. Monetary cost is not inferred from the credit unit.
