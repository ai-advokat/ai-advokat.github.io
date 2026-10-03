# AI Advokat — Legal/Source Upgrade Audit
## Стручен водич АKN

**Guide ID:** `last-set-cadastre-professional`  
**Source:** `Strucen-Vodic-AKN-Paragrafmk.docx` / `Strucen-Vodic-AKN-Paragrafmk.pdf`  
**Edition:** Прво издание | 2025  
**Review state:** REVISION REQUIRED — implementation audit opened 2026-10-03  
**Author approval:** pending  
**All downstream gates:** closed

## Confirmed blockers
1. Replace superseded Notary and Enforcement Act references with the current frameworks.
2. Verify professional deadlines, filing rules, evidentiary requirements, cadastral correction procedures, sanctions and remedies article-by-article.
3. Do not state automatic nullity, criminal liability or fixed penalties without the exact statutory test.
4. Any notarial step must be checked against the Notary Act 72/2016 framework and current amendments/consolidated text.
5. Any enforcement-related step must use the Enforcement Act 72/2016 framework and current amendments, not the 2005 act.

## Primary source baseline
- Notary legislation: https://www.pravda.gov.mk/mk-MK/resursi/zakoni-notarijat
- Enforcement legislation: https://www.pravda.gov.mk/mk-MK/resursi/zakoni-izvrsuvanje

## Gate
Actual text revision + new fingerprints + render QA are mandatory before `corrected_candidate`.
