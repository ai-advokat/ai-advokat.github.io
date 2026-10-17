# Criminal Code 2026 provenance verification

Status: **official provenance verified; article-level consolidated corpus still pending Human Gate**.

Official LDBIS metadata checked on 17 October 2026:

- Amendment: **Закон за изменување и дополнување на Кривичниот законик**, Official Gazette issue **16**, published **28.01.2026**, entry into force and application **05.02.2026**.
  - https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=72834
- Correction: **Исправка на Законот за изменување и дополнување на Кривичниот законик**, Official Gazette issue **17**, published **29.01.2026**, application **05.02.2026**.
  - https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=72841

The repository already records these two official LDBIS records in migration `0020_kz_2026_correction_provenance.sql`.

## Release rule

These metadata records are sufficient to prove the 2026 amendment/correction lineage, but **not** sufficient to promote a current article-level Criminal Code corpus. Article text must be reconstructed from the official base + amendment chain + 16/2026 + correction 17/2026, then reviewed and approved through the named Human Gate before `current_consolidated` status can be exposed.

Until then, runtime capability must remain fail-closed as:

`official_2026_provenance_registered_article_corpus_pending`
