-- AI Advokat 0028: LIOE sanitised runtime telemetry.
--
-- Purpose:
--   Evidence-backed effectiveness/efficiency measurement for /api/chat without
--   storing user questions, answers, attachments, source text, identities or
--   client/case facts.
--
-- Privacy boundary:
--   This table stores operational metadata only. It is NOT a conversation log,
--   case file, legal record, Human Gate ledger or source-of-truth registry.

CREATE TABLE IF NOT EXISTS lioe_runtime_runs (
  run_id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  mission_profile TEXT NOT NULL CHECK (mission_profile IN (
    'GENERAL_BYPASS','L0_INFORMATIONAL','L1_VERIFIED_RESEARCH',
    'L2_STRATEGY_PROCEDURE','L3_CONSEQUENTIAL','L4_LEGAL_TRUTH_GOVERNANCE'
  )),
  problem_class TEXT NOT NULL,
  mode TEXT,
  source_mode TEXT,
  current_law_material INTEGER NOT NULL DEFAULT 0 CHECK (current_law_material IN (0,1)),
  source_verification_state TEXT NOT NULL,
  temporal_verification_state TEXT NOT NULL,
  jurisdiction_verification_state TEXT NOT NULL,
  human_review_required INTEGER NOT NULL DEFAULT 0 CHECK (human_review_required IN (0,1)),
  required_gate_types_json TEXT NOT NULL DEFAULT '[]',
  specialist_agents_json TEXT NOT NULL DEFAULT '[]',
  implementation_requested INTEGER NOT NULL DEFAULT 0 CHECK (implementation_requested IN (0,1)),
  execution_authorization TEXT NOT NULL,
  legal_stress_test_state TEXT NOT NULL,
  adversarial_review_state TEXT NOT NULL,
  verification_state TEXT NOT NULL,
  outcome_state TEXT NOT NULL,
  release_state TEXT NOT NULL,
  provider_state TEXT NOT NULL,
  postflight_required INTEGER NOT NULL DEFAULT 0 CHECK (postflight_required IN (0,1)),
  first_pass_verification INTEGER CHECK (first_pass_verification IS NULL OR first_pass_verification IN (0,1)),
  verification_attempts INTEGER,
  correction_required INTEGER NOT NULL DEFAULT 0 CHECK (correction_required IN (0,1)),
  web_search_used INTEGER NOT NULL DEFAULT 0 CHECK (web_search_used IN (0,1)),
  official_web_source_count INTEGER NOT NULL DEFAULT 0,
  external_source_count INTEGER NOT NULL DEFAULT 0,
  article_context_count INTEGER NOT NULL DEFAULT 0,
  guide_context_count INTEGER NOT NULL DEFAULT 0,
  attachment_count INTEGER NOT NULL DEFAULT 0,
  provider_calls INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  elapsed_ms INTEGER NOT NULL CHECK (elapsed_ms >= 0),
  model TEXT,
  telemetry_schema_version TEXT NOT NULL DEFAULT '1.0',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lioe_runtime_runs_finished
ON lioe_runtime_runs(finished_at);

CREATE INDEX IF NOT EXISTS idx_lioe_runtime_runs_profile
ON lioe_runtime_runs(mission_profile, finished_at);

CREATE INDEX IF NOT EXISTS idx_lioe_runtime_runs_verification
ON lioe_runtime_runs(verification_state, finished_at);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('28', 'LIOE sanitised runtime telemetry for governed legal effectiveness and efficiency measurement');
