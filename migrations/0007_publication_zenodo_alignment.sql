-- Align publication metadata with verified Zenodo state on 2026-09-29.
-- Four working papers are published; Kocani - Puls remains a journal draft.

UPDATE publications
SET publication_status='published',
    publication_date='2026-09-28',
    doi='10.5281/zenodo.22981744',
    canonical_url='https://zenodo.org/records/22981744',
    human_review_status='approved',
    updated_at=CURRENT_TIMESTAMP
WHERE author_name='Zoran Stojankich'
  AND title='„СИНЏИР“ — Спогодување со обвинителството, признавање вина и границите на казнената правда';

UPDATE publications
SET publication_status='published',
    publication_date='2026-09-28',
    doi='10.5281/zenodo.23017531',
    canonical_url='https://zenodo.org/records/23017531',
    human_review_status='approved',
    updated_at=CURRENT_TIMESTAMP
WHERE author_name='Zoran Stojankich'
  AND title='Електронските и AI генерираните докази во судската постапка';

UPDATE publications
SET publication_status='published',
    publication_date='2026-09-28',
    doi='10.5281/zenodo.23021388',
    canonical_url='https://zenodo.org/records/23021388',
    human_review_status='approved',
    updated_at=CURRENT_TIMESTAMP
WHERE author_name='Zoran Stojankich'
  AND title='Претресот на мобилен телефон и заштитата на адвокатската тајна';

UPDATE publications
SET publication_status='published',
    publication_date='2026-09-28',
    doi='10.5281/zenodo.23023442',
    canonical_url='https://zenodo.org/records/23023442',
    human_review_status='approved',
    updated_at=CURRENT_TIMESTAMP
WHERE author_name='Zoran Stojankich'
  AND title='Вештачката интелигенција во адвокатурата и судството';

UPDATE publications
SET publication_status='draft',
    canonical_url=NULL,
    human_review_status='pending',
    updated_at=CURRENT_TIMESTAMP
WHERE author_name='Zoran Stojankich'
  AND title='Кочани – „Пулс“: индивидуална кривична, институционална и политичка одговорност';

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('7', 'Align five-publication registry with verified Zenodo publication state');
