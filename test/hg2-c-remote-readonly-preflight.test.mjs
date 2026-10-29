import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const source = fs.readFileSync("scripts/hg2-c-remote-readonly-preflight.mjs", "utf8");

test("HG2-C remote preflight is staging-only and explicitly gated", () => {
  assert.match(source, /HG2_C_REMOTE_READONLY_APPROVED/);
  assert.match(source, /HG2_C_TOKEN_R_NAME/);
  assert.match(source, /HG2_C_TOKEN_R_SCOPE_SUMMARY/);
  assert.ok(source.includes("D1 Read staging-only authority for account 0fee10e2bd9a2183d16eb0d73f13dfce; no production authority"));
  assert.doesNotMatch(source, /HG2_C_TOKEN_A_/);
  assert.match(source, /0fee10e2bd9a2183d16eb0d73f13dfce/);
  assert.match(source, /ai-advokat-staging-db/);
  assert.match(source, /309f72b8-8711-47fc-bea7-fbd1d649561d/);
  assert.doesNotMatch(source, /12ece285-74bb-4f27-a025-2dbd1be6c59a/);
});

test("HG2-C remote preflight contains only approved Wrangler read operations", () => {
  const allowed = [
    '["d1", "info"',
    '["d1", "migrations", "list"',
    '["d1", "time-travel", "info"'
  ];
  for (const fragment of allowed) assert.ok(source.includes(fragment), `missing allowed read op: ${fragment}`);

  const forbiddenCommandFragments = [
    '["d1", "migrations", "apply"',
    '["d1", "time-travel", "restore"',
    '["d1", "execute"',
    '["d1", "delete"',
    '["d1", "create"',
    '["deploy"',
    '"wrangler", "deploy"'
  ];
  for (const fragment of forbiddenCommandFragments) {
    assert.ok(!source.includes(fragment), `forbidden remote mutation capability found: ${fragment}`);
  }
});

test("HG2-C remote preflight never emits the token value", () => {
  assert.ok(!source.includes("console.log(process.env.CLOUDFLARE_API_TOKEN)"));
  assert.ok(!source.includes("console.error(process.env.CLOUDFLARE_API_TOKEN)"));
  assert.match(source, /No token value is emitted/);
});

test("HG2-C remote preflight accepts only the canonical Token R scope summary", () => {
  assert.match(source, /EXPECTED_TOKEN_R_SCOPE_SUMMARY/);
  assert.match(source, /must exactly match the approved staging-only D1 Read scope/);
  assert.doesNotMatch(source, /HG2_C_TOKEN_W_/);
});
