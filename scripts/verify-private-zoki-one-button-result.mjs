import fs from "node:fs";

const path="artifacts/private-zoki-one-button-uat-evidence.json";
if(!fs.existsSync(path)){
  console.error("FINAL UAT GATE FAIL: evidence file missing");
  process.exit(1);
}
const evidence=JSON.parse(fs.readFileSync(path,"utf8"));
if(evidence?.productionTouched!==false){
  console.error("FINAL UAT GATE FAIL: productionTouched must remain false");
  process.exit(1);
}
if(evidence?.finalStatus!=="PASS_CLEANUP_VERIFIED"){
  console.error("FINAL UAT GATE FAIL:",evidence?.finalStatus||"unknown");
  process.exit(1);
}
if(evidence?.uat?.passed!==true || Number(evidence?.uat?.totalPassed||0)!==20){
  console.error("FINAL UAT GATE FAIL: UAT is not 20/20");
  process.exit(1);
}
if(evidence?.cleanup?.errors?.length){
  console.error("FINAL UAT GATE FAIL: cleanup errors remain");
  process.exit(1);
}
console.log("AI ADVOKAT 4 — PRIVATE PROFESSIONAL UAT: PASS · 20/20 · CLEANUP VERIFIED");
