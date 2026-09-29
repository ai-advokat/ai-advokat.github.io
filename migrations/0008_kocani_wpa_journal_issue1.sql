-- Record Kocani - Puls as an article in preparation for WPA Journal Volume I, Issue I.
-- Separate migration because v7 was already applied to staging.

UPDATE publications
SET venue='WPA Journal of Protocol, Diplomacy, Public Communication, Security & Communicology — Volume I, Issue I',
    publication_status='draft',
    human_review_status='pending',
    updated_at=CURRENT_TIMESTAMP
WHERE author_name='Zoran Stojankich'
  AND title='Кочани – „Пулс“: индивидуална кривична, институционална и политичка одговорност';

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('8', 'Mark Kocani Puls for WPA Journal Volume I Issue I inaugural issue');
