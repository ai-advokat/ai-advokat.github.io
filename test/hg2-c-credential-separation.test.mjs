import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const strategy = fs.readFileSync("docs/HG2_C_CREDENTIAL_STRATEGY.md", "utf8");
const runbook = fs.readFileSync("docs/HG2_C_TOKEN_PROVISIONING_RUNBOOK.md", "utf8");
const preflight = fs.readFileSync("scripts/hg2-c-remote-readonly-preflight.mjs", "utf8");
const evidenceVerifier = fs.readFileSync("scripts/verify-hg2-c-remote-evidence.mjs", "utf8");

test("HG2-C credential architecture separates read, write and deploy authority", () => {
  assert.match(strategy, /Token R[\s\S]*D1 Read/);
  assert.match(strategy, /Token W[\s\S]*D1 Edit/);
  assert.match(strategy, /Token B[\s\S]*Editor/);
  assert.match(strategy, /Never combine Token R, Token W and Token B/);
});

test("remote preflight is bound to Token R and refuses write authority", () => {
  assert.match(preflight, /HG2_C_TOKEN_R_NAME/);
  assert.match(preflight, /HG2_C_TOKEN_R_SCOPE_SUMMARY/);
  assert.match(preflight, /D1\\s\+Read/);
  assert.match(preflight, /D1\\s\+\(Edit\|Write\)/);
  assert.doesNotMatch(preflight, /HG2_C_TOKEN_A_/);
  assert.doesNotMatch(preflight, /HG2_C_TOKEN_W_/);
});

test("remote evidence verifier requires D1 Read provenance and rejects write scope", () => {
  assert.match(evidenceVerifier, /token_r_name/);
  assert.match(evidenceVerifier, /token_r_scope_summary/);
  assert.match(evidenceVerifier, /D1\\s\+Read/);
  assert.match(evidenceVerifier, /D1\\s\+\(Edit\|Write\)/);
  assert.doesNotMatch(evidenceVerifier, /token_a_/);
});

test("provisioning runbook never upgrades the read token in place", () => {
  assert.match(runbook, /Token R must never be edited\/upgraded into Token W/);
  assert.match(runbook, /D1 Read only/);
  assert.match(runbook, /D1 Edit/);
  assert.match(runbook, /dedicated staging account/);
  assert.match(runbook, /never select all accounts/i);
});
