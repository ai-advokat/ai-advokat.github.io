import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const workflow=fs.readFileSync(".github/workflows/gazette-hybrid-production-activation.yml","utf8");
const request=JSON.parse(fs.readFileSync(".github/activation/gazette-hybrid-production-request.json","utf8"));
const worker=fs.readFileSync("src/index.js","utf8");
const portal=fs.readFileSync("sluzben-vesnik/index.html","utf8");

test("GP1 activation is explicit and data promotion stays locked",()=>{
  assert.equal(request.activation_authorized,true);
  assert.equal(request.data_promotion_authorized,false);
  assert.equal(request.migrations.length,8);
  assert.match(workflow,/production_schema_migration|Gazette production activation/);
});

test("GP2 production workflow applies only Gazette migration range",()=>{
  for(const n of ["0035_","0036_","0038_","0039_","0040_","0041_","0042_","0043_"]) assert.match(workflow,new RegExp(n));
  assert.match(workflow,/Unexpected pending migrations/);
  assert.match(workflow,/CATCH-UP MIGRATION INVARIANTS: PASS/);
  assert.match(workflow,/wrangler d1 migrations apply DB --remote/);
});

test("GP3 Worker exposes governed Gazette production APIs",()=>{
  assert.match(worker,/\/api\/gazette-hybrid-status/);
  assert.match(worker,/\/api\/gazette-chunks/);
  assert.match(worker,/runtimeRequiresHumanGate:true/);
  assert.match(worker,/currentLawFailClosed:true/);
});

test("GP4 public portal exposes hybrid runtime state",()=>{
  assert.match(portal,/HYBRID LEGAL INTELLIGENCE/);
  assert.match(portal,/gazette-hybrid-status/);
  assert.match(portal,/bot runtime/i);
});
