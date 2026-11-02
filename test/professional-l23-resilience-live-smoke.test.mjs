import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const smoke=fs.readFileSync(".github/workflows/professional-l23-resilience-live-smoke.yml","utf8");

test("Professional L2-L3 live smoke uses the exact reported Zoki prompts",()=>{
  assert.match(smoke,/изработи ми тужба за развод на брак/u);
  assert.match(smoke,/Главен долг: 150\.000 денари\./u);
  assert.match(smoke,/Рок за плаќање според договорот: 15\.09\.2026 година\./u);
  assert.match(smoke,/Релевантна правна основа со проверени законски одредби\./u);
});

test("Professional L2-L3 live smoke requires synthetic OFFICE membership and cleanup",()=>{
  assert.match(smoke,/VALUES \('\$ENT','\$ACCOUNT','office','active','manual',5,1,0/);
  assert.match(smoke,/Cleanup ephemeral synthetic Professional membership/);
  assert.match(smoke,/if: always\(\)/);
  for(const table of [
    "membership_usage_monthly",
    "security_rate_limit_windows",
    "membership_access_keys",
    "membership_entitlements",
    "membership_accounts"
  ]) assert.match(smoke,new RegExp("DELETE FROM "+table));
});

test("Professional degraded smoke locks Human Gate and provider provenance",()=>{
  assert.match(smoke,/professional_degraded_draft_fallback/);
  assert.match(smoke,/PROFESSIONAL_DEGRADED_DRAFT_WORKERS_AI/);
  assert.match(smoke,/NOT_EXECUTED_PRIMARY_PROVIDER_UNAVAILABLE/);
  assert.match(smoke,/NO_GOVERNED_CURRENT_LAW_CONTEXT/);
  assert.match(smoke,/NOT_ESTABLISHED_NO_GOVERNED_CONTEXT/);
  assert.match(smoke,/professional_degraded_structure_only_workers_ai_fallback/);
  assert.match(smoke,/РАБОТЕН ШАБЛОН — ПРАВНАТА ОСНОВА НЕ Е ВЕРИФИКУВАНА/u);
  assert.match(smoke,/РАБОТЕН НАЦРТ — ВАЖЕЧКОТО ПРАВО НЕ Е ВЕРИФИКУВАНО/u);
  assert.match(smoke,/NO_EXTERNAL_ACTION/);
  assert.match(smoke,/RESEARCH_OUTPUT_ONLY/);
  assert.match(smoke,/ЧОВЕЧКА ПРОВЕРКА ПРЕД ПОДНЕСУВАЊЕ/u);
  assert.match(smoke,/ЧОВЕЧКА ПРОВЕРКА ПРЕД ПРОФЕСИОНАЛНА УПОТРЕБА/u);
  assert.match(smoke,/leaked an unverified numbered article/);
});
