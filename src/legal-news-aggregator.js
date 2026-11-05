// AI Advokat · Justice Daily
// Read-only aggregator for official public justice-sector sources.
// News discovery is not a legal conclusion and never bypasses source verification or Human Gate.

export const LEGAL_NEWS_AGGREGATOR_VERSION="AI_ADVOCAT_JUSTICE_DAILY_V1_3";

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
    relevance:"justice_filtered",
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
  },
  {
    id:"ldbis",
    institution:"ldbis",
    title:"ЛДБИС · Министерство за правда",
    layer:"extended",
    authorityClass:"official_national_legal_database",
    relevance:"justice_filtered",
    urls:["https://ldbis.pravda.gov.mk/"],
    articleHosts:["ldbis.pravda.gov.mk"],
    sourceRole:"national_legislation_case_law_and_legal_database_watch",
    boundary:"ЛДБИС е официјална правно-информациска база. Наслов/листинг во базата е discovery; за правно потпирање се проверуваат точниот текст, верзијата, датумот и статусот на актот."
  },
  {
    id:"echr-hudoc",
    institution:"echr_hudoc",
    title:"HUDOC · Европски суд за човекови права",
    layer:"international",
    authorityClass:"official_international_case_law_database",
    relevance:"all",
    collectionMode:"reference_only",
    urls:["https://hudoc.echr.coe.int/#{%22documentcollectionid2%22:[%22GRANDCHAMBER%22,%22CHAMBER%22]}"],
    articleHosts:["hudoc.echr.coe.int"],
    sourceRole:"echr_grand_chamber_and_chamber_case_law",
    boundary:"HUDOC е примарна официјална база на ЕСЧП. Автоматскиот дневен fetch може да биде ограничен поради client-side rendering; конкретна пресуда/одлука се проверува по application number, датум, состав и документ."
  },
  {
    id:"eurlex-oj",
    institution:"eurlex_oj",
    title:"EUR-Lex · Official Journal · L series",
    layer:"international",
    authorityClass:"official_eu_legal_publication_portal",
    relevance:"justice_filtered",
    collectionMode:"reference_only",
    urls:["https://eur-lex.europa.eu/oj/daily-view/L-series/default.html"],
    articleHosts:["eur-lex.europa.eu"],
    sourceRole:"eu_official_journal_daily_legislation_watch",
    boundary:"EUR-Lex Official Journal е официјален извор на ЕУ, но дневната страница може да бара JavaScript/anti-bot verification. За правно дејство се проверуваат CELEX/Official Journal записот, датумот и важечката верзија."
  },
  {
    id:"curia-cjeu",
    institution:"curia_cjeu",
    title:"CURIA · Суд на правдата на Европската унија",
    layer:"international",
    authorityClass:"official_eu_court",
    relevance:"all",
    urls:[
      "https://curia.europa.eu/site/rss.jsp?lang=en&secondLang=fr",
      "https://curia.europa.eu/site/"
    ],
    articleHosts:["curia.europa.eu","infocuria.curia.europa.eu"],
    sourceRole:"cjeu_judgments_opinions_and_press_watch",
    boundary:"CURIA е официјален извор на Судот на правдата на ЕУ. Press release/вест е discovery; за правно потпирање се проверуваат бројот на предметот, точниот judgment/opinion и датумот."
  },

  {
    id:"echr-press-rss",
    institution:"echr_press",
    title:"ECHR · Press releases RSS",
    layer:"international",
    authorityClass:"official_international_court_press",
    relevance:"all",
    urls:[
      "https://hudoc.echr.coe.int/app/transform/rss?length=20&library=echrengpress&query=contentsitename%3AECHR+AND+doctype%3DPR&rankingModelId=11111111-0000-0000-0000-000000000000&sort=kpdate+Descending&start=0",
      "https://www.echr.coe.int/en/echr-rss-feeds"
    ],
    articleHosts:["hudoc.echr.coe.int","www.echr.coe.int","echr.coe.int"],
    sourceRole:"echr_press_release_and_case_law_discovery",
    boundary:"ECHR press/RSS е официјален discovery слој. За правно потпирање се проверува конкретниот HUDOC judgment/decision, application number, датум и статус."
  },
  {
    id:"eu-commission-rss",
    institution:"eu_commission",
    title:"European Commission · Publications RSS",
    layer:"international",
    authorityClass:"official_eu_executive",
    relevance:"all",
    urls:[
      "https://commission.europa.eu/node/3/rss_en",
      "https://commission.europa.eu/"
    ],
    articleHosts:["commission.europa.eu"],
    sourceRole:"eu_commission_publications_and_policy_watch",
    boundary:"Објава на Европската комисија може да биде официјална институционална информација, но proposal/communication не е автоматски важечко право; за правен акт се проверуваат EUR-Lex/Official Journal и temporal status."
  },
  {
    id:"un-ilc-rss",
    institution:"un_ilc",
    title:"UN International Law Commission · RSS",
    layer:"international",
    authorityClass:"official_un_codification_body",
    relevance:"all",
    urls:[
      "https://legal.un.org/ilc/ilc_rss.xml",
      "https://legal.un.org/ilc/"
    ],
    articleHosts:["legal.un.org"],
    sourceRole:"international_law_codification_and_development_watch",
    boundary:"Материјалите на ILC се официјални работни/кодификациски материјали на ОН, но draft articles, conclusions и reports не се автоматски обврзувачко право."
  },
  {
    id:"european-law-blog",
    institution:"european_law_blog",
    title:"European Law Blog",
    layer:"analysis",
    authorityClass:"academic_secondary_analysis",
    relevance:"all",
    urls:[
      "https://europeanlawblog.eu/feed/",
      "https://europeanlawblog.eu/"
    ],
    articleHosts:["europeanlawblog.eu","www.europeanlawblog.eu"],
    sourceRole:"peer_reviewed_eu_law_analysis_discovery",
    boundary:"European Law Blog е академски secondary source за анализа на ЕУ право. Не е официјален извор и не смее да се третира како правен акт или судска одлука."
  },
  {
    id:"european-western-balkans",
    institution:"european_western_balkans",
    title:"European Western Balkans",
    layer:"regional_analysis",
    authorityClass:"regional_news_analysis",
    relevance:"all",
    urls:[
      "https://europeanwesternbalkans.com/feed/",
      "https://europeanwesternbalkans.com/"
    ],
    articleHosts:["europeanwesternbalkans.com","www.europeanwesternbalkans.com"],
    sourceRole:"western_balkans_eu_integration_rule_of_law_watch",
    boundary:"European Western Balkans е регионален news/analysis discovery source. За правни тврдења се враќаме на официјалниот национален или ЕУ извор."
  },
  {
    id:"global-legal-post",
    institution:"global_legal_post",
    title:"The Global Legal Post · News RSS",
    layer:"global_analysis",
    authorityClass:"commercial_legal_news",
    relevance:"all",
    urls:[
      "https://www.globallegalpost.com/rss-news",
      "https://www.globallegalpost.com/"
    ],
    articleHosts:["globallegalpost.com","www.globallegalpost.com"],
    sourceRole:"global_commercial_and_professional_legal_news_watch",
    boundary:"Global Legal Post е комерцијален legal-news secondary source. Наслов/анализа не е доказ за важечко право и се проверува со примарен извор."
  },
  {
    id:"balkan-insight",
    institution:"balkan_insight",
    title:"Balkan Insight · Legal / rule-of-law watch",
    layer:"regional_analysis",
    authorityClass:"regional_investigative_news",
    relevance:"all",
    collectionMode:"reference_only",
    urls:["https://balkaninsight.com/rss-feeds/"],
    articleHosts:["balkaninsight.com","www.balkaninsight.com"],
    sourceRole:"balkan_rule_of_law_transitional_justice_discovery",
    boundary:"Balkan Insight е новинарски/аналитички discovery source. Неговите наоди не се заменски примарен правен извор и мора да се верификуваат со официјални документи."
  },
  {
    id:"akademik-mk",
    institution:"akademik_mk",
    title:"Академик · Македонија",
    layer:"national_analysis",
    authorityClass:"commercial_legal_information_portal",
    relevance:"all",
    collectionMode:"reference_only",
    urls:["https://akademik.mk/"],
    articleHosts:["akademik.mk","www.akademik.mk"],
    sourceRole:"macedonian_professional_legal_information_discovery",
    boundary:"Академик е професионален/комерцијален secondary source. За authoritative current-law тврдење се проверуваат Службен весник, ЛДБИС и друг соодветен официјален извор."
  },
  {
    id:"law360",
    institution:"law360",
    title:"Law360 · RSS / subscription reference",
    layer:"global_analysis",
    authorityClass:"commercial_subscription_legal_news",
    relevance:"all",
    collectionMode:"reference_only",
    urls:["https://www.law360.com/Law360-RSS-Feeds.pdf","https://www.law360.com/"],
    articleHosts:["law360.com","www.law360.com"],
    sourceRole:"global_legal_news_subscription_reference",
    boundary:"Law360 е LexisNexis/RELX commercial subscription legal-news source. Не се заобиколува paywall и содржината не се третира како примарен правен авторитет."
  },
  {
    id:"serbia-pis",
    institution:"serbia_pis",
    title:"Правно-информациони систем Републике Србије",
    layer:"regional",
    authorityClass:"official_foreign_legal_information_system",
    relevance:"justice_filtered",
    collectionMode:"reference_only",
    urls:["https://pravno-informacioni-sistem.rs/news-cat/3/0"],
    articleHosts:["pravno-informacioni-sistem.rs","www.pravno-informacioni-sistem.rs"],
    sourceRole:"regional_comparative_legal_information_watch",
    boundary:"Овој извор е официјален странски правно-информациски систем и служи за компаративно/регионално следење. Не е извор на важечко право во Северна Македонија."
  },
  {
    id:"slovenia-justice",
    institution:"slovenia_justice",
    title:"Министерство за правда на Република Словенија · Новости",
    layer:"regional",
    authorityClass:"official_foreign_ministry",
    relevance:"all",
    urls:[
      "https://www.gov.si/drzavni-organi/ministrstva/ministrstvo-za-pravosodje/novice/",
      "https://www.gov.si/novice/?org%5B0%5D=32"
    ],
    articleHosts:["gov.si","www.gov.si"],
    sourceRole:"regional_comparative_justice_ministry_news",
    boundary:"Ова е официјален извор на словенечкото Министерство за правда и служи за компаративно/регионално следење на реформи, законодавство и правосудни политики. Не е извор на важечко право во Северна Македонија."
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
  return decodeHtml(
    text(value)
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi,"$1")
      .replace(/<script\b[\s\S]*?<\/script>/gi," ")
      .replace(/<style\b[\s\S]*?<\/style>/gi," ")
      .replace(/<[^>]+>/g," ")
  );
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
  if(/обука|академи|семинар|работилниц|тркалезна маса/.test(low)) return "training";
  if(/предлог.?закон|закон|амандман|правилник|деловник|уредба|службен весник|енер/.test(low)) return "legislation";
  if(/обвинител|истраг|осомнич|обвинени|кривич|претрес|предистраж/.test(low)) return "prosecution";
  if(/избор|именува|разреш|кандидат|оглас|интервју/.test(low)) return "appointments";
  if(/ревизи|реформа|стратеги|акциски план|извештај|владеење на правото/.test(low)) return "reform";
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
  const raw=cleanText(value);
  const s=raw.toLocaleLowerCase("mk");
  let m=s.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if(m) return validIsoDate(m[1],m[2],m[3]);
  m=s.match(/\b(0?[1-9]|[12]\d|3[01])(?:\s*[./-]\s*|\s+)(0?[1-9]|1[0-2])(?:\s*[./-]\s*|\s+)(20\d{2})\b/);
  if(m) return validIsoDate(m[3],m[2],m[1]);
  m=s.match(/\b(0?[1-9]|[12]\d|3[01])\.?\s+([\p{L}]+)\s*,?\s*(20\d{2})\b/u);
  if(m){
    const month=MONTHS[m[2]];
    if(month) return validIsoDate(m[3],month,m[1]);
  }
  const parsed=Date.parse(raw);
  if(Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0,10);
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

function firstTag(block,names){
  for(const name of names){
    const m=block.match(new RegExp("<"+name+"\\b[^>]*>([\\s\\S]*?)<\\/"+name+">","i"));
    if(m) return cleanText(m[1]);
  }
  return "";
}

function syndicationLink(block,baseUrl){
  const atom=block.match(/<link\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*\/?\s*>/i);
  if(atom) return safeAbsoluteUrl(atom[1],baseUrl);
  const rss=block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i);
  return rss?safeAbsoluteUrl(cleanText(rss[1]),baseUrl):null;
}

export function extractSyndicationItems(source,xml,{now=new Date(),baseUrl=source?.urls?.[0]}={}){
  const raw=text(xml);
  const blocks=[
    ...(raw.match(/<item\b[\s\S]*?<\/item>/gi)||[]),
    ...(raw.match(/<entry\b[\s\S]*?<\/entry>/gi)||[])
  ];
  const items=[];
  for(const block of blocks){
    const title=normaliseTitle(firstTag(block,["title"]));
    if(isBoilerplateTitle(title)) continue;
    const url=syndicationLink(block,baseUrl);
    if(!url||!allowedArticleUrl(source,url)) continue;
    const publishedDate=parsePublishedDate(firstTag(block,["pubDate","published","updated","dc:date","date"]));
    const score=relevanceScore(source,title);
    if(score<4) continue;
    items.push({
      id:source.id+":"+titleKey(title).slice(0,80),
      sourceId:source.id,
      institution:source.institution,
      institutionTitle:source.title,
      sourceRole:source.sourceRole,
      authorityClass:source.authorityClass,
      layer:source.layer,
      title,
      url,
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
    if(!byKey.has(key)) byKey.set(key,item);
  }
  return [...byKey.values()];
}

export function extractLegalNewsItems(source,html,{now=new Date(),baseUrl=source?.urls?.[0]}={}){
  const raw=text(html);
  const items=[];
  const anchorRe=/<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while((match=anchorRe.exec(raw))){
    const href=safeAbsoluteUrl(match[2],baseUrl||source.urls[0]);
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
    collectionMode:s.collectionMode||"fetch",
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
  if(source.collectionMode==="reference_only"){
    return {
      sourceId:source.id,
      institution:source.institution,
      title:source.title,
      status:"reference_only",
      primaryUrl:source.urls[0]||null,
      fetchedUrl:source.urls[0]||null,
      itemCount:0,
      items:[],
      checkedAt:new Date(now).toISOString(),
      errors:["reference_only_client_rendered_or_anti_bot"]
    };
  }
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
      const isFeed=/rss|atom|xml/i.test(contentType)||/^\s*<\?xml|<rss\b|<feed\b/i.test(html);
      const items=isFeed
        ? extractSyndicationItems(source,html,{now,baseUrl:url})
        : extractLegalNewsItems(source,html,{now,baseUrl:url});
      return {
        sourceId:source.id,
        institution:source.institution,
        title:source.title,
        status:"ok",
        primaryUrl:source.urls[0]||null,
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
    primaryUrl:source.urls[0]||null,
    fetchedUrl:null,
    itemCount:0,
    items:[],
    checkedAt:new Date(now).toISOString(),
    errors:errors.slice(0,5)
  };
}

function justicePriority(item){
  const type=String(item?.type||"");
  const authority=String(item?.authorityClass||"");
  let score=Number(item?.relevanceScore||0);
  if(type==="decision") score+=8;
  else if(type==="legislation") score+=7;
  else if(type==="prosecution"||type==="appointments") score+=5;
  else if(type==="reform"||type==="session") score+=3;
  if(/constitutional|supreme|official_gazette|legislature/.test(authority)) score+=3;
  const corroboration=Array.isArray(item?.corroboratingSources)?item.corroboratingSources.length:0;
  score+=Math.min(3,corroboration);
  const level=score>=14?"high":score>=9?"medium":"normal";
  const reasons=[];
  if(type==="decision") reasons.push("decision_or_case");
  if(type==="legislation") reasons.push("legislation");
  if(type==="prosecution") reasons.push("prosecution_update");
  if(type==="appointments") reasons.push("appointment_or_discipline");
  if(corroboration) reasons.push("corroborated");
  if(/constitutional|supreme|official_gazette|legislature/.test(authority)) reasons.push("high_authority_source");
  return {score,level,reasons};
}

function buildJusticeDailyStats(items,sourceHealth){
  const byType={};
  const byInstitution={};
  for(const item of items){
    byType[item.type]=(byType[item.type]||0)+1;
    byInstitution[item.institution]=(byInstitution[item.institution]||0)+1;
  }
  return {
    items:items.length,
    highPriority:items.filter(x=>x.priority?.level==="high").length,
    mediumPriority:items.filter(x=>x.priority?.level==="medium").length,
    corroborated:items.filter(x=>Array.isArray(x.corroboratingSources)&&x.corroboratingSources.length>0).length,
    sourcesOk:sourceHealth.filter(x=>x.status==="ok").length,
    sourcesReferenceOnly:sourceHealth.filter(x=>x.status==="reference_only").length,
    sourcesUnavailable:sourceHealth.filter(x=>x.status==="unavailable").length,
    byType,
    byInstitution
  };
}

function dedupeItems(items){
  const out=new Map();
  for(const item of items){
    const key=(item.publishedDate||"undated")+"|"+titleKey(item.title);
    if(!key) continue;
    const prior=out.get(key);
    if(!prior){
      out.set(key,{...item,corroboratingSources:[]});
      continue;
    }
    const sourceMeta={sourceId:item.sourceId,institution:item.institution,institutionTitle:item.institutionTitle,url:item.url};
    const priorMeta={sourceId:prior.sourceId,institution:prior.institution,institutionTitle:prior.institutionTitle,url:prior.url};
    const all=[priorMeta,...(prior.corroboratingSources||[]),sourceMeta];
    const unique=[];
    const seen=new Set();
    for(const s of all){
      const sk=String(s.sourceId)+"|"+String(s.url);
      if(seen.has(sk)) continue;
      seen.add(sk);unique.push(s);
    }
    const chooseItem=item.relevanceScore>prior.relevanceScore;
    if(chooseItem){
      out.set(key,{...item,corroboratingSources:unique.filter(s=>s.sourceId!==item.sourceId||s.url!==item.url)});
    }else{
      prior.corroboratingSources=unique.filter(s=>s.sourceId!==prior.sourceId||s.url!==prior.url);
    }
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

  items=items.map(item=>{
    const priority=justicePriority(item);
    return {...item,priority};
  });

  const sourceHealth=results.map(r=>({
    sourceId:r.sourceId,
    institution:r.institution,
    title:r.title,
    status:r.status,
    primaryUrl:r.primaryUrl||null,
    fetchedUrl:r.fetchedUrl,
    itemCount:r.itemCount,
    checkedAt:r.checkedAt,
    errors:r.errors
  }));
  const unavailable=sourceHealth.filter(x=>x.status==="unavailable").map(x=>x.sourceId);
  const referenceOnly=sourceHealth.filter(x=>x.status==="reference_only").map(x=>x.sourceId);

  return Object.freeze({
    version:LEGAL_NEWS_AGGREGATOR_VERSION,
    scope:"internal_ai_advokat_only",
    generatedAt:new Date(now).toISOString(),
    windowDays:safeDays,
    cutoffDate:cutoffIso,
    total:Math.min(items.length,safeLimit),
    items:items.slice(0,safeLimit),
    sourceHealth,
    stats:buildJusticeDailyStats(items,sourceHealth),
    warnings:[
      ...(unavailable.length?["SOURCE_GAPS: "+unavailable.join(", ")]:[]),
      ...(referenceOnly.length?["REFERENCE_ONLY_SOURCES: "+referenceOnly.join(", ")]:[]),
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
