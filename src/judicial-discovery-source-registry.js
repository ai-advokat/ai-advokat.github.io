// AI Advokat governed judicial discovery corpus.
// Source-level discovery only: these records help both internal and external bots
// locate supplied official court publications without promoting unreviewed extracts
// to legal authority.

export const JUDICIAL_DISCOVERY_CORPUS_VERSION="MK_JUDICIAL_DISCOVERY_2026-11-04_v1";

const SOURCES=Object.freeze([
  {
    id:"mk-supreme-master-archive",
    title:"Врховен суд — master archive of supplied official publications and source files",
    court:"Врховен суд на Република Северна Македонија",
    period:"1975-2026",
    sourceUrl:"https://www.vrhoven.sud.mk/",
    authorityClass:"highest_domestic_case_law_publication_discovery",
    corpusIds:["VSRM_MASTER_SOURCE_ARCHIVE_v1","JP01D","JP01F","JP01G","JP01I","JP04_MASTER_246","VSRSNM_COLLECTION_XII_2018_2023"],
    tags:["врховен суд","вс","начелни ставови","начелни правни мислења","правни мислења","заклучоци","сентенци","граѓанско","кривично","управно","разумен рок","supreme court","case law","judicial practice"],
    note:"User-supplied official/publication copies and derived research packages. Preserve exact document subtype. Item-level holding, original-decision binding and current-law status remain separate Human Gates."
  },
  {
    id:"mk-constitutional-collections-2003-2017",
    title:"Уставен суд — official collections 2003 and 2017",
    court:"Уставен суд на Република Северна Македонија",
    period:"2003, 2017",
    sourceUrl:"https://ustavensud.mk/",
    authorityClass:"constitutional_review_publication_discovery",
    corpusIds:["JP03","USTAV_COURT_2003","USTAV_COURT_2017"],
    tags:["уставен суд","уставност","законитост","у.бр","одлуки","решенија","constitutional court","constitutional review"],
    note:"Official collection-level discovery. Exact U-number, operative effect and later legal effect require item-level verification."
  },
  {
    id:"mk-appellate-skopje-bulletins",
    title:"Апелационен суд Скопје — Bulletins 1-10 and joint appellate meeting 2018",
    court:"Апелационен суд Скопје",
    period:"2011-2018",
    sourceUrl:"https://www.asskopje.mk/",
    authorityClass:"appellate_case_law_publication_discovery",
    corpusIds:["JP02","APPEAL_SKOPJE_BULLETINS_1_10","INTER_APPEAL_MEETING_2018"],
    tags:["апелација скопје","апелационен суд скопје","граѓанско","кривично","работни односи","трговски","жалба","appellate skopje"],
    note:"Bulletin-level discovery and comparison only until the specific decision or reviewed bulletin proposition passes Human Gate."
  },
  {
    id:"mk-appellate-bitola-publications",
    title:"Апелационен суд Битола — bulletins, civil/criminal conclusions and joint meetings",
    court:"Апелационен суд Битола",
    period:"2006-2018",
    sourceUrl:"https://www.asbitola.mk/",
    authorityClass:"appellate_case_law_publication_discovery",
    corpusIds:["APPEAL_BITOLA_PUBLICATIONS"],
    tags:["апелација битола","апелационен суд битола","граѓанско","кривично","работни спорови","заклучоци","appellate bitola"],
    note:"Publication-level discovery. Joint appellate conclusions must remain distinct from judgments and from Supreme Court authority."
  },
  {
    id:"mk-appellate-gostivar-bulletin-2014",
    title:"Апелационен суд Гостивар — Bulletin no. 2, September 2014",
    court:"Апелационен суд Гостивар",
    period:"2014",
    sourceUrl:"https://www.asgostivar.mk/",
    authorityClass:"appellate_case_law_publication_discovery",
    corpusIds:["APPEAL_GOSTIVAR_BULLETIN_2014_NO2"],
    tags:["апелација гостивар","апелационен суд гостивар","казнено","граѓанско","работни односи","трговски","appellate gostivar"],
    note:"Official bulletin discovery. Current-law applicability of older statutory references is not inherited."
  },
  {
    id:"mk-appellate-stip-bulletin-1997",
    title:"Апелационен суд Штип — Bulletin 1-2, December 1997",
    court:"Апелационен суд Штип",
    period:"1997",
    sourceUrl:"https://www.asstip.mk/",
    authorityClass:"appellate_case_law_publication_discovery",
    corpusIds:["APPEAL_STIP_BULLETIN_1_2_1997"],
    tags:["апелација штип","апелационен суд штип","кривично","граѓанско","appellate stip","shtip"],
    note:"Historical bulletin discovery only. Present-law use requires current-law and item-level source verification."
  },
  {
    id:"mk-historical-judicial-collections-1975-2017",
    title:"Historical judicial collections and Supreme Court bulletins",
    court:"Врховен суд / historical Macedonian judicial publications",
    period:"1975-2017",
    sourceUrl:"https://www.vrhoven.sud.mk/",
    authorityClass:"historical_judicial_publication_discovery",
    corpusIds:["COLLECTION_I","COLLECTION_II_1975_1979","COLLECTION_III_1980_1984","COLLECTION_IV_1985_1989","COLLECTION_V_1990_1996","COLLECTION_VI_1997","COLLECTION_VII_1998","COLLECTION_VIII_1999","COLLECTION_IX_2000","COLLECTION_X_2001_2004","COLLECTION_XI_2004_2014","SUPREME_BULLETIN_2016_2017"],
    tags:["збирка судски одлуки","историска судска практика","1975","1980","1985","1990","1997","1998","1999","2000","2001","2004","2014","2016","2017","historical case law"],
    note:"Historical authority/discovery layer. Never infer current statutory validity from the date of the historical decision."
  }
]);

function norm(value){
  return String(value||"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
}

export function judicialDiscoverySources(){
  return SOURCES.map(row=>({...row,corpusIds:[...row.corpusIds],tags:[...row.tags]}));
}

export function judicialDiscoveryContext(query,{limit=4}={}){
  const q=norm(query);
  if(!q) return {context:[],sources:[],state:"no_query_terms",version:JUDICIAL_DISCOVERY_CORPUS_VERSION};
  const tokens=q.split(/\s+/).filter(x=>x.length>=3);
  const ranked=SOURCES.map(row=>{
    const hay=norm([row.title,row.court,row.period,row.authorityClass,...row.corpusIds,...row.tags].join(" "));
    let score=0;
    for(const token of tokens){
      if(hay.includes(token)) score+=2;
      if(row.tags.some(tag=>norm(tag).includes(token))) score+=1;
    }
    return {...row,_score:score};
  }).filter(row=>row._score>0)
    .sort((a,b)=>b._score-a._score)
    .slice(0,Math.max(1,Math.min(8,Number(limit)||4)));

  const context=ranked.map(row=>({
    source:"AI Advokat Judicial Discovery Corpus · "+row.court,
    locator:row.title+" · "+row.period,
    version:JUDICIAL_DISCOVERY_CORPUS_VERSION,
    provenance:{
      kind:"official_source_record",
      sourceIdentity:row.title,
      authorityClass:row.authorityClass,
      locator:row.id,
      releaseRole:"source_registry",
      humanReviewStatus:"source_package_verified",
      legalAuthority:false,
      jurisdiction:"MK",
      accessStatus:"user_supplied_publication_copy",
      reuseStatus:"research_index_only_pending_item_review",
      ingestStatus:"discovery_indexed_item_level_verification_pending",
      rightsCheckedOn:"pending",
      sourceUrl:row.sourceUrl,
      currentLawClaim:false
    },
    text:[
      "SOURCE_ROLE: JUDICIAL_DISCOVERY_ONLY",
      "LEGAL_AUTHORITY: false",
      "COURT_OR_COLLECTION: "+row.court,
      "PERIOD: "+row.period,
      "CORPUS_IDS: "+row.corpusIds.join(", "),
      "AUTHORITY_CLASS_CANDIDATE: "+row.authorityClass,
      "GOVERNANCE_NOTE: "+row.note,
      "Do not state a holding, outcome, finality, binding effect or current-law proposition from this source-level record alone.",
      "Use it to locate the relevant publication/record, then require item-level source binding and Human Gate before authoritative citation."
    ].join("\n")
  }));

  return {
    context,
    sources:ranked.map(({_score,...row})=>row),
    state:context.length?"discovery_match":"no_discovery_match",
    version:JUDICIAL_DISCOVERY_CORPUS_VERSION
  };
}
