CREATE TABLE IF NOT EXISTS justice_daily_snapshots (
  snapshot_key TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  source_ok INTEGER NOT NULL DEFAULT 0,
  source_unavailable INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_justice_daily_snapshots_generated_at
  ON justice_daily_snapshots(generated_at);
