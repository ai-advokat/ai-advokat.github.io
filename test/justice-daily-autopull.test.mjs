import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker=fs.readFileSync("src/index.js","utf8");
const wrangler=fs.readFileSync("wrangler.jsonc","utf8");
const migration=fs.readFileSync("migrations/0052_justice_daily_snapshots.sql","utf8");
const chat=fs.readFileSync("assets/ai-advokat-chat.js","utf8");

test("Justice Daily autonomous collection is scheduled every 30 minutes",()=>{
  assert.match(wrangler,/"crons"\s*:\s*\[\s*"\*\/30 \* \* \* \*"\s*\]/);
  assert.match(worker,/async scheduled\(controller, env, ctx\)/);
  assert.match(worker,/refreshJusticeDailySnapshot/);
  assert.match(worker,/event:"justice_daily_autopull"/);
});

test("Justice Daily stores one governed latest snapshot in D1",()=>{
  assert.match(migration,/CREATE TABLE IF NOT EXISTS justice_daily_snapshots/);
  assert.match(migration,/snapshot_key TEXT PRIMARY KEY/);
  assert.match(worker,/INSERT INTO justice_daily_snapshots/);
  assert.match(worker,/ON CONFLICT\(snapshot_key\) DO UPDATE/);
  assert.match(worker,/JUSTICE_DAILY_SNAPSHOT_KEY="latest"/);
});

test("Justice Daily serves a fresh snapshot and falls back to live source fetching",()=>{
  assert.match(worker,/JUSTICE_DAILY_SNAPSHOT_MAX_AGE_MS=90\*60\*1000/);
  assert.match(worker,/loadJusticeDailySnapshot\(env\)/);
  assert.match(worker,/snapshotServed:true/);
  assert.match(worker,/mode:"server_side_cron_snapshot"/);
  assert.match(worker,/fallback:"live_fetch_if_snapshot_missing_or_stale"/);
  assert.match(worker,/mode:"live_fetch_fallback"/);
});

test("Justice Daily UI makes server autopull and snapshot freshness visible",()=>{
  assert.match(chat,/server autopull на 30 минути/);
  assert.match(chat,/AUTOPULL ✓ snapshot/);
  assert.match(chat,/snapshotAgeSeconds/);
});
