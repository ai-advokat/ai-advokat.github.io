import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {legalDocumentExportBundle} from '../src/legal-document-export.js';
import {renderCaseExportDocxBytes} from '../src/case-export.js';
import {prepareMvpV2Integration} from './casepilot-integration.mjs';
import {
  PROFESSIONAL_DOCX_ENGINE_VERSION,
  PROFESSIONAL_DOCX_PROFILE,
  renderProfessionalLegalDocxBundle
} from '../src/professional-docx-engine.js';
import {
  MVP_V2_VERSION,
  PR_B_HEAD,
  PR_C_HEAD,
  mapMvpDossierToLegalAst,
  syntheticMvpV2Fixture,
  validateMvpDossier
} from './adapter.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const HOST='127.0.0.1';
const DEFAULT_PORT=4174;
const MAX_BODY=256*1024;

// MVP v2 deliberately owns the gate on the server. Client-supplied gate data is ignored.
export const SERVER_HUMAN_GATE=Object.freeze({status:'pending'});

function json(res,status,payload){
  const body=Buffer.from(JSON.stringify(payload,null,2));
  res.writeHead(status,{
    'content-type':'application/json; charset=utf-8',
    'content-length':body.length,
    'cache-control':'no-store',
    'x-content-type-options':'nosniff'
  });
  res.end(body);
}

async function readJson(req){
  let size=0; const chunks=[];
  for await (const chunk of req){
    size+=chunk.length;
    if(size>MAX_BODY){ const e=new Error('payload_too_large'); e.status=413; throw e; }
    chunks.push(chunk);
  }
  if(!chunks.length) return {};
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch{const e=new Error('invalid_json');e.status=400;throw e;}
}


export function groupProfessionalBlockersForReview(blockers=[]){
  const groups=new Map();
  for(const blocker of blockers){
    const objectId=String(blocker?.objectId||'unknown');
    const key=objectId;
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(blocker);
  }
  return Object.freeze([...groups.entries()].map(([objectId,items])=>{
    const codes=items.map(x=>String(x.code||'blocker'));
    const summaries=[...new Set(items.map(x=>String(x.summary||'').trim()).filter(Boolean))];
    return Object.freeze({
      heading:(items.length>1 ? 'grouped · ' : '')+objectId+(items.length>1 ? ` · ${items.length} checks` : ''),
      text:[
        ...codes.map(code=>'Check: '+code),
        ...summaries.map(summary=>'Reason: '+summary)
      ].join('\n'),
      status:'BLOCK'
    });
  }));
}

export function groupReviewAnnexForPresentation(report,blockers=[]){
  if(!report||typeof report!=='object') return report;
  const sections=(report.sections||[]).map(section=>{
    if(section.id!=='professional-blockers') return section;
    return Object.freeze({...section,items:groupProfessionalBlockersForReview(blockers)});
  });
  return Object.freeze({...report,sections:Object.freeze(sections)});
}

function workingBundleFromPayload(payload){
  const rawDossier=payload?.dossier && typeof payload.dossier==='object' ? payload.dossier : payload;
  const integration=prepareMvpV2Integration(rawDossier);
  const dossier=integration.dossier;
  const validation=validateMvpDossier(dossier);
  if(!validation.ok){
    const e=new Error('mvp_v2_required_fields_missing'); e.status=422; e.missing=[...validation.missing]; throw e;
  }
  const ast=mapMvpDossierToLegalAst(dossier,{generatedAt:new Date().toISOString()});
  // Deliberately ignore payload.humanGate / payload.serverHumanGate.
  const bundle=legalDocumentExportBundle(ast,{mode:'working',serverHumanGate:SERVER_HUMAN_GATE});
  return {dossier,ast,bundle,integration};
}

export function analyzeMvpV2Payload(payload){
  const {ast,bundle,integration}=workingBundleFromPayload(payload);
  return {
    ok:true,
    mvpVersion:MVP_V2_VERSION,
    prBHead:PR_B_HEAD,
    prCHead:PR_C_HEAD,
    prAHead:'95f666a795354681264f073060ebe9ed5817dfe5',
    mode:'working',
    humanGate:bundle.readiness.humanGate,
    professionalReady:bundle.readiness.professionalReady,
    blockers:bundle.readiness.blockers,
    ast,
    courtReport:bundle.courtReport,
    reviewAnnexReport:groupReviewAnnexForPresentation(bundle.reviewAnnexReport,bundle.readiness.blockers),
    docxProfile:PROFESSIONAL_DOCX_PROFILE,
    docxEngineVersion:PROFESSIONAL_DOCX_ENGINE_VERSION,
    domainRouting:integration.domainRouting,
    casePilot:{
      matterVersion:integration.casePilot.matterVersion,
      exportAdapterVersion:integration.casePilot.exportAdapterVersion,
      readiness:integration.casePilot.readiness,
      matter:integration.casePilot.matter,
      report:integration.casePilot.report
    }
  };
}

export function renderMvpV2WorkingDocx(payload,{review=false}={}){
  const {ast,bundle}=workingBundleFromPayload(payload);
  if(review){
    const grouped=groupReviewAnnexForPresentation(bundle.reviewAnnexReport,bundle.readiness.blockers);
    return renderCaseExportDocxBytes(grouped);
  }
  const result=renderProfessionalLegalDocxBundle(ast,{
    mode:'working',
    serverHumanGate:SERVER_HUMAN_GATE,
    subject:'Поништување одлука за отказ и враќање на работа',
    place:'[МЕСТО]',
    date:'[ДАТУМ]',
    signature:'[ПОТПИС]',
    pleadingHeading:'Т У Ж Б А'
  });
  return result.courtDocument;
}

export function attemptMvpV2ProfessionalDocx(payload){
  const {ast}=workingBundleFromPayload(payload);
  // This must fail closed while SERVER_HUMAN_GATE is pending and blockers are unresolved.
  return renderProfessionalLegalDocxBundle(ast,{
    mode:'professional',
    serverHumanGate:SERVER_HUMAN_GATE,
    subject:'Поништување одлука за отказ и враќање на работа'
  });
}

async function serveIndex(res){
  const body=await fs.readFile(path.join(HERE,'index.html'));
  res.writeHead(200,{
    'content-type':'text/html; charset=utf-8',
    'content-length':body.length,
    'cache-control':'no-store',
    'x-content-type-options':'nosniff'
  });
  res.end(body);
}

function docx(res,bytes,filename){
  const body=Buffer.from(bytes);
  res.writeHead(200,{
    'content-type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'content-disposition':`attachment; filename="${filename}"`,
    'content-length':body.length,
    'cache-control':'no-store',
    'x-content-type-options':'nosniff'
  });
  res.end(body);
}

export function createMvpV2Server(){
  return http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,`http://${HOST}`);
      if(req.method==='GET' && (url.pathname==='/'||url.pathname==='/index.html')) return serveIndex(res);
      if(req.method==='GET' && url.pathname==='/api/health'){
        return json(res,200,{ok:true,mvpVersion:MVP_V2_VERSION,prAHead:'95f666a795354681264f073060ebe9ed5817dfe5',prBHead:PR_B_HEAD,prCHead:PR_C_HEAD,mode:'working',serverHumanGate:'pending',production:false,providerCalls:false});
      }
      if(req.method==='GET' && url.pathname==='/api/fixture') return json(res,200,{ok:true,dossier:syntheticMvpV2Fixture()});
      if(req.method==='POST' && url.pathname==='/api/analyze'){
        const payload=await readJson(req); return json(res,200,analyzeMvpV2Payload(payload));
      }
      if(req.method==='POST' && url.pathname==='/api/docx'){
        const payload=await readJson(req); return docx(res,renderMvpV2WorkingDocx(payload),'AI_ADVOKAT4_MVP_V2_WORKING.docx');
      }
      if(req.method==='POST' && url.pathname==='/api/review-docx'){
        const payload=await readJson(req); return docx(res,renderMvpV2WorkingDocx(payload,{review:true}),'AI_ADVOKAT4_MVP_V2_REVIEW_ANNEX.docx');
      }
      if(req.method==='POST' && url.pathname==='/api/professional-docx'){
        const payload=await readJson(req);
        try{
          attemptMvpV2ProfessionalDocx(payload);
          return json(res,500,{ok:false,error:'professional_gate_unexpectedly_open'});
        }catch(error){
          if(String(error?.message||'').includes('professional_blocked')){
            return json(res,409,{ok:false,error:'professional_blocked',message:'PROFESSIONAL извозот е блокиран од server-side Human Gate и/или нерешени задолжителни blockers.'});
          }
          throw error;
        }
      }
      return json(res,404,{ok:false,error:'not_found'});
    }catch(error){
      const status=Number(error?.status)||500;
      return json(res,status,{ok:false,error:error?.code||error?.message||'server_error',missing:error?.missing||undefined});
    }
  });
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||DEFAULT_PORT);
  const server=createMvpV2Server();
  server.listen(port,HOST,()=>{
    console.log(`AI ADVOKAT 4 MVP v2: http://${HOST}:${port}/`);
    console.log('WORKING only · server-side Human Gate=PENDING · no provider/production calls');
  });
}
