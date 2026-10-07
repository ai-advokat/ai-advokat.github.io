import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {isGateApproved} from "../scripts/human-gate-ledger-validator.mjs";

const requestPath=".github/activation/production-runtime-recovery-2026-10-07.json";
const raw=fs.readFileSync(requestPath);
const request=JSON.parse(raw);
const workflow=fs.readFileSync(".github/workflows/production-runtime-recovery.yml","utf8");
const ledger=JSON.parse(fs.readFileSync("data/human-gate-decision-ledger.json","utf8"));

const sha=crypto.createHash("sha256").update(raw).digest("hex");
const query={
  subject_id:"production-runtime-recovery-2026-10-07",
  artifact_version:"AI_ADVOKAT_PRODUCTION_RUNTIME_RECOVERY_2026-10-07",
  artifact_fingerprint:{activation_request_sha256:sha}
};

test("REC1 recovery request is exact, fingerprint-bound and provider-isolated",()=>{
  assert.equal(sha,"686e33e00b70c46985a76941f31c92afc0370aa5fbc0845ea7ccad659715f1dd");
  assert.equal(request.activation_authorized,true);
  assert.equal(request.recovery_version,"ai-advokat-production-recovery-1.0.0");
  assert.equal(request.target_runtime_version,"ai-advokat-lioe-runtime-1.0.0");
  assert.equal(request.production_database_id,"12ece285-74bb-4f27-a025-2dbd1be6c59a");
  assert.equal(request.provider_activation_authorized,false);
  assert.deepEqual(request.expected_pending_migrations,[
    "0024_zi_legacy_version_backfill.sql",
    "0025_zro_legacy_version_backfill.sql",
    "0026_zkp_legacy_version_backfill.sql",
    "0027_zpp_validity_window_correction.sql",
    "0028_lioe_runtime_telemetry.sql"
  ]);
});

test("REC2 Human Gate authorizes only merge, schema migration and runtime deploy",()=>{
  for(const gate of ["github_merge","production_schema_migration","production_runtime_deploy"]){
    assert.equal(isGateApproved(ledger.initial_records,{...query,gate_type:gate}),true,gate);
  }
  for(const gate of ["provider_activation","current_law_verification","corpus_promotion","rag_eligibility","production_corpus_write"]){
    assert.equal(isGateApproved(ledger.initial_records,{...query,gate_type:gate}),false,gate);
  }
});

test("REC3 workflow requires exact 0024-0028 pending set and migration-first recovery",()=>{
  assert.match(workflow,/Exact pending migration set 0024-0028: PASS/);
  for(const migration of request.expected_pending_migrations) assert.match(workflow,new RegExp(migration.replaceAll(".","\\.")));
  const preflight=workflow.indexOf("Read-only production corpus preflight");
  const apply=workflow.indexOf("Apply exact governed migrations 0024-0028");
  const deploy=workflow.indexOf("Deploy current production Worker");
  assert.ok(preflight>0 && apply>preflight && deploy>apply);
  assert.match(workflow,/Unexpected production migration state/);
});

test("REC4 workflow preserves article counts, blocks current-law promotion and verifies ZPP boundary",()=>{
  assert.match(workflow,/"zi_count": 258/);
  assert.match(workflow,/"zro_count": 298/);
  assert.match(workflow,/"zkp_count": 570/);
  assert.match(workflow,/"prohibited_current_promotions": 0/);
  assert.match(workflow,/"zpp_valid_to": "2027-01-18"/);
  assert.match(workflow,/"lioe_table_count": 1/);
});

test("REC5 workflow verifies existing provider, browser CORS and both general/legal live chat",()=>{
  assert.match(workflow,/OpenAI model access: PASS/);
  assert.match(workflow,/OpenAI paid quota: PASS/);
  assert.match(workflow,/Origin: https:\/\/ai-advokat\.github\.io/);
  assert.match(workflow,/access-control-allow-origin: https:\/\/ai-advokat\.github\.io/);
  assert.match(workflow,/LIVE GENERAL GPT CHAT: PASS/);
  assert.match(workflow,/LIVE LIOE LEGAL CHAT: PASS/);
  assert.match(workflow,/LIVE LIOE D1 READBACK: PASS/);
});

test("REC6 recovery evidence is non-secret and the workflow never prints the API key",()=>{
  assert.match(workflow,/Upload non-secret recovery evidence/);
  assert.doesNotMatch(workflow,/echo\s+["']?\$OPENAI_API_KEY/i);
  assert.doesNotMatch(workflow,/cat\s+.*OPENAI_API_KEY/i);
  assert.match(workflow,/printf '%s' "\$OPENAI_API_KEY" \| npx wrangler secret put OPENAI_API_KEY/);
});
