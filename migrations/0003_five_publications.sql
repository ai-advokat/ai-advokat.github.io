-- AI Advokat D1 publication registry normalization
-- Ensures the five approved/planned Zoran Stojankich publication records exist.
-- Safe/idempotent: title+author guards prevent duplicate rows.

INSERT INTO publications
  (title, author_name, publication_type, publication_status, doi, canonical_url, abstract, keywords, human_review_status)
SELECT
  'Кочани – „Пулс“: индивидуална кривична, институционална и политичка одговорност',
  'Zoran Stojankich',
  'journal_article',
  'draft',
  '10.5281/zenodo.22981554',
  NULL,
  'Unpublished draft record. The reserved DOI is metadata only until formal Zenodo publication.',
  'criminal law; institutional accountability; public safety; North Macedonia',
  'pending_publication'
WHERE NOT EXISTS (
  SELECT 1 FROM publications
  WHERE title='Кочани – „Пулс“: индивидуална кривична, институционална и политичка одговорност'
    AND author_name='Zoran Stojankich'
);

INSERT INTO publications
  (title, author_name, publication_type, publication_status, doi, canonical_url, abstract, keywords, human_review_status)
SELECT
  '„СИНЏИР“ — Спогодување со обвинителството, признавање вина и границите на казнената правда',
  'Zoran Stojankich',
  'working_paper',
  'draft',
  '10.5281/zenodo.22981744',
  NULL,
  'Unpublished working-paper draft. The reserved DOI is metadata only until formal Zenodo publication.',
  'plea bargaining; criminal justice; financial crime; confiscation; equality in sentencing',
  'pending_publication'
WHERE NOT EXISTS (
  SELECT 1 FROM publications
  WHERE title='„СИНЏИР“ — Спогодување со обвинителството, признавање вина и границите на казнената правда'
    AND author_name='Zoran Stojankich'
);

INSERT INTO publications
  (title, author_name, publication_type, publication_status, doi, canonical_url, abstract, keywords, human_review_status)
SELECT
  'Електронските и AI генерираните докази во судската постапка',
  'Zoran Stojankich',
  'professional_scholarly_paper',
  'future_draft',
  NULL,
  NULL,
  'Future draft under review. No DOI is reserved and no Zenodo publication is represented.',
  'electronic evidence; AI-generated evidence; deepfake; authenticity; integrity; chain of custody',
  'review_pending'
WHERE NOT EXISTS (
  SELECT 1 FROM publications
  WHERE title='Електронските и AI генерираните докази во судската постапка'
    AND author_name='Zoran Stojankich'
);

INSERT INTO publications
  (title, author_name, publication_type, publication_status, doi, canonical_url, abstract, keywords, human_review_status)
SELECT
  'Претресот на мобилен телефон и заштитата на адвокатската тајна',
  'Zoran Stojankich',
  'professional_scholarly_paper',
  'future_draft',
  NULL,
  NULL,
  'Future draft under review. No DOI is reserved and no Zenodo publication is represented.',
  'criminal procedure; mobile phone search; legal professional privilege; electronic evidence; ECHR',
  'review_pending'
WHERE NOT EXISTS (
  SELECT 1 FROM publications
  WHERE title='Претресот на мобилен телефон и заштитата на адвокатската тајна'
    AND author_name='Zoran Stojankich'
);

INSERT INTO publications
  (title, author_name, publication_type, publication_status, doi, canonical_url, abstract, keywords, human_review_status)
SELECT
  'Вештачката интелигенција во адвокатурата и судството',
  'Zoran Stojankich',
  'professional_scholarly_paper',
  'future_draft',
  NULL,
  NULL,
  'Future draft under review. No DOI is reserved and no Zenodo publication is represented.',
  'AI and law; legal profession; judiciary; automated decision-making; fair trial; human control',
  'review_pending'
WHERE NOT EXISTS (
  SELECT 1 FROM publications
  WHERE title='Вештачката интелигенција во адвокатурата и судството'
    AND author_name='Zoran Stojankich'
);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('3', 'Ensure five Zoran Stojankich publication metadata records in D1');
