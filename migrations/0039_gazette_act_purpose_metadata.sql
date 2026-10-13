-- Gazette act purpose / subject metadata
-- Adds concise, source-grounded descriptors for what an act regulates and why it was adopted.
-- These fields are descriptive metadata only; they must not be populated by unsupported inference.

ALTER TABLE gazette_acts ADD COLUMN subject_matter TEXT;
ALTER TABLE gazette_acts ADD COLUMN adoption_purpose TEXT;
ALTER TABLE gazette_acts ADD COLUMN legal_problem_addressed TEXT;
ALTER TABLE gazette_acts ADD COLUMN affected_area TEXT;
ALTER TABLE gazette_acts ADD COLUMN purpose_source_basis TEXT;
ALTER TABLE gazette_acts ADD COLUMN purpose_review_status TEXT NOT NULL DEFAULT 'pending'
  CHECK(purpose_review_status IN ('pending','reviewed','approved'));
