import fs from "node:fs";

const path="uat/private-zoki-uat-scenarios.json";
const doc=JSON.parse(fs.readFileSync(path,"utf8"));
const fail=(m)=>{console.error("PRIVATE ZOKI UAT PACK FAIL:",m);process.exit(1);};

if(doc.schema!=="ai-advokat-private-zoki-uat/v1") fail("unexpected schema");
if(doc.product!=="AI ADVOKAT 4") fail("unexpected product");
if(doc.mode!=="PRIVATE PROFESSIONAL UAT") fail("unexpected mode");
if(doc.cycles_required!==2) fail("exactly two cycles are required");
if(doc.production_authorization!==false) fail("production authorization must remain false");
if(!Array.isArray(doc.scenarios)||doc.scenarios.length!==10) fail("exactly 10 scenarios are required");

const ids=new Set();
for(const s of doc.scenarios){
  if(!/^\d{2}_[a-z0-9_]+$/.test(s.id||"")) fail("invalid scenario id");
  if(ids.has(s.id)) fail("duplicate scenario id: "+s.id);
  ids.add(s.id);
  if(!Number.isInteger(s.expect_status)||s.expect_status<100||s.expect_status>599) fail("invalid expected status: "+s.id);
  if(!Array.isArray(s.assertions)||s.assertions.length===0) fail("missing assertions: "+s.id);
}
for(const required of ["05_formal_draft","06_macedonian_language","08_human_gate","09_confidential_case","10_anonymous_fail_closed"]){
  if(!ids.has(required)) fail("required safety scenario missing: "+required);
}

const text=fs.readFileSync(path,"utf8");
for(const forbidden of ["OPENAI_API_KEY","CLOUDFLARE_API_TOKEN","CLOUDFLARE_ACCOUNT_ID","secrets.","wrangler deploy","--remote"]){
  if(text.includes(forbidden)) fail("forbidden remote/secret capability in UAT manifest: "+forbidden);
}

console.log("PRIVATE ZOKI UAT PREPARATION PACK: PASS");
