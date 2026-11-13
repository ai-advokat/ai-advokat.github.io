import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const pages=fs.readFileSync(".github/workflows/sync-pages-runtime.yml","utf8");
const freeUat=fs.readFileSync(".github/workflows/free-runtime-live-uat.yml","utf8");
const worker=fs.readFileSync("src/index.js","utf8");
const chat=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const home=fs.readFileSync("index.html","utf8");

test("Pages runtime sync follows every main release, not a fragile path subset",()=>{
  assert.match(pages,/push:\n\s+branches: \["main"\]\n\s+workflow_dispatch:/);
  assert.doesNotMatch(pages,/branches: \["main"\]\n\s+paths:/);
});

test("Hybrid Matter Command is included in Pages release packaging and parity",()=>{
  for(const token of [
    "hybrid-matter-command.html",
    "assets/hybrid-matter-command.js",
    "assets/hybrid-matter-command.css"
  ]) assert.match(pages,new RegExp(token.replaceAll(".","\\.")));
});

test("FREE live UAT distinguishes runtime policy from Macedonian release gate",()=>{
  assert.match(freeUat,/EXPECTED_FREE_POLICY="FREE_MK_CANONICAL_RELEASE_V12_EDITOR_ATTEMPT_CANONICAL_CLEAN_FALLBACK"/);
  assert.match(freeUat,/EXPECTED_RELEASE_GATE="FREE_MK_CANONICAL_RELEASE_V10_EDITOR_ATTEMPT_CANONICAL_CLEAN_FALLBACK"/);
  assert.match(freeUat,/caps\.macedonianReleaseGate===EXPECTED_RELEASE_GATE/);
  assert.doesNotMatch(freeUat,/caps\.macedonianReleaseGate===EXPECTED_FREE_POLICY/);
});

test("capacity outage uses the specific fictional public-false-information lawsuit fallback before generic draft",()=>{
  assert.match(worker,/deterministicFictionalPublicFalseInformationDraftFallback\(\{userText:q\}\)\s*\|\|\s*deterministicFormalDraftCapacityFallback/);
});

test("public chat exposes a bounded degraded mode instead of a vague controlled-state error",()=>{
  assert.match(chat,/providerCapacity\?\.state==="exhausted"/);
  assert.match(chat,/Provider capacity · DEGRADED MODE/);
  assert.match(chat,/Не е издаден AI правен одговор/);
});

test("home page does not claim unconditional LIVE provider availability",()=>{
  assert.doesNotMatch(home,/FREE Workers AI · @cf\/openai\/gpt-oss-120b · LIVE/);
  assert.match(home,/configured · availability checked per request/);
});


test("frontend handles the canonical Macedonian release error code",()=>{
  assert.match(chat,/\["macedonian_release_blocked","macedonian_language_release_blocked"\]\.includes\(d\?\.error\)/);
});

test("foreign-language translation fails closed to canonical MK without endless retry",()=>{
  assert.match(home,/let lang = siteLanguage==="en" \? "en" : "mk"/);
  assert.match(home,/translationState="unavailable"/);
  assert.match(home,/uiTranslationQueued=false/);
  assert.match(home,/ui_translation_atomic_commit_unavailable/);
  assert.doesNotMatch(home,/translationState="retrying";\s*console\.warn\("ui_translation_atomic_commit_deferred"/);
});
