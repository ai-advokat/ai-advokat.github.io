const VERSION = "1.4.0";

const ALLOWED_ORIGINS = new Set([
  "https://ai-advokat.github.io",
  "https://ai-advokat-github-io.aiadvokat16.workers.dev",
  "http://localhost:8787",
  "http://127.0.0.1:8787"
]);

const VALID_TYPES = new Set(["all", "source", "law", "case", "paper"]);
const VALID_STATUSES = new Set(["all", "official", "verified", "pending"]);
const VALID_JURISDICTIONS = new Set(["MK", "ECHR", "EU"]);
const MAX_QUERY_LENGTH = 120;
const MAX_SEARCH_LIMIT = 20;
const UNICODE_SCAN_PAGE = 250;
const UNICODE_SCAN_MAX_ROWS = 1000;

const PUBLIC_WEB_SOURCES = Object.freeze([
  {
    id: "official-gazette",
    title: "Official Gazette of the Republic of North Macedonia",
    url: "https://slvesnik.com.mk/",
    category: "official_gazette",
    jurisdiction: "MK"
  },
  {
    id: "ldbis",
    title: "Ministry of Justice LDBIS legal database",
    url: "https://ldbis.pravda.gov.mk/",
    category: "ministry_database",
    jurisdiction: "MK"
  },
  {
    id: "constitutional-court",
    title: "Constitutional Court of the Republic of North Macedonia",
    url: "https://ustavensud.mk/",
    category: "court",
    jurisdiction: "MK"
  },
  {
    id: "supreme-court",
    title: "Supreme Court of the Republic of North Macedonia",
    url: "https://www.vrhoven.sud.mk/",
    category: "court",
    jurisdiction: "MK"
  },
  {
    id: "hudoc",
    title: "European Court of Human Rights - HUDOC",
    url: "https://hudoc.echr.coe.int/",
    category: "international_court",
    jurisdiction: "ECHR"
  },
  {
    id: "eur-lex",
    title: "EUR-Lex",
    url: "https://eur-lex.europa.eu/",
    category: "international_organization",
    jurisdiction: "EU"
  }
]);

const ZENODO_RECORDS = Object.freeze([
  {
    title: "Kocani - Puls: individual criminal, institutional and political responsibility",
    doi: "10.5281/zenodo.22981554",
    status: "draft",
    publicUrl: null
  },
  {
    title: "SINDZIR - plea bargaining, admission of guilt and the limits of criminal justice",
    doi: "10.5281/zenodo.22981744",
    status: "draft",
    publicUrl: null
  }
]);

const ORCID = Object.freeze({
  id: "0009-0001-0702-2371",
  url: "https://orcid.org/0009-0001-0702-2371",
  name: "Zoran Stojankich"
});

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function json(request, data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "same-origin",
      ...corsHeaders(request),
      ...extraHeaders
    }
  });
}

function methodNotAllowed(request) {
  return json(request, { ok: false, error: "method_not_allowed" }, 405);
}

function governedPreview(request, capability, message) {
  return json(request, {
    ok: false,
    status: "governed_preview",
    capability,
    message
  }, 503);
}

function cleanQuery(value, max = MAX_QUERY_LENGTH) {
  return String(value ?? "").normalize("NFKC").trim().slice(0, max);
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("mk");
}

function clampLimit(value) {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return 12;
  return Math.min(n, MAX_SEARCH_LIMIT);
}

function escapeLike(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}

function mapStatus(entityType, rawStatus) {
  const s = String(rawStatus ?? "").toLowerCase();

  if (entityType === "source") {
    if (s === "official") return "official";
    if (s === "verified") return "verified";
    return "pending";
  }

  if (entityType === "paper") {
    return s === "published" ? "verified" : "pending";
  }

  if (s === "official") return "official";
  if (["approved", "reviewed", "current", "final", "verified"].includes(s)) return "verified";
  return "pending";
}

async function dbStatus(env) {
  if (!env.DB) {
    return {
      bound: false,
      reachable: false,
      schemaReady: false,
      schemaVersion: null
    };
  }

  try {
    await env.DB.prepare("SELECT 1 AS ok").first();

    let schemaVersion = null;
    try {
      const row = await env.DB.prepare(
        "SELECT version FROM schema_migrations ORDER BY applied_at DESC, version DESC LIMIT 1"
      ).first();
      schemaVersion = row?.version ?? null;
    } catch {
      schemaVersion = null;
    }

    return {
      bound: true,
      reachable: true,
      schemaReady: Boolean(schemaVersion),
      schemaVersion
    };
  } catch {
    return {
      bound: true,
      reachable: false,
      schemaReady: false,
      schemaVersion: null
    };
  }
}

function normalizeRow(row) {
  return {
    entityType: row.entity_type,
    id: row.id,
    title: row.title,
    meta: row.meta || "",
    snippet: row.snippet || "",
    url: row.url || null,
    jurisdiction: row.jurisdiction || null,
    status: mapStatus(row.entity_type, row.raw_status),
    rawStatus: row.raw_status || null,
    date: row.item_date || null
  };
}

function matchesStatus(row, status) {
  return status === "all" || mapStatus(row.entity_type, row.raw_status) === status;
}

async function boundedUnicodeScan(env, { q, type, status, jurisdiction, limit }) {
  const target = normalizeText(q);
  const rows = [];
  const seen = new Set();
  const include = (kind) => type === "all" || type === kind;

  const scan = async (sql, bindings = []) => {
    let offset = 0;

    while (offset < UNICODE_SCAN_MAX_ROWS && rows.length < limit) {
      const result = await env.DB.prepare(sql)
        .bind(...bindings, UNICODE_SCAN_PAGE, offset)
        .all();

      const page = result.results ?? [];

      for (const row of page) {
        if (!normalizeText(row.search_blob).includes(target)) continue;
        if (!matchesStatus(row, status)) continue;

        const key = `${row.entity_type}:${row.id}`;
        if (seen.has(key)) continue;

        seen.add(key);
        rows.push(normalizeRow(row));
        if (rows.length >= limit) break;
      }

      if (page.length < UNICODE_SCAN_PAGE) break;
      offset += UNICODE_SCAN_PAGE;
    }
  };

  if (include("source")) {
    await scan(
      `SELECT 'source' AS entity_type, id, title,
              COALESCE(issuing_body, source_type, '') AS meta,
              COALESCE(notes, '') AS snippet, url, jurisdiction,
              source_status AS raw_status, publication_date AS item_date,
              title || ' ' || COALESCE(issuing_body,'') || ' ' || COALESCE(notes,'') AS search_blob
         FROM sources
        WHERE (? IS NULL OR jurisdiction = ?)
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?`,
      [jurisdiction, jurisdiction]
    );
  }

  if (include("law") && rows.length < limit) {
    await scan(
      `SELECT 'law' AS entity_type, li.id, li.title,
              trim(COALESCE(li.instrument_type,'') ||
                CASE WHEN li.gazette_reference IS NOT NULL THEN ' | ' || li.gazette_reference ELSE '' END) AS meta,
              COALESCE(li.notes, '') AS snippet, s.url, li.jurisdiction,
              CASE WHEN s.source_status = 'official' THEN 'official' ELSE li.human_review_status END AS raw_status,
              COALESCE(li.effective_date, li.adopted_date) AS item_date,
              li.title || ' ' || COALESCE(li.short_title,'') || ' ' ||
              COALESCE(li.gazette_reference,'') || ' ' || COALESCE(li.notes,'') AS search_blob
         FROM legal_instruments li
         LEFT JOIN sources s ON s.id = li.canonical_source_id
        WHERE (? IS NULL OR li.jurisdiction = ?)
        ORDER BY li.updated_at DESC
        LIMIT ? OFFSET ?`,
      [jurisdiction, jurisdiction]
    );
  }

  if (include("case") && rows.length < limit) {
    await scan(
      `SELECT 'case' AS entity_type, cl.id, cl.case_title AS title,
              trim(cl.court ||
                CASE WHEN cl.case_number IS NOT NULL THEN ' | ' || cl.case_number ELSE '' END) AS meta,
              COALESCE(cl.reasoning_summary, cl.outcome_summary, '') AS snippet,
              COALESCE(cl.source_url, s.url) AS url, cl.jurisdiction,
              CASE WHEN s.source_status = 'official' THEN 'official' ELSE cl.human_review_status END AS raw_status,
              cl.decision_date AS item_date,
              cl.case_title || ' ' || COALESCE(cl.case_number,'') || ' ' ||
              COALESCE(cl.legal_area,'') || ' ' || COALESCE(cl.reasoning_summary,'') || ' ' ||
              COALESCE(cl.outcome_summary,'') AS search_blob
         FROM case_law cl
         LEFT JOIN sources s ON s.id = cl.source_id
        WHERE (? IS NULL OR cl.jurisdiction = ?)
        ORDER BY cl.decision_date DESC, cl.updated_at DESC
        LIMIT ? OFFSET ?`,
      [jurisdiction, jurisdiction]
    );
  }

  if (include("paper") && rows.length < limit && (!jurisdiction || jurisdiction === "MK")) {
    await scan(
      `SELECT 'paper' AS entity_type, id, title,
              trim(author_name ||
                CASE WHEN venue IS NOT NULL THEN ' | ' || venue ELSE '' END) AS meta,
              COALESCE(abstract, '') AS snippet,
              CASE WHEN publication_status = 'published' THEN canonical_url ELSE NULL END AS url,
              'MK' AS jurisdiction, publication_status AS raw_status,
              publication_date AS item_date,
              title || ' ' || COALESCE(subtitle,'') || ' ' || author_name || ' ' ||
              COALESCE(abstract,'') || ' ' || COALESCE(keywords,'') AS search_blob
         FROM publications
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?`
    );
  }

  return rows.slice(0, limit);
}

async function queryPublicCorpus(env, { q, type, status, jurisdiction, limit }) {
  const pattern = `%${escapeLike(normalizeText(q))}%`;
  const queryLimit = Math.max(limit, 12);
  const rows = [];
  const include = (kind) => type === "all" || type === kind;

  if (include("source")) {
    const result = await env.DB.prepare(
      `SELECT 'source' AS entity_type, id, title,
              COALESCE(issuing_body, source_type, '') AS meta,
              COALESCE(notes, '') AS snippet, url, jurisdiction,
              source_status AS raw_status, publication_date AS item_date
         FROM sources
        WHERE lower(title || ' ' || COALESCE(issuing_body,'') || ' ' || COALESCE(notes,'')) LIKE ? ESCAPE '\\'
          AND (? IS NULL OR jurisdiction = ?)
        ORDER BY CASE source_status WHEN 'official' THEN 0 WHEN 'verified' THEN 1 ELSE 2 END,
                 updated_at DESC
        LIMIT ?`
    ).bind(pattern, jurisdiction, jurisdiction, queryLimit).all();

    rows.push(...(result.results ?? []));
  }

  if (include("law")) {
    const result = await env.DB.prepare(
      `SELECT 'law' AS entity_type, li.id, li.title,
              trim(COALESCE(li.instrument_type,'') ||
                CASE WHEN li.gazette_reference IS NOT NULL THEN ' | ' || li.gazette_reference ELSE '' END) AS meta,
              COALESCE(li.notes, '') AS snippet, s.url, li.jurisdiction,
              CASE WHEN s.source_status = 'official' THEN 'official' ELSE li.human_review_status END AS raw_status,
              COALESCE(li.effective_date, li.adopted_date) AS item_date
         FROM legal_instruments li
         LEFT JOIN sources s ON s.id = li.canonical_source_id
        WHERE lower(li.title || ' ' || COALESCE(li.short_title,'') || ' ' ||
                    COALESCE(li.gazette_reference,'') || ' ' || COALESCE(li.notes,'')) LIKE ? ESCAPE '\\'
          AND (? IS NULL OR li.jurisdiction = ?)
        ORDER BY li.updated_at DESC
        LIMIT ?`
    ).bind(pattern, jurisdiction, jurisdiction, queryLimit).all();

    rows.push(...(result.results ?? []));
  }

  if (include("case")) {
    const result = await env.DB.prepare(
      `SELECT 'case' AS entity_type, cl.id, cl.case_title AS title,
              trim(cl.court ||
                CASE WHEN cl.case_number IS NOT NULL THEN ' | ' || cl.case_number ELSE '' END) AS meta,
              COALESCE(cl.reasoning_summary, cl.outcome_summary, '') AS snippet,
              COALESCE(cl.source_url, s.url) AS url, cl.jurisdiction,
              CASE WHEN s.source_status = 'official' THEN 'official' ELSE cl.human_review_status END AS raw_status,
              cl.decision_date AS item_date
         FROM case_law cl
         LEFT JOIN sources s ON s.id = cl.source_id
        WHERE lower(cl.case_title || ' ' || COALESCE(cl.case_number,'') || ' ' ||
                    COALESCE(cl.legal_area,'') || ' ' || COALESCE(cl.reasoning_summary,'') || ' ' ||
                    COALESCE(cl.outcome_summary,'')) LIKE ? ESCAPE '\\'
          AND (? IS NULL OR cl.jurisdiction = ?)
        ORDER BY cl.decision_date DESC, cl.updated_at DESC
        LIMIT ?`
    ).bind(pattern, jurisdiction, jurisdiction, queryLimit).all();

    rows.push(...(result.results ?? []));
  }

  if (include("paper") && (!jurisdiction || jurisdiction === "MK")) {
    const result = await env.DB.prepare(
      `SELECT 'paper' AS entity_type, id, title,
              trim(author_name ||
                CASE WHEN venue IS NOT NULL THEN ' | ' || venue ELSE '' END) AS meta,
              COALESCE(abstract, '') AS snippet,
              CASE WHEN publication_status = 'published' THEN canonical_url ELSE NULL END AS url,
              'MK' AS jurisdiction, publication_status AS raw_status,
              publication_date AS item_date
         FROM publications
        WHERE lower(title || ' ' || COALESCE(subtitle,'') || ' ' || author_name || ' ' ||
                    COALESCE(abstract,'') || ' ' || COALESCE(keywords,'')) LIKE ? ESCAPE '\\'
        ORDER BY updated_at DESC
        LIMIT ?`
    ).bind(pattern, queryLimit).all();

    rows.push(...(result.results ?? []));
  }

  const normalized = rows
    .map(normalizeRow)
    .filter((item) => status === "all" || item.status === status)
    .slice(0, limit);

  if (normalized.length >= limit || !/[^\u0000-\u007F]/u.test(q)) {
    return normalized;
  }

  const fallback = await boundedUnicodeScan(env, {
    q,
    type,
    status,
    jurisdiction,
    limit
  });

  const seen = new Set(normalized.map((item) => `${item.entityType}:${item.id}`));
  for (const item of fallback) {
    const key = `${item.entityType}:${item.id}`;
    if (seen.has(key)) continue;
    normalized.push(item);
    seen.add(key);
    if (normalized.length >= limit) break;
  }

  return normalized;
}

async function handleSearch(request, env, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return methodNotAllowed(request);
  }

  const q = cleanQuery(url.searchParams.get("q"));
  const type = cleanQuery(url.searchParams.get("type") || "all", 24);
  const status = cleanQuery(url.searchParams.get("status") || "all", 24);
  const jurisdictionRaw = cleanQuery(url.searchParams.get("jurisdiction"), 16);
  const jurisdiction = jurisdictionRaw || null;
  const limit = clampLimit(url.searchParams.get("limit"));

  if (q.length < 2) {
    return json(request, {
      ok: false,
      error: "query_too_short",
      message: "Use at least two characters."
    }, 400);
  }

  if (!VALID_TYPES.has(type)) {
    return json(request, { ok: false, error: "invalid_type" }, 400);
  }

  if (!VALID_STATUSES.has(status)) {
    return json(request, { ok: false, error: "invalid_status" }, 400);
  }

  if (jurisdiction && !VALID_JURISDICTIONS.has(jurisdiction)) {
    return json(request, { ok: false, error: "invalid_jurisdiction" }, 400);
  }

  const database = await dbStatus(env);
  if (!database.reachable || !database.schemaReady) {
    return json(request, {
      ok: false,
      error: "database_not_ready",
      database
    }, 503);
  }

  const results = await queryPublicCorpus(env, {
    q,
    type,
    status,
    jurisdiction,
    limit
  });

  return json(request, {
    ok: true,
    mode: "read_only_public_corpus",
    query: q,
    count: results.length,
    results,
    humanGate: "Open and verify the primary source before professional reliance."
  });
}


function articlePublicStatus(row) {
  const status=String(row?.status || "");
  if (status==="current_consolidated" && row?.human_review_status==="approved") return "current_verified";
  if (status==="verified" && ["approved","reviewed"].includes(String(row?.human_review_status || ""))) return "verified";
  if (status==="needs_version_review") return "version_review";
  if (status==="historical") return "historical";
  return "pending";
}

function normalizeArticle(row) {
  return {
    id: row.id,
    canonicalId: row.canonical_id,
    articleNumber: row.article_number,
    articleNumberNormalized: row.article_number_normalized,
    heading: row.article_heading || null,
    text: row.article_text,
    status: row.status,
    publicStatus: articlePublicStatus(row),
    humanReviewStatus: row.human_review_status,
    sourceIssueNumber: row.source_issue_number || null,
    sourceIssueDate: row.source_issue_date || null,
    sourceUrl: row.source_url,
    sourceSha256: row.source_sha256,
    validFrom: row.valid_from || null,
    validTo: row.valid_to || null
  };
}

function articleTokens(value) {
  return [...new Set(normalizeText(value)
    .replace(/[^\p{L}\p{N}-]+/gu," ")
    .split(/\s+/u)
    .filter(t=>t.length>=3)
    .slice(0,24))];
}

async function getInstrument(env, canonicalKey) {
  return env.DB.prepare(
    `SELECT li.id,li.canonical_key,li.title,li.short_title,li.instrument_type,
            li.jurisdiction,li.gazette_reference,li.current_status,
            li.human_review_status,li.notes,s.url AS canonical_source_url
       FROM legal_instruments li
       LEFT JOIN sources s ON s.id=li.canonical_source_id
      WHERE li.canonical_key=?
      LIMIT 1`
  ).bind(canonicalKey).first();
}

async function loadInstrumentArticles(env, instrumentId) {
  const result=await env.DB.prepare(
    `SELECT id,canonical_id,article_number,article_number_normalized,article_heading,
            article_text,status,human_review_status,source_issue_number,source_issue_date,
            source_url,source_sha256,valid_from,valid_to
       FROM legal_article_versions
      WHERE instrument_id=?
      ORDER BY id ASC
      LIMIT 500`
  ).bind(instrumentId).all();
  return result.results ?? [];
}

function scoreArticle(row, q) {
  const target=normalizeText(q);
  const text=normalizeText(`${row.article_heading || ""} ${row.article_text || ""}`);
  const num=normalizeText(row.article_number_normalized || row.article_number || "");
  let score=0;

  const articleMatch=target.match(/(?:член|article)\s*([0-9]+(?:[-–—][\p{L}]+)?)/u);
  if(articleMatch && normalizeText(articleMatch[1])===num) score+=1000;
  if(target===num) score+=1000;
  if(text.includes(target) && target.length>=4) score+=120;

  for(const token of articleTokens(target)){
    if(num===token) score+=200;
    const heading=normalizeText(row.article_heading || "");
    if(heading.includes(token)) score+=24;
    let pos=0;
    let count=0;
    while((pos=text.indexOf(token,pos))>=0 && count<8){
      score+=6;
      count++;
      pos+=token.length;
    }
  }

  if(row.status==="current_consolidated" && row.human_review_status==="approved") score+=25;
  else if(row.status==="verified") score+=15;
  else if(row.status==="needs_version_review") score-=4;

  return score;
}

async function findRelevantArticles(env, instrumentKey, q, limit=6) {
  const instrument=await getInstrument(env,instrumentKey);
  if(!instrument) return {instrument:null,articles:[]};

  const rows=await loadInstrumentArticles(env,instrument.id);
  const ranked=rows
    .map(row=>({row,score:scoreArticle(row,q)}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score || a.row.id-b.row.id)
    .slice(0,limit)
    .map(x=>({...normalizeArticle(x.row),relevanceScore:x.score}));

  return {instrument,articles:ranked};
}

async function handleArticles(request, env, url) {
  if(request.method!=="GET" && request.method!=="HEAD") return methodNotAllowed(request);

  const database=await dbStatus(env);
  if(!database.reachable || !database.schemaReady){
    return json(request,{ok:false,error:"database_not_ready",database},503);
  }

  const instrumentKey=cleanQuery(url.searchParams.get("instrument") || "mk:zro",64);
  const article=cleanQuery(url.searchParams.get("article"),24);
  const q=cleanQuery(url.searchParams.get("q"),200);
  const limit=Math.min(Math.max(Number.parseInt(url.searchParams.get("limit") || "40",10) || 40,1),100);
  const offset=Math.max(Number.parseInt(url.searchParams.get("offset") || "0",10) || 0,0);

  const instrument=await getInstrument(env,instrumentKey);
  if(!instrument) return json(request,{ok:false,error:"instrument_not_found"},404);

  let rows=await loadInstrumentArticles(env,instrument.id);
  const total=rows.length;

  if(article){
    const needle=normalizeText(article).replace(/^член\s*/u,"");
    rows=rows.filter(row=>normalizeText(row.article_number_normalized)===needle || normalizeText(row.article_number)===needle);
  }else if(q){
    rows=rows
      .map(row=>({row,score:scoreArticle(row,q)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score || a.row.id-b.row.id)
      .map(x=>x.row);
  }

  const filteredCount=rows.length;
  const page=rows.slice(offset,offset+limit).map(normalizeArticle);
  const statusCounts={};
  for(const row of await loadInstrumentArticles(env,instrument.id)){
    statusCounts[row.status]=(statusCounts[row.status] || 0)+1;
  }

  return json(request,{
    ok:true,
    mode:"public_article_corpus",
    instrument:{
      canonicalKey:instrument.canonical_key,
      title:instrument.title,
      shortTitle:instrument.short_title,
      jurisdiction:instrument.jurisdiction,
      gazetteReference:instrument.gazette_reference,
      currentStatus:instrument.current_status,
      humanReviewStatus:instrument.human_review_status,
      canonicalSourceUrl:instrument.canonical_source_url,
      notes:instrument.notes
    },
    total,
    filteredCount,
    offset,
    limit,
    statusCounts,
    articles:page,
    humanGate:"Only approved/current-consolidated provisions may be presented as verified current law."
  });
}

function assistantStatusWarning(articles) {
  if(!articles.length) return null;
  const review=articles.some(a=>a.status==="needs_version_review");
  const historical=articles.some(a=>a.status==="historical");
  if(review) return "Еден или повеќе релевантни членови се под VERSION REVIEW. Одговорот не смее да се третира како потврдена важечка верзија.";
  if(historical) return "Релевантните членови се од историскиот официјален пречистен snapshot преку 111/2023 и сè уште немаат Human Gate одобрување како тековен текст.";
  return null;
}

function fallbackAssistantAnswer(q, instrument, articles) {
  if(!articles.length){
    return "Во достапниот корпус не најдов доволно релевантен член за ова прашање. Потребна е дополнителна проверка на официјалните извори.";
  }
  const intro=`За прашањето „${q}“, најрелевантни во достапниот корпус се ${articles.map(a=>`член ${a.articleNumber}`).join(", ")} од ${instrument.title}.`;
  const body=articles.slice(0,3).map(a=>{
    const excerpt=String(a.text || "").replace(/\s+/g," ").slice(0,700);
    return `\n\n[Член ${a.articleNumber}] ${excerpt}${a.text.length>700 ? "…" : ""}`;
  }).join("");
  return intro+body;
}

async function handleAssistant(request, env, url) {
  if(!["GET","HEAD","POST"].includes(request.method)) return methodNotAllowed(request);

  let payload={};
  if(request.method==="POST"){
    try{ payload=await request.json(); }
    catch{ return json(request,{ok:false,error:"invalid_json"},400); }
  }

  const q=cleanQuery(request.method==="POST" ? payload.q : url.searchParams.get("q"),600);
  const instrumentKey=cleanQuery((request.method==="POST" ? payload.instrument : url.searchParams.get("instrument")) || "mk:zro",64);

  if(q.length<3) return json(request,{ok:false,error:"query_too_short",message:"Use at least three characters."},400);

  const database=await dbStatus(env);
  if(!database.reachable || !database.schemaReady){
    return json(request,{ok:false,error:"database_not_ready",database},503);
  }

  const {instrument,articles}=await findRelevantArticles(env,instrumentKey,q,6);
  if(!instrument) return json(request,{ok:false,error:"instrument_not_found"},404);

  const warning=assistantStatusWarning(articles);
  let answer=null;
  let answerMode="retrieval_only";

  if(env.AI && articles.length){
    const context=articles.map(a=>
      `[Член ${a.articleNumber}]\nSTATUS: ${a.status}; HUMAN_REVIEW: ${a.humanReviewStatus}\nSOURCE: ${a.sourceUrl}\nTEXT:\n${String(a.text).slice(0,4500)}`
    ).join("\n\n---\n\n").slice(0,18000);

    const prompt=`Ти си AI Advokat, source-first правен истражувач за македонското право.
Одговори на македонски, јасно и професионално.
КОРИСТИ ИСКЛУЧИВО ги дадените законски членови. Не дополнувај факти или право од меморија.
Секое правно тврдење поткрепи го со цитат во форма [Член N].
Ако изворот е historical или needs_version_review, кажи јасно дека не е Human-Gate потврден како тековен текст.
Ако изворите не се доволни, кажи што недостига наместо да претпоставуваш.
Не давај измислени проценти за исход.
Структура: Краток одговор; Правна основа; Примена/објаснување; Ограничувања и што треба да се провери.

ПРАШАЊЕ:
${q}

ИНСТРУМЕНТ:
${instrument.title}

ИЗВОРНИ ЧЛЕНОВИ:
${context}`;

    try{
      const generated=await env.AI.run("@cf/zai-org/glm-4.7-flash",{prompt});
      answer=generated?.response || generated?.result?.response || generated?.text || null;
      if(answer) answerMode="workers_ai_source_backed";
    }catch(error){
      answer=null;
    }
  }

  if(!answer) answer=fallbackAssistantAnswer(q,instrument,articles);

  return json(request,{
    ok:true,
    mode:answerMode,
    question:q,
    instrument:{
      canonicalKey:instrument.canonical_key,
      title:instrument.title,
      currentStatus:instrument.current_status,
      humanReviewStatus:instrument.human_review_status
    },
    answer,
    legalStatusWarning:warning,
    citations:articles.map(a=>({
      articleNumber:a.articleNumber,
      heading:a.heading,
      status:a.status,
      humanReviewStatus:a.humanReviewStatus,
      sourceUrl:a.sourceUrl,
      sourceIssueNumber:a.sourceIssueNumber,
      sourceIssueDate:a.sourceIssueDate,
      excerpt:String(a.text || "").replace(/\s+/g," ").slice(0,420)
    })),
    humanGate:"AI output is research assistance. Verify the controlling version and primary source before professional reliance."
  });
}

function handleWebSources(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed(request);

  return json(request, {
    ok: true,
    mode: "curated_official_directory",
    sources: PUBLIC_WEB_SOURCES,
    note: "Directory only. AI Advokat does not replace the official publication."
  });
}

function handleZenodo(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed(request);

  return json(request, {
    ok: true,
    author: ORCID.name,
    orcid: ORCID,
    records: ZENODO_RECORDS,
    note: "Private Zenodo draft/editor URLs are intentionally not exposed."
  });
}

function handleOrcid(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed(request);
  return json(request, { ok: true, orcid: ORCID });
}

async function handleCapabilities(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed(request);

  const database = await dbStatus(env);

  return json(request, {
    ok: true,
    version: VERSION,
    capabilities: {
      d1: !database.bound
        ? "not_bound"
        : !database.reachable
          ? "unreachable"
          : database.schemaReady
            ? "live"
            : "schema_missing",
      publicSearch: database.reachable && database.schemaReady ? "live_read_only" : "blocked",
      officialSourceDirectory: "live_read_only",
      zenodo: "metadata_only",
      orcid: "live_read_only",
      articleCorpus: database.reachable && database.schemaReady ? "live_read_only" : "blocked",
      retrievalAssistant: database.reachable && database.schemaReady ? (env.AI ? "live_source_backed_ai" : "live_retrieval_only") : "blocked",
      citationAudit: "governed_preview",
      versionCompare: "governed_preview",
      documentUpload: "locked",
      caseWorkspace: "locked",
      vectorize: "not_bound",
      workersAI: env.AI ? "bound" : "not_bound"
    }
  });
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");
  headers.set("Origin-Agent-Cluster", "?1");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://ai-advokat-github-io.aiadvokat16.workers.dev https://www.google-analytics.com https://*.google-analytics.com; font-src 'self' data:; object-src 'none'; media-src 'none'; frame-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self' mailto:; upgrade-insecure-requests"
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/") && request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request)
      });
    }

    if (!url.pathname.startsWith("/api/")) {
      return withSecurityHeaders(await env.ASSETS.fetch(request));
    }

    if (url.pathname === "/api/health") {
      if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed(request);

      const database = await dbStatus(env);
      const ready = database.reachable && database.schemaReady;

      return json(request, {
        ok: ready,
        service: "AI Advokat",
        version: VERSION,
        architecture: "worker-plus-static-assets-plus-d1",
        publicMode: "read_only",
        humanGate: true,
        database
      }, ready ? 200 : 503);
    }

    if (url.pathname === "/api/capabilities") return handleCapabilities(request, env);

    if (url.pathname === "/api/db-status") {
      if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed(request);

      const database = await dbStatus(env);
      const ready = database.reachable && database.schemaReady;
      return json(request, { ok: ready, database }, ready ? 200 : 503);
    }

    if (url.pathname === "/api/search") return handleSearch(request, env, url);
    if (url.pathname === "/api/articles") return handleArticles(request, env, url);
    if (url.pathname === "/api/assistant") return handleAssistant(request, env, url);
    if (url.pathname === "/api/web-sources") return handleWebSources(request);
    if (url.pathname === "/api/zenodo") return handleZenodo(request);
    if (url.pathname === "/api/orcid") return handleOrcid(request);

    if (url.pathname === "/api/citation-audit") {
      return governedPreview(
        request,
        "citation_audit",
        "Citation automation remains locked until the citation registry and review workflow are validated."
      );
    }

    if (url.pathname === "/api/versions") {
      return governedPreview(
        request,
        "version_compare",
        "Version comparison remains locked until verified instrument versions are loaded."
      );
    }

    if (url.pathname === "/api/documents") {
      return governedPreview(
        request,
        "document_upload",
        "Confidential document upload is locked until authentication, encrypted storage, retention controls and access governance are implemented."
      );
    }

    if (url.pathname === "/api/cases") {
      return governedPreview(
        request,
        "case_workspace",
        "Case workspaces are locked until authentication, role-based access, secure storage and audit controls are implemented."
      );
    }

    return json(request, { ok: false, error: "api_not_found" }, 404);
  }
};
