-- AI Advokat — ZKP Commentary v6 governed secondary layer.
-- The statutory ZKP corpus remains controlling. This table stores authorial analysis only.

CREATE TABLE IF NOT EXISTS zkp_commentary_releases (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  edition TEXT NOT NULL,
  author TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  record_count INTEGER NOT NULL,
  authority_role TEXT NOT NULL CHECK(authority_role='authorial_analysis'),
  human_gate_status TEXT NOT NULL DEFAULT 'pending' CHECK(human_gate_status IN ('pending','approved','revoked')),
  active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)),
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS zkp_commentary_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  release_id TEXT NOT NULL REFERENCES zkp_commentary_releases(id) ON DELETE CASCADE,
  article_number TEXT NOT NULL,
  article_title TEXT,
  law_text_json TEXT NOT NULL,
  commentary_json TEXT NOT NULL,
  practice_json TEXT NOT NULL DEFAULT '[]',
  common_errors_json TEXT NOT NULL DEFAULT '[]',
  formulations_json TEXT NOT NULL DEFAULT '[]',
  related_provisions_json TEXT NOT NULL DEFAULT '[]',
  systematics_json TEXT,
  procedure_phase_json TEXT,
  actors_json TEXT,
  topics_json TEXT,
  related_articles_json TEXT,
  practical_use TEXT,
  risk_level TEXT,
  source_label TEXT NOT NULL,
  record_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(release_id, article_number)
);

CREATE INDEX IF NOT EXISTS idx_zkp_commentary_article_number ON zkp_commentary_articles(article_number);
CREATE INDEX IF NOT EXISTS idx_zkp_commentary_release ON zkp_commentary_articles(release_id);

INSERT OR IGNORE INTO zkp_commentary_releases
  (id,title,edition,author,source_sha256,record_count,authority_role,human_gate_status,active)
VALUES
  ('zkp-commentary-v6-2026','Коментар на Законот за кривичната постапка','6','Адвокат Зоран Стојанкиќ',
   '5a6a691cf616599c1648ab9749a34d388f7c4b5fea8b49ecfd3b4f409903c363',570,'authorial_analysis','pending',0);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('48', 'Create governed ZKP Commentary v6 secondary authorial layer');
