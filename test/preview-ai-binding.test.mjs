import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const config=JSON.parse(fs.readFileSync("wrangler.jsonc","utf8"));
test("Cloudflare Preview has its own Workers AI binding and isolated D1 resource",()=>{
  assert.equal(config.ai?.binding,"AI","production binding");
  assert.equal(config.previews?.ai?.binding,"AI","missing AI in Preview was the direct source of 503 ui_translation_unavailable and voice_transcription_unavailable");
  assert.equal(config.previews?.d1_databases?.length,1);
  assert.equal(config.previews.d1_databases[0].binding,"DB");
  assert.notEqual(config.d1_databases[0].database_id,config.previews.d1_databases[0].database_id,"Preview must not use Production D1");
  assert.equal(config.previews.d1_databases[0].database_name,"ai-advokat-db-staging");
  assert.equal(config.assets?.binding,"ASSETS");
  assert.ok(!config.previews?.triggers,"Cron triggers must never be configured in Preview");
  assert.ok(!config.previews?.vars?.OPENAI_API_KEY,"No credentials are committed to preview variables");
  assert.ok(!config.previews?.vars?.RATE_LIMIT_SALT,"Rate-limit salt must be stored as a Cloudflare Preview secret, not committed to GitHub");
});


test("Worker Previews explicitly enable free bot models without inheriting production paid settings",()=>{
  const v=config.previews?.vars||{};
  assert.equal(v.FREE_CHAT_PROVIDER,"workers_ai","Preview vars are not inherited from production");
  assert.equal(v.WORKERS_AI_CHAT_MODEL,"@cf/openai/gpt-oss-120b");
  assert.equal(v.WORKERS_AI_EMPTY_FALLBACK_MODEL,"@cf/zai-org/glm-4.7-flash");
  assert.equal(v.EXTERNAL_BOT_TRAINING_OPEN,"true","external demo must be separately gated and visible");
  assert.ok(Number(v.EXTERNAL_BOT_TRAINING_MONTHLY_QUOTA)>0);
  assert.equal(v.OPENAI_ORCHESTRATOR_ENABLED,"false","no paid model in public Preview");
  assert.equal(v.OPENAI_PROVIDER_ACTIVATION_STATE,"preview_free_only");
  assert.equal(v.OPENAI_EXTERNAL_RESEARCH_TOOLS_ENABLED,"false");
  assert.equal(v.OPENAI_FILE_INPUT_ENABLED,"false");
  assert.equal(v.CASE_WORKSPACE_ENABLED,"false","Preview must not open confidential client tools");
  assert.equal(v.WORKERS_AI_MARKDOWN_ENABLED,"false");
  assert.equal(v.LIOE_RUNTIME_GOVERNANCE_ENABLED,"true");
  assert.equal(v.LIOE_POSTFLIGHT_ENABLED,"true");
  assert.equal(v.LIOE_RUNTIME_TELEMETRY_ENABLED,"true");
  assert.equal(v.LIOE_SPECIALIST_EXECUTION_ENABLED,"false","Preview must never execute autonomous paid specialists");
  for(const forbidden of ["OPENAI_API_KEY","RATE_LIMIT_SALT","TURNSTILE_SECRET","CLOUDFLARE_API_TOKEN"]){
    assert.equal(Object.hasOwn(v,forbidden),false,"never commit secrets: "+forbidden);
  }
});
