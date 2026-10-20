#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {extractLinks,normalizeOfficialUrl} from "./download-mk-supreme-decisions.mjs";

const USER_AGENT="AIAdvokatResearchBot/1.0 (+https://ai-advokat.github.io/)";
const MAX_BYTES=2*1024*1024;

function sha256(buf){
  return crypto.createHash("sha256").update(buf).digest("hex");
}
function stripHtml(html){
  return String(html)
    .replace(/<script\b[\s\S]*?<\/script>/giu," ")
    .replace(/<style\b[\s\S]*?<\/style>/giu," ")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'")
    .replace(/\s+/g," ")
    .trim();
}
async function fetchBounded(url){
  const normalized=normalizeOfficialUrl(url);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),30000);
  try{
    const response=await fetch(normalized.href,{
      headers:{"user-agent":USER_AGENT,"accept":"text/html,text/plain,*/*;q=0.5"},
      redirect:"manual",
      signal:controller.signal
    });
    if([301,302,303,307,308].includes(response.status)){
      const loc=response.headers.get("location");
      if(!loc) throw new Error("redirect_without_location");
      return fetchBounded(new URL(loc,normalized).href);
    }
    const declared=Number(response.headers.get("content-length"));
    if(Number.isFinite(declared)&&declared>MAX_BYTES) throw new Error("policy_evidence_too_large");
    const buf=Buffer.from(await response.arrayBuffer());
    if(buf.length>MAX_BYTES) throw new Error("policy_evidence_too_large");
    return {
      url:normalizeOfficialUrl(response.url||normalized.href).href,
      status:response.status,
      ok:response.ok,
      contentType:response.headers.get("content-type")||null,
      bytes:buf.length,
      sha256:sha256(buf),
      body:buf
    };
  }finally{
    clearTimeout(timer);
  }
}

function policyLike(link){
  const hay=(String(link.label||"")+" "+String(link.url||"")).toLocaleLowerCase("mk");
  return /(авторски|copyright|услови|terms|користење|policy|политика|правила)/iu.test(hay);
}

export async function captureSupremeRightsEvidence({outDir=null}={}){
  const stamp=new Date().toISOString().slice(0,10);
  const target=outDir||path.join("work","mk-supreme-rights",stamp);
  fs.mkdirSync(target,{recursive:true});

  const homepage=await fetchBounded("https://www.vrhoven.sud.mk/");
  if(!homepage.ok) throw new Error("supreme_homepage_http_"+homepage.status);
  const html=homepage.body.toString("utf8");
  const links=extractLinks(html,homepage.url).filter(policyLike);

  let robots;
  try{
    robots=await fetchBounded("https://www.vrhoven.sud.mk/robots.txt");
  }catch(error){
    robots={url:"https://www.vrhoven.sud.mk/robots.txt",status:null,ok:false,error:String(error?.message||error)};
  }

  const policyPages=[];
  for(const link of links.slice(0,10)){
    try{
      const page=await fetchBounded(link.url);
      policyPages.push({
        label:link.label||null,
        url:page.url,
        status:page.status,
        content_type:page.contentType,
        bytes:page.bytes,
        sha256:page.sha256,
        text_excerpt:stripHtml(page.body.toString("utf8")).slice(0,8000)
      });
    }catch(error){
      policyPages.push({label:link.label||null,url:link.url,error:String(error?.message||error)});
    }
  }

  const evidence={
    schema_version:"1.0",
    source_id:"mk-supreme-court",
    captured_at:new Date().toISOString(),
    user_agent:USER_AGENT,
    homepage:{
      url:homepage.url,
      status:homepage.status,
      content_type:homepage.contentType,
      bytes:homepage.bytes,
      sha256:homepage.sha256
    },
    robots:robots.body?{
      url:robots.url,
      status:robots.status,
      content_type:robots.contentType,
      bytes:robots.bytes,
      sha256:robots.sha256,
      text:robots.body.toString("utf8").slice(0,100000)
    }:robots,
    policy_pages:policyPages,
    human_review_required:true,
    automatic_rights_approval:false,
    note:"Evidence capture only. A human reviewer must decide whether bounded automated retrieval is permitted and complete data/mk-supreme-rights-review.json. Missing or ambiguous terms remain fail-closed."
  };
  fs.writeFileSync(path.join(target,"policy-evidence.json"),JSON.stringify(evidence,null,2)+"\n");
  return {outDir:target,evidence};
}

if(import.meta.url==="file://"+process.argv[1]){
  try{
    const outArg=process.argv.indexOf("--out");
    const outDir=outArg>=0?process.argv[outArg+1]:null;
    const result=await captureSupremeRightsEvidence({outDir});
    console.log(JSON.stringify({
      ok:true,
      outDir:result.outDir,
      policyPages:result.evidence.policy_pages.length,
      humanReviewRequired:true,
      automaticRightsApproval:false
    },null,2));
  }catch(error){
    console.error(JSON.stringify({ok:false,error:String(error?.message||error)},null,2));
    process.exit(1);
  }
}
