import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

test("CasePilot is exposed as a separate governed module",()=>{
  const hub=fs.readFileSync("casepilot/index.html","utf8");
  const manifest=JSON.parse(fs.readFileSync("data/casepilot-product-manifest.json","utf8"));
  assert.equal(manifest.module_id,"casepilot-secure-workspace");
  assert.equal(manifest.public_entry,"/casepilot/");
  assert.equal(manifest.private_workspace,"/casepilot-workspace.html");
  assert.equal(manifest.separation_policy.membership_required,true);
  assert.equal(manifest.separation_policy.plaintext_access_key_in_repository,false);
  assert.equal(manifest.separation_policy.human_gate_required,true);
  assert.equal(manifest.separation_policy.autonomous_filing,false);
  assert.match(hub,/CasePilot Secure Workspace/);
  assert.match(hub,/href="\/casepilot-workspace\.html"/);
  assert.match(hub,/href="\/membership\.html#request"/);
  assert.doesNotMatch(hub,/zoki_(?:test|case)_/i);
  assert.doesNotMatch(hub,/access_key_hash/i);
});
