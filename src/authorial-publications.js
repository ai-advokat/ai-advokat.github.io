// Governed AI Advokat authorial-publication helpers.
// Authorial works are secondary research context only. They may establish
// bibliographic/publication facts and authorial framing, but never current law.

const BASE_URL="https://ai-advokat.github.io";

const clean=v=>String(v??"").normalize("NFKC").replace(/\s+/g," ").trim();
const norm=v=>clean(v).toLocaleLowerCase("mk");
const words=v=>[...new Set(norm(v).replace(/[^\p{L}\p{N}§-]+/gu," ").split(/\s+/u).filter(x=>x.length>=3).slice(0,40))];

function absoluteUrl(value){
  const v=clean(value);
  if(!v) return null;
  if(/^https?:\/\//i.test(v)) return v;
  if(v.startsWith("/")) return BASE_URL+v;
  return null;
}

function publicationState(status){
  return String(status||"").startsWith("published_") ? "published" : "registered";
}

function humanReviewStatus(status){
  return String(status||"").startsWith("published_") ? "approved" : "pending";
}

export function flattenAuthorialPublicationRegistry(registry){
  const author=registry?.author||{};
  const authorName=clean(author.name_mk||author.name_en||"Zoran Stojankich");
  return Object.freeze((Array.isArray(registry?.records)?registry.records:[]).map(raw=>Object.freeze({
    id:clean(raw.id),
    type:clean(raw.type),
    typeLabel:clean(raw.type_label_mk||raw.type),
    title:clean(raw.title_mk||raw.title_en),
    titleMk:clean(raw.title_mk),
    titleEn:clean(raw.title_en),
    subtitle:clean(raw.subtitle_mk),
    field:clean(raw.field_mk),
    keywords:Object.freeze((raw.keywords_mk||[]).map(clean).filter(Boolean)),
    languages:Object.freeze((raw.languages||[]).map(clean).filter(Boolean)),
    year:Number(raw.year)||null,
    publicationDate:clean(raw.publication_date||raw.year),
    version:clean(raw.version||raw.year),
    status:clean(raw.status),
    statusLabel:clean(raw.status_label_mk||raw.status),
    access:clean(raw.access),
    accessLabel:clean(raw.access_label_mk||raw.access),
    doi:clean(raw.doi),
    zenodoUrl:absoluteUrl(raw.zenodo_url),
    landingUrl:absoluteUrl(raw.landing_url),
    pdfUrl:absoluteUrl(raw.pdf_url),
    citation:clean(raw.citation),
    abstractMk:clean(raw.abstract_mk),
    abstractEn:clean(raw.abstract_en),
    authorName
  })));
}

function score(record,q){
  const query=norm(q);
  if(!query) return 0;
  const title=norm([record.titleMk,record.titleEn].filter(Boolean).join(" "));
  const keywordText=norm((record.keywords||[]).join(" "));
  const text=norm([
    record.titleMk,record.titleEn,record.subtitle,record.field,
    keywordText,record.authorName,record.doi,record.abstractMk,record.abstractEn
  ].filter(Boolean).join(" "));
  let s=text.includes(query)&&query.length>=4?160:0;
  for(const token of words(query)){
    if(title.includes(token)) s+=42;
    if(keywordText.includes(token)) s+=28;
    if(norm(record.field).includes(token)) s+=20;
    if(norm(record.subtitle).includes(token)) s+=16;
    if(norm(record.abstractMk).includes(token)||norm(record.abstractEn).includes(token)) s+=14;
    if(text.includes(token)) s+=4;
  }
  return s;
}

export function findAuthorialPublicationRecords(registry,q,{limit=6}={}){
  const max=Math.max(1,Math.min(12,Number(limit)||6));
  return Object.freeze(flattenAuthorialPublicationRegistry(registry)
    .map(record=>({record,score:score(record,q)}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score||(Number(b.record.year||0)-Number(a.record.year||0))||a.record.title.localeCompare(b.record.title,"mk"))
    .slice(0,max)
    .map(x=>Object.freeze({...x.record,relevanceScore:x.score})));
}

function promptBlock(record){
  const published=publicationState(record.status)==="published";
  const lines=[
    "ROLE: AUTHORIAL PUBLICATION SECONDARY CONTEXT ONLY.",
    "AUTHOR: "+record.authorName,
    "TITLE: "+record.title,
    record.subtitle ? "SUBTITLE: "+record.subtitle : null,
    record.field ? "FIELD: "+record.field : null,
    record.year ? "YEAR: "+record.year : null,
    record.version ? "VERSION: "+record.version : null,
    record.doi ? "DOI: "+record.doi : null,
    "PUBLICATION_STATE: "+publicationState(record.status),
    "STATUS: "+record.statusLabel,
    "ACCESS: "+record.access+" · "+record.accessLabel,
    record.abstractMk ? "ABSTRACT_MK: "+record.abstractMk : null,
    record.abstractEn ? "ABSTRACT_EN: "+record.abstractEn : null,
    record.keywords?.length ? "KEYWORDS: "+record.keywords.join("; ") : null,
    record.landingUrl ? "LANDING_PAGE: "+record.landingUrl : null,
    record.zenodoUrl ? "ZENODO: "+record.zenodoUrl : null,
    "LEGAL_AUTHORITY: false; CURRENT_LAW_AUTHORITY: false.",
    published
      ? "RULE: You may state bibliographic facts, the work's stated topic and any supplied abstract/keywords. Do not treat authorial analysis as law or as proof of facts in a concrete case."
      : "RULE: This is not a released publication. Mention only its registered status and metadata; do not present it as published or rely on it substantively.",
    record.access==="restricted"
      ? "RIGHTS RULE: Restricted full text is not supplied to the public chat. Do not reconstruct, quote or infer restricted content."
      : null,
    "CURRENT-LAW RULE: Any proposition about current law, deadlines, legal effect or binding authority requires an independently governed primary legal source and Human Gate."
  ].filter(Boolean);
  return lines.join("\n");
}

export function authorialPublicationContextItems(records){
  return (Array.isArray(records)?records:[])
    .filter(r=>r?.title && (r.doi||r.landingUrl||r.zenodoUrl))
    .map(r=>{
      const sourceUrl=r.doi ? "https://doi.org/"+r.doi : (r.landingUrl||r.zenodoUrl);
      return {
        contextRole:"authorial_publication_secondary",
        source:"AI Advokat authorial publication registry",
        locator:r.doi||r.landingUrl||r.id,
        version:r.version||String(r.year||"registered"),
        provenance:{
          kind:"authorial_publication",
          sourceIdentity:"AI Advokat · Zoran Stojankich publications",
          authorityClass:"authorial_secondary_reference",
          locator:r.doi||r.landingUrl||r.id,
          releaseRole:"secondary_only",
          humanReviewStatus:humanReviewStatus(r.status),
          legalAuthority:false,
          title:r.title,
          author:r.authorName,
          publicationState:publicationState(r.status),
          publicationDate:r.publicationDate||String(r.year||"registered"),
          sourceUrl,
          ...(r.doi?{persistentIdentifier:r.doi}:{}),
          currentLawClaim:false
        },
        text:promptBlock(r)
      };
    });
}

export function authorialPublicationSearchItems(registry,q,{limit=8}={}){
  return findAuthorialPublicationRecords(registry,q,{limit}).map(r=>Object.freeze({
    type:"paper",
    id:"authorial:"+r.id,
    title:r.title,
    meta:[r.authorName,r.typeLabel,r.year?String(r.year):null,r.doi?"DOI "+r.doi:null].filter(Boolean).join(" · "),
    snippet:[r.subtitle,r.abstractMk||r.abstractEn,r.field].filter(Boolean).join(" — ").slice(0,700),
    url:r.landingUrl||r.zenodoUrl||(r.doi?"https://doi.org/"+r.doi:null),
    jurisdiction:"MK",
    status:publicationState(r.status)==="published" ? "verified" : "pending",
    rawStatus:r.status,
    date:r.publicationDate||String(r.year||""),
    authorityClass:"authorial_secondary_reference",
    legalAuthority:false,
    access:r.access,
    doi:r.doi||null,
    relevanceScore:r.relevanceScore
  }));
}

export function authorialPublicationSources(records){
  return (Array.isArray(records)?records:[]).map(r=>({
    id:r.id,
    title:r.title,
    author:r.authorName,
    url:r.landingUrl||r.zenodoUrl||(r.doi?"https://doi.org/"+r.doi:null),
    doi:r.doi||null,
    publicationDate:r.publicationDate||null,
    status:r.status,
    access:r.access,
    authorityClass:"authorial_secondary_reference",
    legalAuthority:false
  }));
}
