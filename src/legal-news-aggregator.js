// AI Advokat · Justice Daily
// Read-only aggregator for official public justice-sector sources.
// News discovery is not a legal conclusion and never bypasses source verification or Human Gate.

export const LEGAL_NEWS_AGGREGATOR_VERSION="AI_ADVOCAT_JUSTICE_DAILY_V1";

const JUSTICE_KEYWORDS=[
  "суд","судиј","судск","правосуд","правда","обвинител","обвинителств","јавно обвинителство",
  "кривич","граѓанск","управен","устав","уставн","пресуда","решение","одлука","предмет",
  "закон","предлог-закон","правилник","деловник","извршител","нотари","медијац","адвокат",
  "правна помош","судски совет","јавни обвинители","академија за судии","владеење на правото",
  "човекови права","европски суд","ЕСЧП","ЕСПЧ","реформа на правосуд","правосуден"
];

const BOILERPLATE=new Set([
  "почетна","повеќе","прочитај повеќе","open link here","read more","контакт","contact","menu",
  "вести","новости","соопштенија","одлуки","решенија","закони","документи","извештаи","огласи",
  "mk","en","sq","facebook","youtube","instagram","linkedin","x","twitter"
]);

export const LEGAL_NEWS_SOURCES=Object.freeze([
  {
    id:"assembly",
    institution:"assembly",
    title:"Собрание на Република Северна Македонија",
    layer:"core",
    authorityClass:"official_legislature",
    relevance:"justice_filtered",
    urls:["https://www.sobranie.mk/"],
    articleHosts:["www.sobranie.mk","sobranie.mk"],
    sourceRole:"legislation_and_parliamentary_procedure",
    boundary:"Собраниска објава може да потврди парламентарна активност, но предлог, амандман или гласање не се изедначува со важечко право без Службен весник и temporal verification."
  },
  {
    id:"constitutional-court",
    institution:"constitutional_court",
    title:"Уставен суд на Република Северна Македонија",
    layer:"core",
    authorityClass:"official_constitutional_court",
    relevance:"all",
    urls:["https://ustavensud.mk/mk/soopshtenija/","https://ustavensud.mk/mk/odluki-i-reshenija/","https://ustavensud.mk/"],
    articleHosts:["ustavensud.mk","www.ustavensud.mk"],
    sourceRole:"constitutional_review_and_decisions",
    boundary:"Соопштение и дневен ред не се заменски текст за диспозитивот на одлуката. За правно дејство се проверува конкретната одлука/решение."
  },
  {
    id:"supreme-court",
    institution:"supreme_court",
    title:"Врховен суд на Република Северна Македонија",
    layer:"core",
    authorityClass:"official_supreme_court",
    relevance:"all",
    urls:[
      "https://sud.mk/wps/portal/vsrm/sud/vesti/",
      "https://www.vrhoven.sud.mk/",
      "https://www.vsrm.mk/wps/portal/vsrm/sud/vesti/"
    ],
    articleHosts:["sud.mk","www.sud.mk","vrhoven.sud.mk","www.vrhoven.sud.mk","vsrm.mk","www.vsrm.mk"],
    sourceRole:"highest_domestic_court_updates",
    boundary:"Наслов/вест од Врховниот суд е discovery; авторитет за конкретен предмет бара точен предмет, одлука, датум и текст."
  },
  {
    id:"judicial-council",
    institution:"judicial_council",
    title:"Судски совет на Република Северна Македонија",
    layer:"core",
    authorityClass:"official_judicial_council",
    relevance:"all",
    urls:["https://sud.mk/wps/portal/ssrm/sud/vesti/","https://www.ssrm.mk/"],
    articleHosts:["sud.mk","www.sud.mk","ssrm.mk","www.ssrm.mk"],
    sourceRole:"judicial_governance_appointments_and_sessions",
    boundary:"Соопштение за седница/постапка не е конечна одлука освен ако изворот јасно го објавува конечниот акт."
  },
  {
    id:"public-prosecution",
    institution:"public_prosecution",
    title:"Јавно обвинителство на Република Северна Македонија",
    layer:"core",
    authorityClass:"official_public_prosecution",
    relevance:"all",
    urls:["https://jorm.gov.mk/"],
    articleHosts:["jorm.gov.mk","www.jorm.gov.mk"],
    sourceRole:"prosecution_announcements",
    boundary:"Обвинителско соопштение може да опишува сомнение, истрага или обвинение; не е утврдување вина."
  },
  {
    id:"prosecutors-council",
    institution:"prosecutors_council",
    title:"Совет на јавните обвинители на Република Северна Македонија",
    layer:"core",
    authorityClass:"official_prosecutors_council",
    relevance:"all",
    urls:[
      "https://sjorm.gov.mk/category/odnosi-so-%D1%98avnost/soopshteni%D1%98a/",
      "https://sjorm.gov.mk/"
    ],
    articleHosts:["sjorm.gov.mk","www.sjorm.gov.mk"],
    sourceRole:"prosecutorial_governance_appointments_and_sessions",
    boundary:"Кандидатска листа, дневен ред или соопштение не е конечна кадровска/дисциплинска одлука без конкретен акт."
  },
  {
    id:"ministry-justice",
    institution:"ministry_justice",
    title:"Министерство за правда",
    layer:"core",
    authorityClass:"official_ministry",
    relevance:"justice_filtered",
    urls:["https://www.pravda.gov.mk/"],
    articleHosts:["pravda.gov.mk","www.pravda.gov.mk","portal.mdt.gov.mk"],
    sourceRole:"justice_policy_legislation_and_reform",
    boundary:"Министерска најава, работна група или предлог не е важечко право; се проверуваат ЕНЕР, Собрание и Службен весник."
  },
  {
    id:"judicial-academy",
    institution:"judicial_academy",
    title:"Академија за судии и јавни обвинители",
    layer:"core",
    authorityClass:"official_judicial_training_institution",
    relevance:"all",
    urls:["https://jpacademy.gov.mk/category/novosti/","https://jpacademy.gov.mk/"],
    articleHosts:["jpacademy.gov.mk","www.jpacademy.gov.mk"],
    sourceRole:"judicial_training_and_professional_development",
    boundary:"Обуките и стручните настани се институционални новости, не правен извор за исход на конкретен предмет."
  },
  {
    id:"court-portal",
    institution:"court_portal",
    title:"Судски портал на Република Северна Македонија",
    layer:"extended",
    authorityClass:"official_court_portal",
    relevance:"all",
    urls:["https://sud.mk/"],
    articleHosts:["sud.mk","www.sud.mk"],
    sourceRole:"court_network_updates",
    boundary:"Порталска вест е discovery. За судска одлука се бара точен суд, предмет, датум и авторитативен текст."
  },
  {
    id:"official-gazette",
    institution:"official_gazette",
    title:"Службен весник на Република Северна Македонија",
    layer:"extended",
    authorityClass:"official_gazette",
    relevance:"justice_filtered",
    urls:["https://slvesnik.com.mk/"],
    articleHosts:["slvesnik.com.mk","www.slvesnik.com.mk"],
    sourceRole:"official_publication_watch",
    boundary:"Само точниот број/датум и текст на објавениот акт може да поддржи тврдење за официјално објавување; стапување во сила и примена се проверуваат одделно."
  },
  {
    id:"ener",
    institution:"ener",
    title:"ЕНЕР",
    layer:"extended",
    authorityClass:"official_regulatory_consultation_portal",
    relevance:"justice_filtered",
    urls:["https://ener.gov.mk/"],
    articleHosts:["ener.gov.mk","www.ener.gov.mk"],
    sourceRole:"draft_legislation_and_consultation_watch",
    boundary:"ЕНЕР содржи предлози и консултации. Предлог не е донесен закон."
  },
  {
    id:"state-audit-justice",
    institution:"state_audit",
    title:"Државен завод за ревизија · Правосудство",
    layer:"extended",
    authorityClass:"official_state_audit",
    relevance:"all",
    urls:["https://dzr.mk/mk/revizii/pravda-politicki-partii/oblast-pravosudstvo"],
    articleHosts:["dzr.mk","www.dzr.mk"],
    sourceRole:"justice_sector_audit_watch",
    boundary:"Ревизорски наод е официјален ревизорски наод, не кривична пресуда и не автоматски доказ за индивидуална вина."
  },
  {
    id:"anti-corruption",
    institution:"anti_corruption",
    title:"Државна комисија за спречување на корупцијата",
    layer:"extended",
    authorityClass:"official_anti_corruption_body",
    relevance:"justice_filtered",
    urls:["https://dksk.mk/"],
    articleHosts:["dksk.mk","www.dksk.mk"],
    sourceRole:"anti_corruption_and_integrity_watch",
    boundary:"Постапка, иницијатива или наод на ДКСК мора да се пренесе со точниот институционален статус и не се претвора автоматски во кривична одговорност."
  }
]);

function text(value){return String(value??"");}

function decodeHtml(value){
  return text(value)
    .replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/&#(d+);/g,(_,n)=>String.fromCodePoint(Number(n)||32))
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)||32));
}

function stripTags(value){
  return decodeHtml(text(value).replace(/<script\b[\s\S]*?<\/script>/gi," ").replace(/<style\b[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," "));
}

function cleanText(value){
  return stripTags(value).replace(/\s+/g," ").trim();
}

function canonicalUrl(value){
  try{
    const u=new URL(value);
    u.hash="";
    for(const key of [...u.searchParams.keys()]){
      if(/^utm_/i.test(key)||["fbclid","gclid","mc_cid","mc_eid"].includes(key)) u.searchParams.delete(key);
    }
    return u.toString();
  }catch{return null;}
}

function safeAbsoluteUrl(href,base){
  try{
    const raw=decodeHtml(href).trim();
    if(!raw||raw.startsWith("#")||/^(mailto:|tel:|javascript:|data:)/i.test(raw)) return null;
    const u=new URL(raw,base);
    if(!/^https?:$/.test(u.protocol)) return null;
    return canonicalUrl(u.toString());
  }catch{return null;}
}

function allowedArticleUrl(source,url){
  try{
    const host=new URL(url).hostname.toLowerCase();
    return source.articleHosts.some(x=>host===String(x).toLowerCase());
  }catch{return false;}
}

function normaliseTitle(value){
  return cleanText(value)
    .replace(/^[\s\-–—|:•·]+|[\s\-–—|:•·]+$/g,"")
    .replace(/\s+/g," ")
    .trim();
}

function titleKey(value){
  return normaliseTitle(value)
    .toLocaleLowerCase("mk")
    .normalize("NFKD")
    .replace(/[\p{P}\p{S}\s]+/gu,"")
    .slice(0,240);
}

function isBoilerplateTitle(title){
  const t=normaliseTitle(title);
  if(t.length<14||t.length>320) return true;
  const low=t.toLocaleLowerCase("mk");
  if(BOILERPLATE.has(low)) return true;
  if(/^(почетна|home|menu|search|пребарај|следно|претходно|page \d+)$/i.test(low)) return true;
  if(/^(facebook|youtube|instagram|linkedin|twitter|x)\b/i.test(low)) return true;
  return false;
}

function hasJusticeKeyword(title){
  const low=normaliseTitle(title).toLocaleLowerCase("mk");
  return JUSTICE_KEYWORDS.some(k=>low.includes(k.toLocaleLowerCase("mk")));
}

export function classifyLegalNewsType(title,sourceId=""){
  const low=(normaliseTitle(title)+" "+sourceId).toLocaleLowerCase("mk");
  if(/у\.бр|одлук|решени|пресуд|предмет|укинува|поништува|не се поведува|се поведува/.test(low)) return "decision";
  if(/седниц|дневен ред|закажан|одржан.*седниц|записник/.test(low)) return "session";
  if(/предлог.?закон|закон|амандман|правилник|деловник|уредба|службен весник|енер/.test(low)) return "legislation";
  if(/обвинител|истраг|осомнич|обвинени|кривич|претрес|предистраж/.test(low)) return "prosecution";
  if(/избор|именува|разреш|кандидат|оглас|интервју/.test(low)) return "appointments";
  if(/ревизи|реформа|стратеги|акциски план|извештај|владеење на правото/.test(low)) return "reform";
  if(/обука|академи|семинар|работилниц|тркалезна маса/.test(low)) return "training";
  return "institutional_update";
}

const MONTHS=Object.freeze({
  "јануари":1,"февруари":2,"март":3,"април":4,"мај":5,"јуни":6,
  "јули":7,"август":8,"септември":9,"октомври":10,"ноември":11,"декември":12,
  "january":1,"february":2,"march":3,"april":4,"may":5,"june":6,
  "july":7,"august":8,"september":9,"october":10,"november":11,"december":12
});

function validIsoDate(y,m,d){
  const yy=Number(y),mm=Number(m),dd=Number(d);
  if(yy<2000||yy>2100||mm<1||mm>12||dd<1||dd>31) return null;
  const dt=new Date(Date.UTC(yy,mm-1,dd));
  if(dt.getUTCFullYear()!==yy||dt.getUTCMonth()!==mm-1||dt.getUTCDate()!==dd) return null;
  return dt.toISOString().slice(0,10);
}

export function parsePublishedDate(value){
  const s=cleanText(value).toLocaleLowerCase("mk");
  let m=s.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if(m) return validIsoDate(m[1],m[2],m[3]);
  m=s.match(/\b(0?[1-9]|[12]\d|3[01])[./-](0?[1-9]|1[0-2])[./-](20\d{2})\b/);
  if(m) return validIsoDate(m[3],m[2],m[1]);
  m=s.match(/\b(0?[1-9]|[12]\d|3[01])\s+([\p{L}]+)\s*,?\s*(20\d{2})\b/u);
  if(m){
    const month=MONTHS[m[2]];
    if(month) return validIsoDate(m[3],month,m[1]);
  }
  return null;
}

function relevanceScore(source,title){
  if(isBoilerplateTitle(title)) return -100;
  let score=source.relevance==="all"?4:0;
  if(hasJusticeKeyword(title)) score+=5;
  const low=normaliseTitle(title).toLocaleLowerCase("mk");
  if(/одлук|решени|пресуд|седниц|закон|обвинител|суд|правосуд|устав/.test(low)) score+=2;
  return score;
}

export function extractLegalNewsItems(source,html,{now=new Date()}={}){
  const raw=text(html);
  const items=[];
  const anchorRe=/<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while((match=anchorRe.exec(raw))){
    const href=safeAbsoluteUrl(match[2],source.urls[0]);
    if(!href||!allowedArticleUrl(source,href)) continue;
    const title=normaliseTitle(match[4]);
    const score=relevanceScore(source,title);
    if(score<4) continue;
    const around=raw.slice(Math.max(0,(match.index||0)-260),Math.min(raw.length,anchorRe.lastIndex+260));
    const publishedDate=parsePublishedDate(around)||parsePublishedDate(match[1]+" "+match[3]);
    items.push({
      id:source.id+":"+titleKey(title).slice(0,80),
      sourceId:source.id,
      institution:source.institution,
      institutionTitle:source.title,
      sourceRole:source.sourceRole,
      authorityClass:source.authorityClass,
      layer:source.layer,
      title,
      url:href,
      publishedDate,
      discoveredAt:new Date(now).toISOString(),
      type:classifyLegalNewsType(title,source.id),
      relevanceScore:score,
      legalEffectVerified:false,
      humanGateRequired:true,
      claimBoundary:source.boundary
    });
  }

  const byKey=new Map();
  for(const item of items){
    const key=item.url+"|"+titleKey(item.title);
    const prior=byKey.get(key);
    if(!prior||Number(item.relevanceScore)>Number(prior.relevanceScore)) byKey.set(key,item);
  }
  return [...byKey.values()].sort((a,b)=>{
    const da=a.publishedDate||"0000-00-00",db=b.publishedDate||"0000-00-00";
    return db.localeCompare(da)||b.relevanceScore-a.relevanceScore||a.title.localeCompare(b.title,"mk");
  });
}

export function legalNewsSourceDirectory(){
  return LEGAL_NEWS_SOURCES.map(s=>({
    id:s.id,
    institution:s.institution,
    title:s.title,
    layer:s.layer,
    authorityClass:s.authorityClass,
    sourceRole:s.sourceRole,
    urls:[...s.urls],
    boundary:s.boundary
  }));
}

function clampInt(value,min,max,fallback){
  const n=Number(value);
  if(!Number.isFinite(n)) return fallback;
  return Math.max(min,Math.min(max,Math.trunc(n)));
}

async function fetchOneSource(source,fetchImpl,now){
  const errors=[];
  for(const url of source.urls){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort("timeout"),4500);
    try{
      const response=await fetchImpl(url,{
        method:"GET",
        redirect:"follow",
        signal:controller.signal,
        headers:{
          "accept":"text/html,application/xhtml+xml;q=0.9,*/*;q=0.2",
          "user-agent":"AI-Advokat-Justice-Daily/1.0 (+official-source-read-only)"
        },
        cf:{cacheTtl:300,cacheEverything:true}
      });
      if(!response?.ok){
        errors.push(url+":http_"+String(response?.status||0));
        continue;
      }
      const contentType=String(response.headers?.get?.("content-type")||"");
      if(contentType && !/html|xml|text/i.test(contentType)){
        errors.push(url+":unsupported_content_type");
        continue;
      }
      const html=(await response.text()).slice(0,1800000);
      const items=extractLegalNewsItems(source,html,{now});
      return {
        sourceId:source.id,
        institution:source.institution,
        title:source.title,
        status:"ok",
        fetchedUrl:url,
        itemCount:items.length,
        items,
        checkedAt:new Date(now).toISOString(),
        errors
      };
    }catch(error){
      errors.push(url+":"+String(error?.name||error?.message||"fetch_failed").slice(0,80));
    }finally{
      clearTimeout(timer);
    }
  }
  return {
    sourceId:source.id,
    institution:source.institution,
    title:source.title,
    status:"unavailable",
    fetchedUrl:null,
    itemCount:0,
    items:[],
    checkedAt:new Date(now).toISOString(),
    errors:errors.slice(0,5)
  };
}

function dedupeItems(items){
  const out=new Map();
  for(const item of items){
    const key=titleKey(item.title);
    if(!key) continue;
    const prior=out.get(key);
    if(!prior){
      out.set(key,item);
      continue;
    }
    const priorDate=prior.publishedDate||"";
    const itemDate=item.publishedDate||"";
    const chooseItem=itemDate>priorDate || (itemDate===priorDate && item.relevanceScore>prior.relevanceScore);
    if(chooseItem) out.set(key,item);
  }
  return [...out.values()];
}

export async function aggregateLegalNews({
  fetchImpl=globalThis.fetch,
  now=new Date(),
  days=1,
  institution="",
  type="",
  limit=60,
  includeUndated=false,
  sourceIds=[]
}={}){
  if(typeof fetchImpl!=="function") throw new TypeError("fetch_required");
  const safeDays=clampInt(days,1,7,1);
  const safeLimit=clampInt(limit,1,100,60);
  const selectedIds=new Set(Array.isArray(sourceIds)?sourceIds.map(x=>String(x)) : []);
  const sources=LEGAL_NEWS_SOURCES.filter(s=>selectedIds.size===0||selectedIds.has(s.id));
  const results=await Promise.all(sources.map(s=>fetchOneSource(s,fetchImpl,now)));
  const cutoff=new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate()-(safeDays-1));
  const cutoffIso=cutoff.toISOString().slice(0,10);

  let items=dedupeItems(results.flatMap(r=>r.items));
  if(institution) items=items.filter(x=>x.institution===String(institution));
  if(type) items=items.filter(x=>x.type===String(type));
  items=items.filter(x=>x.publishedDate ? x.publishedDate>=cutoffIso : includeUndated===true);
  items.sort((a,b)=>{
    const da=a.publishedDate||"0000-00-00",db=b.publishedDate||"0000-00-00";
    return db.localeCompare(da)||b.relevanceScore-a.relevanceScore||a.institutionTitle.localeCompare(b.institutionTitle,"mk");
  });

  const sourceHealth=results.map(r=>({
    sourceId:r.sourceId,
    institution:r.institution,
    title:r.title,
    status:r.status,
    fetchedUrl:r.fetchedUrl,
    itemCount:r.itemCount,
    checkedAt:r.checkedAt,
    errors:r.errors
  }));
  const unavailable=sourceHealth.filter(x=>x.status!=="ok").map(x=>x.sourceId);

  return Object.freeze({
    version:LEGAL_NEWS_AGGREGATOR_VERSION,
    scope:"internal_ai_advokat_only",
    generatedAt:new Date(now).toISOString(),
    windowDays:safeDays,
    cutoffDate:cutoffIso,
    total:Math.min(items.length,safeLimit),
    items:items.slice(0,safeLimit),
    sourceHealth,
    warnings:[
      ...(unavailable.length?["SOURCE_GAPS: "+unavailable.join(", ")]:[]),
      "NEWS_IS_NOT_LEGAL_CONCLUSION",
      "OFFICIAL_POST_IS_NOT_ALWAYS_FINAL_ACT",
      "VERIFY_ITEM_LEVEL_AUTHORITY_AND_DATE_BEFORE_LEGAL_RELIANCE"
    ],
    boundaries:{
      publicOfficialSourcesOnly:true,
      mediaAggregation:false,
      autonomousLegalConclusion:false,
      autonomousAdverseInference:false,
      autonomousFiling:false,
      humanGateRequired:true
    }
  });
}
