// Governed scholarly literature helpers. Bibliographic metadata is secondary context, never current law.
export const SCHOLARLY_LITERATURE_VERSION="1.0.0";

const clean=v=>String(v||"").normalize("NFKC").replace(/\\s+/g," ").trim();
const norm=v=>clean(v).toLocaleLowerCase("mk");
function tokens(v){return [...new Set(norm(v).replace(/[^\\p{L}\\p{N}§-]+/gu," ").split(/\\s+/u).filter(x=>x.length>=3).slice(0,32))];}

export function flattenScholarlyRegistry(registry){
  const out=[];
  const journal=registry?.journal||{};
  for(const issue of (Array.isArray(journal.issues)?journal.issues:[])){
    for(const article of (Array.isArray(issue.articles)?issue.articles:[])){
      out.push(Object.freeze({
        id:(issue.id||("maclc-"+issue.year+"-v"+issue.volume+"-n"+issue.issue))+":"+clean(article.title),
        sourceType:"journal_article_metadata",collectionId:journal.id||"maclc",collectionTitle:journal.title_mk||journal.title_en||"",
        publisher:journal.publisher_mk||"",issn:journal.issn||null,year:issue.year||null,volume:issue.volume||null,issue:issue.issue||null,
        title:clean(article.title),authors:Object.freeze((article.authors||[]).map(clean).filter(Boolean)),
        themes:Object.freeze([...(issue.themes||[]),...(article.themes||[])].map(clean).filter(Boolean)),
        comparative:Boolean(article.comparative||article.comparative_jurisdiction),comparativeJurisdiction:article.comparative_jurisdiction||null,
        sourceUrl:journal.source_url||null,sourceSha256:issue.source_sha256||null,sourceState:issue.source_state||"metadata_only",
        peerReview:journal.peer_review||null,authorityRole:journal.authority_role||"scholarly_secondary_reference",
        legalAuthority:false,currentLawAuthority:false,fullTextAvailable:false,metadataOnly:true,humanGateRequired:true
      }));
    }
  }
  for(const manual of (Array.isArray(registry?.professional_practice)?registry.professional_practice:[])){
    out.push(Object.freeze({
      id:manual.id,sourceType:manual.type||"historical_professional_manual",collectionId:"professional_practice",collectionTitle:"Професионална практична литература",
      publisher:manual.publisher||"",year:Number(String(manual.publication_date||"").slice(0,4))||null,volume:null,issue:null,title:clean(manual.title),
      authors:Object.freeze((manual.authors||[]).map(clean).filter(Boolean)),themes:Object.freeze([...(manual.practice_use||[]),...(manual.chapters||[])].map(clean).filter(Boolean)),
      sourceUrl:null,sourceSha256:manual.source_sha256||null,sourceState:"supplied_fulltext_governed_metadata_only_runtime",
      authorityRole:manual.knowledge_role||"historical_professional_practice",legalAuthority:false,currentLawAuthority:false,
      currentLawMappingRequired:manual.current_law_mapping_required===true,fullTextAvailable:false,metadataOnly:true,warning:manual.warning||null,humanGateRequired:true
    }));
  }
  return Object.freeze(out);
}

function score(record,q){
  const query=norm(q); if(!query) return 0;
  const text=norm([record.title,...(record.authors||[]),...(record.themes||[]),record.year,record.volume,record.issue,record.sourceType,record.publisher].filter(Boolean).join(" "));
  let s=text.includes(query)&&query.length>=4?120:0;
  for(const token of tokens(query)){
    if(norm(record.title).includes(token)) s+=28;
    if((record.authors||[]).some(a=>norm(a).includes(token))) s+=12;
    if((record.themes||[]).some(t=>norm(t).includes(token))) s+=15;
    if(text.includes(token)) s+=5;
  }
  return s;
}

export function findScholarlyRecords(registry,q,{limit=6}={}){
  const max=Math.max(1,Math.min(12,Number(limit)||6));
  return Object.freeze(flattenScholarlyRegistry(registry).map(record=>({record,score:score(record,q)})).filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score||(Number(b.record.year||0)-Number(a.record.year||0))||a.record.title.localeCompare(b.record.title,"mk"))
    .slice(0,max).map(x=>Object.freeze({...x.record,relevanceScore:x.score})));
}

export function scholarlySearchItems(registry,q,{limit=8}={}){
  return findScholarlyRecords(registry,q,{limit}).map(record=>Object.freeze({
    type:"paper",id:record.id,title:record.title,
    meta:[record.authors?.join(", "),record.collectionTitle,record.year?String(record.year)+(record.volume?" · год. "+record.volume:"")+(record.issue?" · бр. "+record.issue:""):null].filter(Boolean).join(" · "),
    snippet:record.sourceType==="historical_professional_manual"?"Историски практичен прирачник. Методологијата е секундарен извор; старите членови и институции се мапираат кон важечкото право.":"Научна/стручна литература — секундарен извор. Важечкото право се проверува од примарни извори.",
    url:record.sourceUrl||null,jurisdiction:"MK",status:"verified",rawStatus:"metadata_only_secondary",date:record.year?String(record.year):null,
    authorityClass:record.authorityRole,legalAuthority:false
  })));
}

export function scholarlyPromptBlock(records,{maxChars=9000}={}){
  const list=Array.isArray(records)?records:[]; if(!list.length) return "";
  const blocks=list.map((r,i)=>[
    "["+(i+1)+"] "+clean(r.title),
    "TYPE: "+clean(r.sourceType),
    "AUTHORS: "+clean((r.authors||[]).join(", ")),
    "PUBLICATION: "+clean(r.collectionTitle||r.publisher||"")+" · YEAR="+clean(r.year||"unknown")+" · VOLUME="+clean(r.volume||"n/a")+" · ISSUE="+clean(r.issue||"n/a"),
    "AUTHORITY_ROLE: "+clean(r.authorityRole||"scholarly_secondary_reference")+"; LEGAL_AUTHORITY=false; CURRENT_LAW_AUTHORITY=false",
    "TEXT_STATUS: "+(r.metadataOnly?"metadata_or_contents_only_not_article_fulltext":"governed_secondary_text"),
    r.warning?"WARNING: "+clean(r.warning):null,r.sourceUrl?"SOURCE: "+clean(r.sourceUrl):null
  ].filter(Boolean).join("\\n")).join("\\n\\n---\\n\\n");
  return ["ROLE: SCHOLARLY/PROFESSIONAL SECONDARY CONTEXT ONLY.",
    "USE: doctrine, issue spotting, scholarly debate, comparative framing, historical professional method and citation discovery.",
    "DO NOT USE ALONE FOR: current law, article numbers, deadlines, mandatory procedural requirements, or binding case outcomes.",
    "METADATA RULE: when article full text is not present, state only what title/metadata supports; do not attribute substantive conclusions to the author.",
    "HISTORICAL RULE: old practice manuals may guide advocacy method, but statutory citations and institutions must be remapped to independently verified current law.","",blocks].join("\\n").slice(0,Math.max(1000,Number(maxChars)||9000));
}

export function scholarlyContextItems(records){
  return (Array.isArray(records)?records:[]).filter(r=>r?.sourceSha256).map(r=>({
    contextRole:"scholarly_secondary",
    source:r.collectionTitle||r.publisher||"Scholarly literature",
    locator:[
      r.year?String(r.year):null,
      r.volume?"год. "+r.volume:null,
      r.issue?"бр. "+r.issue:null,
      r.title
    ].filter(Boolean).join(" · "),
    version:r.year?String(r.year):"historical",
    provenance:{
      kind:"scholarly_literature",
      sourceIdentity:String(r.collectionId||r.publisher||"scholarly_collection"),
      authorityClass:String(r.authorityRole||"scholarly_secondary_reference"),
      locator:String(r.title||""),
      releaseRole:"secondary_only",
      humanReviewStatus:"reviewed",
      legalAuthority:false,
      currentLawClaim:false,
      recordId:String(r.id||""),
      title:String(r.title||""),
      publicationTitle:String(r.collectionTitle||r.publisher||"Scholarly literature"),
      publicationYear:String(r.year||"historical"),
      sourceState:String(r.sourceState||"metadata_only"),
      fingerprint:String(r.sourceSha256||"")
    },
    text:scholarlyPromptBlock([r],{maxChars:2600})
  }));
}
