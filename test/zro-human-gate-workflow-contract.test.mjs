import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const wf=fs.readFileSync(".github/workflows/zro-human-gate-review-packets.yml","utf8");

test("ZRO-WF1 legacy remote Human Gate builder is visibly HG2-C locked",()=>{
  assert.match(wf,/\[HG2-C LOCKED\]/);
  assert.match(wf,/workflow_dispatch:/);
  assert.doesNotMatch(wf,/branches:\s*\n\s*- main/);
  assert.match(wf,/exit 2/);
});

test("ZRO-WF2 locked workflow has no Cloudflare credential or remote D1 capability",()=>{
  assert.doesNotMatch(wf,/CLOUDFLARE_API_TOKEN/);
  assert.doesNotMatch(wf,/CLOUDFLARE_ACCOUNT_ID/);
  assert.doesNotMatch(wf,/secrets\./);
  assert.doesNotMatch(wf,/wrangler d1 execute/);
  assert.doesNotMatch(wf,/--remote/);
  assert.doesNotMatch(wf,/wrangler deploy/);
});

test("ZRO-WF3 locked workflow contains no migration application or SQL mutation",()=>{
  assert.doesNotMatch(wf,/migrations\s+apply/);
  assert.doesNotMatch(wf,/--file\s+migrations\//);
  assert.doesNotMatch(wf,/\b(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER)\b/i);
});

test("ZRO-WF4 offline Human Gate pack remains the governed pre-HG2-C evidence source",()=>{
  const p=JSON.parse(fs.readFileSync("ingest/mk/audits/zro-human-gate-pack-2026-10-12.json","utf8"));
  assert.equal(p.status,"HUMAN_GATE_PACK_READY_NOT_APPROVED");
  assert.equal(p.human_gate_approved,false);
  assert.equal(p.database_write_authorized,false);
  assert.equal(p.reconstruction.unique_changed_or_inserted_article_count,27);
});
