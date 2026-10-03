# AI Advokat — Legal/Source Upgrade Audit
## Водич за промет со недвижности

**Guide ID:** `last-set-real-estate-transfer`  
**Source:** `Promet-Nedviznosti-Paragrafmk.docx` / `Promet-Nedviznosti-Paragrafmk.pdf`  
**Edition:** Прво издание | 2025  
**Review state:** REVISION REQUIRED — implementation audit opened 2026-10-03  
**Author approval:** pending  
**Public release / RAG / GitHub merge / production corpus write:** closed

## Confirmed blockers
1. Replace superseded/legacy notary-law references with the current Notary Act framework beginning with Official Gazette 72/2016 and subsequent amendments/current consolidated text.
2. Reconcile all real-estate transfer tax statements with the Property Taxes Act framework. Ministry of Finance currently states a proportional real-estate transfer tax rate of 2%–4%, with the exact rate set locally.
3. Verify taxpayer, tax base, exemptions, exchange/ideal-share rules, bankruptcy/enforcement sale rules and any fixed deadlines article-by-article.
4. Remove unsupported fixed notarial/cadastral fees unless tied to a current tariff or official fee schedule.
5. Verify ownership-transfer/registration language so the guide does not collapse contractual title, constitutive/declaratory registration effects and cadastral procedure into one blanket rule.

## Primary source baseline
- Ministry of Justice — Notary legislation: https://www.pravda.gov.mk/mk-MK/resursi/zakoni-notarijat
- Ministry of Finance — Property taxes: https://finance.gov.mk/mk-MK/oblasti/danoci-na-imot

## Gate
Do not promote to `corrected_candidate` until the actual DOCX/PDF text is available for line-by-line replacement and a new candidate fingerprint can be generated.
