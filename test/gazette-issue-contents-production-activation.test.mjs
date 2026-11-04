import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const workflow=fs.readFileSync(".github/workflows/gazette-issue-contents-1991-2025-production-activation.yml","utf8");
const activation=JSON.parse(fs.readFileSync(".github/activation/gazette-issue-contents-1991-2025-production-request.json","utf8"));
const migration=fs.readFileSync("migrations/0051_gazette_issue_contents_index.sql","utf8");

test("GICA1 activation is exact-target, metadata-only and Human-Gate authorised",()=>{
  assert.equal(activation.activation_authorized,true);
  assert.equal(activation.decision_id,"AI_ADVOKAT_GAZETTE_ISSUE_CONTENTS_1991_2025_2026-11-01");
  assert.equal(activation.target.worker,"ai-advokat-github-io");
  assert.equal(activation.target.database_id,"12ece285-74bb-4f27-a025-2dbd1be6c59a");
  assert.equal(activation.scope.issue_by_issue_contents_index,true);
  assert.equal(activation.scope.fulltext_import,false);
  assert.equal(activation.scope.current_law_promotion,false);
  assert.equal(activation.governance.metadata_only,true);
  assert.equal(activation.governance.legal_text_authority,false);
  assert.equal(activation.governance.current_law_authority,false);
  assert.equal(activation.human_gate_required,true);
});

test("GICA2 activation harvests official registers and promotes only zero-unresolved reconciled years",()=>{
  assert.match(workflow,/gazette_backfill_wave1\.py/);
  assert.match(workflow,/--from-year 1991/);
  assert.match(workflow,/--to-year 2025/);
  assert.match(workflow,/gazette_issue_contents_index\.py/);
  assert.match(workflow,/2005,2010,2015/);
  assert.match(workflow,/verification_status/);
  assert.match(workflow,/reconciliation_status='reconciled'/);
});

test("GICA3 production smoke requires complete issue 1\/2005 contents with zero AI calls",()=>{
  assert.match(workflow,/gazette-issue-contents\?year=2005&issue=1/);
  assert.match(workflow,/canonical_gazette_issue_metadata_and_contents_no_model/);
  assert.match(workflow,/providerCalls/);
  assert.match(workflow,/Содржина на предметниот број/);
  assert.match(workflow,/Комплетност на регистарот: ДА/);
});

test("GICA4 schema keeps issue contents as register metadata, not legal text authority",()=>{
  assert.match(migration,/primary_official_chronological_register_metadata/);
  assert.match(migration,/human_review_status TEXT NOT NULL DEFAULT 'pending'/);
  assert.match(migration,/legal_text_authority INTEGER NOT NULL DEFAULT 0/);
  assert.match(migration,/current_law_authority INTEGER NOT NULL DEFAULT 0/);
});


test("GICA5 automatic main-push run is preflight-only and cannot mutate production",()=>{
  assert.match(workflow,/name: Gazette issue contents 1991-2025 preflight \/ production activation/);
  assert.match(workflow,/Build isolated 0051 migration scope and apply\n\s+if: github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow,/Load controlled staging tables\n\s+if: github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow,/Promote reconciled issue contents index\n\s+if: github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow,/Deploy current Worker runtime\n\s+if: github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow,/Live issue 1\/2005 contents and chat smoke\n\s+if: github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow,/GAZETTE ISSUE CONTENTS PREFLIGHT: BLOCKED_SAFE/);
  assert.match(workflow,/production_mutation=NO/);
});

test("GICA6 manual activation remains strict and fail-closed on unreconciled source data",()=>{
  assert.match(workflow,/if \[ "\$\{GITHUB_EVENT_NAME\}" = "workflow_dispatch" \]; then/);
  assert.match(workflow,/assert d\["content_rows"\]>0/);
  assert.match(workflow,/assert year in d\["eligible_years"\]/);
  assert.match(workflow,/no reconciled register years available for issue contents index/);
  assert.match(workflow,/Unexpected Gazette issue-contents preflight failure/);
});
