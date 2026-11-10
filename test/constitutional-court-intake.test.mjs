import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {CONSTITUTIONAL_INDEX_URL,extractDecisionLinks,parseArgs} from "../scripts/collect-and-stage-mk-constitutional-decisions.mjs";

const workflow=fs.readFileSync(".github/workflows/constitutional-court-intake.yml","utf8");
const script=fs.readFileSync("scripts/collect-and-stage-mk-constitutional-decisions.mjs","utf8");

test("official Constitutional Court source is fixed to the public decisions/resolutions index",()=>{
  assert.match(CONSTITUTIONAL_INDEX_URL,/^https:\/\/ustavensud\.mk\/mk\//);
  assert.match(CONSTITUTIONAL_INDEX_URL,/%D0%BE%D0%B4%D0%BB%D1%83%D0%BA%D0%B8/);
});

test("decision discovery accepts case-number links and rejects navigation",()=>{
  const html='<a href="https://ustavensud.mk/2026/10/u-br-3-2026/">У.бр.3/2026</a><a href="/mk/odluki/">Одлуки</a>';
  const rows=extractDecisionLinks(html);
  assert.equal(rows.length,1);
  assert.equal(rows[0].title,"У.бр.3/2026");
});

test("intake is bounded and production fail-closed",()=>{
  assert.deepEqual(parseArgs(["--pages","999","--limit","9999"]),{pages:50,limit:500,execute:false,outDir:"work/mk-constitutional-court"});
  assert.match(script,/official_binding_verified:true/);
  assert.match(script,/current_law_applicability_verified:false/);
  assert.match(script,/holding_verified:false/);
  assert.match(script,/production_eligible:false/);
  assert.match(script,/human_gate_required:true/);
  assert.match(workflow,/permissions:\n  contents: read/);
  assert.match(workflow,/Verify fail-closed authority state/);
});
