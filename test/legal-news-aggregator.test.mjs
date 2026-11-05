import test from "node:test";
import assert from "node:assert/strict";

import {
  LEGAL_NEWS_AGGREGATOR_VERSION,
  LEGAL_NEWS_SOURCES,
  legalNewsSourceDirectory,
  parsePublishedDate,
  classifyLegalNewsType,
  extractLegalNewsItems,
  aggregateLegalNews
} from "../src/legal-news-aggregator.js";

function htmlResponse(html,status=200){
  return {
    ok:status>=200&&status<300,
    status,
    headers:{get:()=> "text/html; charset=utf-8"},
    text:async()=>html
  };
}

test("Justice Daily registers the core North Macedonia justice institutions as official sources",()=>{
  assert.equal(LEGAL_NEWS_AGGREGATOR_VERSION,"AI_ADVOCAT_JUSTICE_DAILY_V1_2");
  const directory=legalNewsSourceDirectory();
  const core=[
    "assembly","constitutional-court","supreme-court","judicial-council",
    "public-prosecution","prosecutors-council","ministry-justice","judicial-academy"
  ];
  for(const id of core){
    const source=directory.find(x=>x.id===id);
    assert.ok(source,id+" missing");
    assert.equal(source.layer,"core");
    assert.ok(source.urls.length>=1);
    assert.ok(source.urls.every(url=>url.startsWith("https://")),id+" must use https official-source URLs");
    assert.ok(source.boundary.length>40,id+" must carry an explicit claim boundary");
  }
  for(const id of ["court-portal","official-gazette","ener","state-audit-justice","anti-corruption","ldbis","echr-hudoc","eurlex-oj","curia-cjeu","serbia-pis","slovenia-justice"]){
    assert.ok(directory.some(x=>x.id===id),id+" extended/international source missing");
  }
  assert.equal(directory.length,19);
  const exactUrls={
    ldbis:"https://ldbis.pravda.gov.mk/",
    "echr-hudoc":"https://hudoc.echr.coe.int/#{%22documentcollectionid2%22:[%22GRANDCHAMBER%22,%22CHAMBER%22]}",
    "eurlex-oj":"https://eur-lex.europa.eu/oj/daily-view/L-series/default.html",
    "curia-cjeu":"https://curia.europa.eu/site/",
    "serbia-pis":"https://pravno-informacioni-sistem.rs/news-cat/3/0",
    "slovenia-justice":"https://www.gov.si/drzavni-organi/ministrstva/ministrstvo-za-pravosodje/novice/"
  };
  for(const [id,url] of Object.entries(exactUrls)) assert.equal(directory.find(x=>x.id===id)?.urls?.[0],url);
  for(const id of ["echr-hudoc","eurlex-oj","serbia-pis"]) assert.equal(directory.find(x=>x.id===id)?.collectionMode,"reference_only");
  assert.equal(directory.some(x=>/time\.mk|sdk\.mk|telma|kanal5|alsat|slobodenpecat|plusinfo/i.test(x.urls.join(" "))),false);
});

test("Justice Daily parses ISO, Macedonian numeric and Macedonian month-name dates",()=>{
  assert.equal(parsePublishedDate("2026-11-05"),"2026-11-05");
  assert.equal(parsePublishedDate("05.11.2026"),"2026-11-05");
  assert.equal(parsePublishedDate("03 11 2026"),"2026-11-03");
  assert.equal(parsePublishedDate("5 ноември 2026"),"2026-11-05");
  assert.equal(parsePublishedDate("Tuesday, der 3. November 2026"),"2026-11-03");
  assert.equal(parsePublishedDate("31.02.2026"),null);
});

test("Justice Daily classifies institutional event types conservatively",()=>{
  assert.equal(classifyLegalNewsType("26. седница на Уставниот суд","constitutional-court"),"session");
  assert.equal(classifyLegalNewsType("Одлука У.бр. 12/2026","constitutional-court"),"decision");
  assert.equal(classifyLegalNewsType("Предлог-закон за изменување на Законот за судовите","assembly"),"legislation");
  assert.equal(classifyLegalNewsType("Јавното обвинителство отвори истрага","public-prosecution"),"prosecution");
  assert.equal(classifyLegalNewsType("Оглас за избор на судии","judicial-council"),"appointments");
  assert.equal(classifyLegalNewsType("Стратегија за реформа на правосудниот сектор","ministry-justice"),"reform");
  assert.equal(classifyLegalNewsType("Обука за судии и јавни обвинители","judicial-academy"),"training");
});

test("mixed institutional pages keep justice-relevant dated links and drop unrelated content",()=>{
  const assembly=LEGAL_NEWS_SOURCES.find(x=>x.id==="assembly");
  const fixture=`
    <html><body>
      <nav><a href="/pocetna.nspx">Почетна страна на Собранието</a></nav>
      <article><time>05.11.2026</time><a href="/novosti/predlog-zakon-sudovi.nspx">Предлог-закон за изменување на Законот за судовите</a></article>
      <article><time>05.11.2026</time><a href="/novosti/cveke.nspx">Поставување цветни аранжмани во холот</a></article>
    </body></html>`;
  const items=extractLegalNewsItems(assembly,fixture,{now:new Date("2026-11-05T12:00:00Z"),baseUrl:"https://www.sobranie.mk/novosti.nspx"});
  assert.equal(items.length,1);
  assert.match(items[0].title,/Законот за судовите/);
  assert.equal(items[0].publishedDate,"2026-11-05");
  assert.equal(items[0].type,"legislation");
  assert.equal(items[0].url,"https://www.sobranie.mk/novosti/predlog-zakon-sudovi.nspx");
  assert.equal(items[0].legalEffectVerified,false);
  assert.equal(items[0].humanGateRequired,true);
});

test("aggregator is fail-closed on source gaps, filters daily window and preserves corroboration provenance",async()=>{
  const sameTitle="Реформа на правосудниот сектор — нов пакет мерки";
  const pages=new Map([
    ["https://www.sobranie.mk/",`
      <article><time>05.11.2026</time><a href="/vesti/reforma-pravosudstvo.nspx">${sameTitle}</a></article>
      <article><time>01.11.2026</time><a href="/vesti/stara-pravosudna.nspx">Стара правосудна реформа од претходната недела</a></article>
    `],
    ["https://ustavensud.mk/mk/soopshtenija/",`
      <article><time>05.11.2026</time><a href="/archives/40000">${sameTitle}</a></article>
      <article><time>05.11.2026</time><a href="/archives/40001">Одлука У.бр. 77/2026 за уставна иницијатива</a></article>
    `]
  ]);
  const fetchImpl=async url=>{
    const key=String(url);
    if(pages.has(key)) return htmlResponse(pages.get(key),200);
    if(key.startsWith("https://ustavensud.mk/")) return htmlResponse("<html></html>",200);
    if(key.includes("sud.mk")||key.includes("vrhoven.sud.mk")||key.includes("vsrm.mk")) return htmlResponse("service unavailable",503);
    throw new Error("unexpected_url:"+key);
  };

  const out=await aggregateLegalNews({
    fetchImpl,
    now:new Date("2026-11-05T12:00:00Z"),
    days:1,
    limit:20,
    sourceIds:["assembly","constitutional-court","supreme-court"]
  });

  assert.equal(out.version,"AI_ADVOCAT_JUSTICE_DAILY_V1_2");
  assert.equal(out.scope,"internal_ai_advokat_only");
  assert.equal(out.windowDays,1);
  assert.equal(out.cutoffDate,"2026-11-05");
  assert.equal(out.items.some(x=>x.publishedDate==="2026-11-01"),false);
  assert.equal(out.items.filter(x=>x.title===sameTitle).length,1);
  const corroborated=out.items.find(x=>x.title===sameTitle);
  assert.ok(corroborated);
  assert.ok(Array.isArray(corroborated.corroboratingSources));
  assert.ok(corroborated.corroboratingSources.length>=1);
  assert.ok(out.items.some(x=>x.type==="decision"));
  const supreme=out.sourceHealth.find(x=>x.sourceId==="supreme-court");
  assert.equal(supreme.status,"unavailable");
  assert.ok(out.warnings.some(x=>x.includes("SOURCE_GAPS: supreme-court")));
  assert.equal(out.boundaries.publicOfficialSourcesOnly,true);
  assert.equal(out.boundaries.mediaAggregation,false);
  assert.equal(out.boundaries.autonomousLegalConclusion,false);
  assert.equal(out.boundaries.humanGateRequired,true);
});

test("undated discovery links stay out of the default daily briefing",async()=>{
  const fetchImpl=async()=>htmlResponse(`
    <a href="/vesti/pravosudstvo">Нова информација за реформа на правосудството</a>
  `);
  const out=await aggregateLegalNews({
    fetchImpl,
    now:new Date("2026-11-05T12:00:00Z"),
    days:1,
    sourceIds:["assembly"]
  });
  assert.equal(out.items.length,0);
  assert.equal(out.sourceHealth[0].status,"ok");
  assert.ok(out.sourceHealth[0].itemCount>=1);
});


test("reference-only official portals are surfaced without pretending that client-rendered pages were scraped",async()=>{
  let fetchCalls=0;
  const out=await aggregateLegalNews({
    fetchImpl:async()=>{fetchCalls++;throw new Error("must_not_fetch_reference_only");},
    now:new Date("2026-11-05T12:00:00Z"),
    days:1,
    sourceIds:["echr-hudoc","eurlex-oj","serbia-pis"]
  });
  assert.equal(fetchCalls,0);
  assert.equal(out.sourceHealth.length,3);
  assert.ok(out.sourceHealth.every(x=>x.status==="reference_only"));
  assert.ok(out.warnings.some(x=>x.includes("REFERENCE_ONLY_SOURCES:")));
  assert.equal(out.items.length,0);
});


test("Slovenia Ministry of Justice is an actively fetched regional official source",async()=>{
  let calls=0;
  const html=`
    <article><time>3. 11. 2026</time><a href="/novice/2026-11-03-pravosodje-clovek/">Minister Zupančič čestital nagrajencem: V središču pravosodja mora biti človek</a></article>
  `;
  const out=await aggregateLegalNews({
    fetchImpl:async url=>{calls++;return htmlResponse(html,200);},
    now:new Date("2026-11-05T12:00:00Z"),
    days:7,
    sourceIds:["slovenia-justice"]
  });
  assert.equal(calls,1);
  assert.equal(out.sourceHealth[0].status,"ok");
  assert.equal(out.items.length,1);
  assert.equal(out.items[0].institution,"slovenia_justice");
  assert.equal(out.items[0].publishedDate,"2026-11-03");
  assert.equal(out.items[0].humanGateRequired,true);
  assert.match(out.items[0].claimBoundary,/Не е извор на важечко право во Северна Македонија/);
});


test("priority metadata and source primaryUrl are exposed for operational Justice Daily UI",async()=>{
  const fetchImpl=async()=>htmlResponse(`
    <article><time>05.11.2026</time><a href="/novosti/odluka-sud.nspx">Одлука за судски предмет У.бр. 12/2026</a></article>
  `);
  const out=await aggregateLegalNews({
    fetchImpl,
    now:new Date("2026-11-05T12:00:00Z"),
    days:1,
    sourceIds:["assembly"]
  });
  assert.equal(out.version,"AI_ADVOCAT_JUSTICE_DAILY_V1_2");
  assert.equal(out.items.length,1);
  assert.ok(out.items[0].priority);
  assert.ok(["high","medium","normal"].includes(out.items[0].priority.level));
  assert.equal(typeof out.items[0].priority.score,"number");
  assert.equal(out.sourceHealth[0].primaryUrl,"https://www.sobranie.mk/");
  assert.equal(out.stats.items,1);
  assert.equal(out.stats.sourcesOk,1);
});

test("unavailable sources retain an official primaryUrl for manual fallback",async()=>{
  const out=await aggregateLegalNews({
    fetchImpl:async()=>htmlResponse("down",503),
    now:new Date("2026-11-05T12:00:00Z"),
    sourceIds:["supreme-court"]
  });
  assert.equal(out.sourceHealth[0].status,"unavailable");
  assert.equal(out.sourceHealth[0].fetchedUrl,null);
  assert.ok(String(out.sourceHealth[0].primaryUrl||"").startsWith("https://"));
});
