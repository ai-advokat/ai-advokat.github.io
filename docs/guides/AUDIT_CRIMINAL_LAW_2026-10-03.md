# AI Advokat — Legal/Source Upgrade Audit
## Водич за кривично право

**Guide ID:** `last-set-criminal-law`  
**Source:** `Krivicno-Pravo-Paragrafmk.docx` / `Krivicno-Pravo-Paragrafmk.pdf`  
**Edition:** Прво издание | 2025  
**Review state:** REVISION REQUIRED — implementation audit opened 2026-10-03  
**Author approval:** pending  
**All downstream gates:** closed

## Confirmed blocker
1. Replace legacy “малолетничка правда” source framing with the current Law on Justice for Children, Official Gazette 66/2024, amended 55/2025.
2. Re-check every age threshold, measure, sanction, diversion/alternative measure, procedural safeguard and competent authority against the current child-justice statute.
3. Verify all Criminal Code article numbers, penalty ranges, limitation periods and qualification thresholds against the current consolidated criminal-law text before publication.
4. Avoid categorical criminal-liability labels where the statutory elements have not been set out.

## Primary source baseline
- Ministry social-protection legal resources list: Law on Justice for Children 66/2024, 55/2025.
- Official text 66/2024: https://www.mtsp.gov.mk/content/word/2024/zavod_novi_mat/Zakon%20za%20pravda%20za%20decata.pdf

## Gate
No `corrected_candidate` until the source text is line-checked and all penalty/limitation tables are current.
