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
