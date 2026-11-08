import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const activation=fs.readFileSync(".github/workflows/case-law-evidence-gates-production-activation.yml","utf8");
const runtime=fs.readFileSync(".github/workflows/production-runtime-sync.yml","utf8");

test("case-law 0053 activation targets exact production D1 behind production Human Gate",()=>{
  assert.match(activation,/environment:\s*production/);
  assert.match(activation,/ai-advokat-db/);
  assert.match(activation,/12ece285-74bb-4f27-a025-2dbd1be6c59a/);
  assert.match(activation,/migrations\/0053_case_law_evidence_gates\.sql/);
  assert.match(activation,/--file migrations\/0053_case_law_evidence_gates\.sql/);
  assert.doesNotMatch(activation,/d1 migrations apply DB --remote/);
});

test("0053 activation verifies prerequisites and exact poststate",()=>{
  assert.match(activation,/"name": "case_law"/);
  assert.match(activation,/"name": "case_law_provenance"/);
  assert.match(activation,/"version": "53"/);
  assert.match(activation,/"name": "case_law_evidence_gates"/);
  assert.match(activation,/"name": "case_law_echr_comparison_gates"/);
  assert.match(activation,/idx_case_law_evidence_gate_state/);
  assert.match(activation,/idx_case_law_evidence_gate_temporal/);
  assert.match(activation,/idx_case_law_echr_gate_case/);
});

test("production runtime deploy is fail-closed until 0053 schema exists",()=>{
  const gate=runtime.indexOf("Require case-law evidence gate schema before runtime deploy");
  const deploy=runtime.indexOf("Deploy exact main Worker runtime and static assets");
  assert.ok(gate>0,"0053 pre-deploy gate missing");
  assert.ok(deploy>gate,"Worker deploy must occur after 0053 pre-deploy gate");
  const block=runtime.slice(gate,deploy);
  assert.match(block,/CAST\(version AS INTEGER\)=53/);
  assert.match(block,/String\(r\.version\)===\"53\"/);
  assert.match(block,/"name": "case_law_evidence_gates"/);
  assert.match(block,/"name": "case_law_echr_comparison_gates"/);
  assert.match(block,/set -euo pipefail/);
});

test("activation and runtime sync preserve separate Human Gates",()=>{
  assert.match(activation,/Worker deployment remains a separate production Human Gate/);
  assert.match(runtime,/environment:\s*production/);
});
