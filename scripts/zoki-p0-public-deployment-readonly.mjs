// Read-only deployment verification for the ZOKI external bot P0 patch.
// No private data, no legal documents, no AI/API POST and no provider consumption.
const origin=(process.env.AI_ADVOCAT_PUBLIC_BASE||"https://ai-advokat-github-io.aiadvokat16.workers.dev").replace(/\/$/,"");
const marker='name="ai-advokat-external-hotfix" content="P0-R29-readable-notice-20261117"';
const cssRef="/assets/zoki-conversation-contrast-r1.css";
const report={origin,checkedAt:new Date().toISOString(),state:"UNVERIFIED",checks:[]};
async function check(url,description,predicate){
  const r=await fetch(url,{cache:"no-store",headers:{"accept":"text/html, text/css;q=0.9, */*;q=0.1"}});
  const body=await r.text();
  const passed=r.ok&&predicate(body);
  report.checks.push({description,url,status:r.status,passed});
  return passed;
}
try{
  const a=await check(origin+"/bot/?p0-live-verify=20261117","public bot R29 deployment marker",s=>s.includes(marker)&&s.includes(cssRef));
  const b=await check(origin+cssRef+"?p0-live-verify=20261117","public contrast CSS available",s=>s.includes("--zoki-ink:#192b3b")&&s.includes('data-vnext-theme="dark"'));
  report.state=a&&b?"STATIC_DEPLOYMENT_PARITY_VERIFIED":"NOT_DEPLOYED_OR_SOURCE_MISMATCH";
  console.log(JSON.stringify(report,null,2));
  if(!(a&&b))process.exitCode=2;
}catch(e){
  report.state="UNREACHABLE_NOT_VERIFIED";
  report.error=String(e?.message||e);
  console.log(JSON.stringify(report,null,2));
  process.exitCode=3;
}
