-- Converge staging and production metadata after v8 compatibility correction.
-- Keeps Kocani - Puls as a draft intended for WPA Journal Volume I, Issue I.

UPDATE publications
SET venue='WPA Journal of Protocol, Diplomacy, Public Communication, Security & Communicology — Volume I, Issue I',
    publication_status='draft',
    human_review_status='pending',
    updated_at=CURRENT_TIMESTAMP
WHERE author_name='Zoran Stojankich'
  AND title='Кочани – „Пулс“: индивидуална кривична, институционална и политичка одговорност';

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('9', 'Converge Kocani WPA Journal Issue I metadata across staging and production');
