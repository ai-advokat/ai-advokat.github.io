import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const smoke=fs.readFileSync(".github/workflows/professional-l0-resilience-live-smoke.yml","utf8");

test("Professional L0 resilience smoke uses the exact reported question and synthetic OFFICE membership",()=>{
  assert.match(smoke,/Што е закон и која е неговата улога во правниот систем на Република Северна Македонија\?/u);
  assert.match(smoke,/plan_code,status,billing_cycle,monthly_quota,seat_limit,price_mkd,expires_at/);
  assert.match(smoke,/VALUES \('\$ENT','\$ACCOUNT','office','active','manual',5,1,0/);
});

test("Professional L0 resilience smoke accepts only OpenAI success or governed Professional fallback",()=>{
  assert.match(smoke,/d\.provider==="openai"/);
  assert.match(smoke,/d\.provider==="workers_ai_free" \|\| d\.provider==="canonical_corpus_no_model"/);
  assert.match(smoke,/d\.providerFallback\?\.from!=="openai"/);
  assert.match(smoke,/PROFESSIONAL_L0_WORKERS_AI/);
  assert.match(smoke,/professional_workers_ai_fallback/);
  assert.match(smoke,/missionProfile!=="L0_INFORMATIONAL"/);
  assert.match(smoke,/d\.webSearchUsed!==false/);
});

test("Professional L0 resilience smoke always cleans its temporary production records",()=>{
  assert.match(smoke,/Cleanup ephemeral synthetic Professional membership/);
  assert.match(smoke,/if: always\(\)/);
  for(const table of [
    "membership_usage_monthly",
    "security_rate_limit_windows",
    "membership_access_keys",
    "membership_entitlements",
    "membership_accounts"
  ]) assert.match(smoke,new RegExp("DELETE FROM "+table));
  assert.match(smoke,/EPHEMERAL PROFESSIONAL L0 MEMBERSHIP: CLEANED/);
});
