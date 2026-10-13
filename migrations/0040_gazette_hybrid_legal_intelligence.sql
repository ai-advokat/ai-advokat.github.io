-- Gazette Hybrid Legal Intelligence Layer
-- Extends act-level metadata into a comprehensive, source-grounded legal-intelligence record.
-- No field may be populated as authoritative without official-source support and Human Gate review.

ALTER TABLE gazette_acts ADD COLUMN citizen_summary TEXT;
ALTER TABLE gazette_acts ADD COLUMN professional_summary TEXT;
ALTER TABLE gazette_acts ADD COLUMN affected_persons TEXT;
ALTER TABLE gazette_acts ADD COLUMN affected_institutions TEXT;
ALTER TABLE gazette_acts ADD COLUMN territorial_scope TEXT;
ALTER TABLE gazette_acts ADD COLUMN temporal_scope TEXT;
ALTER TABLE gazette_acts ADD COLUMN rights_created TEXT;
ALTER TABLE gazette_acts ADD COLUMN obligations_created TEXT;
ALTER TABLE gazette_acts ADD COLUMN prohibitions_restrictions TEXT;
ALTER TABLE gazette_acts ADD COLUMN sanctions_consequences TEXT;
ALTER TABLE gazette_acts ADD COLUMN deadlines_time_limits TEXT;
ALTER TABLE gazette_acts ADD COLUMN transitional_provisions TEXT;
ALTER TABLE gazette_acts ADD COLUMN repeal_supersession_effect TEXT;
ALTER TABLE gazette_acts ADD COLUMN implementation_body TEXT;
ALTER TABLE gazette_acts ADD COLUMN implementing_secondary_acts TEXT;
ALTER TABLE gazette_acts ADD COLUMN eu_alignment TEXT;
ALTER TABLE gazette_acts ADD COLUMN international_law_link TEXT;
ALTER TABLE gazette_acts ADD COLUMN constitutional_context TEXT;
ALTER TABLE gazette_acts ADD COLUMN case_law_context TEXT;
ALTER TABLE gazette_acts ADD COLUMN budget_fiscal_effect TEXT;
ALTER TABLE gazette_acts ADD COLUMN administrative_burden_effect TEXT;
ALTER TABLE gazette_acts ADD COLUMN digital_data_effect TEXT;
ALTER TABLE gazette_acts ADD COLUMN compliance_action TEXT;
ALTER TABLE gazette_acts ADD COLUMN practical_example TEXT;
ALTER TABLE gazette_acts ADD COLUMN risk_flags TEXT;
ALTER TABLE gazette_acts ADD COLUMN verification_notes TEXT;
ALTER TABLE gazette_acts ADD COLUMN last_verified_on TEXT;
ALTER TABLE gazette_acts ADD COLUMN next_review_due_on TEXT;
ALTER TABLE gazette_acts ADD COLUMN hybrid_review_status TEXT NOT NULL DEFAULT 'pending'
  CHECK(hybrid_review_status IN ('pending','reviewed','approved'));

CREATE TABLE IF NOT EXISTS gazette_act_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_act_id INTEGER NOT NULL REFERENCES gazette_acts(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL
    CHECK(relation_type IN (
      'amends','supplements','repeals','replaces','implements','derives_from',
      'refers_to','constitutional_review','case_law_interpretation',
      'eu_alignment','international_obligation','budget_dependency'
    )),
  target_act_id INTEGER REFERENCES gazette_acts(id) ON DELETE SET NULL,
  target_instrument_key TEXT,
  target_article_number TEXT,
  relation_note TEXT,
  source_basis TEXT,
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(human_review_status IN ('pending','reviewed','approved')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gazette_relationships_source
  ON gazette_act_relationships(source_act_id);
CREATE INDEX IF NOT EXISTS idx_gazette_relationships_target
  ON gazette_act_relationships(target_act_id,target_instrument_key,target_article_number);

CREATE TABLE IF NOT EXISTS gazette_act_effects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  act_id INTEGER NOT NULL REFERENCES gazette_acts(id) ON DELETE CASCADE,
  effect_type TEXT NOT NULL
    CHECK(effect_type IN (
      'right','obligation','prohibition','sanction','deadline','procedure',
      'institutional_change','financial_effect','data_processing','transitional_rule'
    )),
  subject TEXT,
  description TEXT NOT NULL,
  article_number TEXT,
  valid_from TEXT,
  valid_to TEXT,
  source_basis TEXT,
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(human_review_status IN ('pending','reviewed','approved')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gazette_effects_act
  ON gazette_act_effects(act_id);
CREATE INDEX IF NOT EXISTS idx_gazette_effects_type
  ON gazette_act_effects(effect_type);
