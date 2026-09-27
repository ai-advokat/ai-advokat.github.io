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
const ASSISTANT_SCOPE_MAP = Object.freeze({
  MK: ["MK"],
  ECHR: ["ECHR"],
  EU: ["EU"],
  INTL: ["INTL"],
  COMMONLAW: ["UK", "US", "CA", "AU"],
  COMPARATIVE: null
});
const ASSISTANT_SCOPE_LABELS = Object.freeze({
  MK: "North Macedonia",
  ECHR: "European Court of Human Rights / Council of Europe",
  EU: "European Union law",
  INTL: "Public international law",
  COMMONLAW: "Common Law / Anglo-American comparative law",
  COMPARATIVE: "Cross-jurisdiction comparative law"
});
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
  },
  {
    id: "un-treaty-collection",
    title: "United Nations Treaty Collection",
    url: "https://treaties.un.org/",
    category: "international_treaties",
    jurisdiction: "INTL"
  },
  {
    id: "icj",
    title: "International Court of Justice",
    url: "https://www.icj-cij.org/",
    category: "international_court",
    jurisdiction: "INTL"
  },
  {
    id: "ohchr-juris",
    title: "OHCHR JURIS - UN Treaty Body Jurisprudence",
    url: "https://juris.ohchr.org/",
    category: "international_human_rights",
    jurisdiction: "INTL"
  },
  {
    id: "uk-legislation",
    title: "legislation.gov.uk",
    url: "https://www.legislation.gov.uk/",
    category: "official_legislation",
    jurisdiction: "UK"
  },
  {
    id: "uk-supreme-court",
    title: "UK Supreme Court - Cases",
    url: "https://www.supremecourt.uk/cases",
    category: "court",
    jurisdiction: "UK"
  },
  {
    id: "us-supreme-court",
    title: "Supreme Court of the United States - Opinions",
    url: "https://www.supremecourt.gov/opinions/opinions.aspx",
    category: "court",
    jurisdiction: "US"
  },
  {
    id: "canada-justice-laws",
    title: "Justice Laws Website - Canada",
    url: "https://laws-lois.justice.gc.ca/eng/",
    category: "official_legislation",
    jurisdiction: "CA"
  },
  {
    id: "australia-legislation",
    title: "Federal Register of Legislation - Australia",
    url: "https://www.legislation.gov.au/",
    category: "official_legislation",
    jurisdiction: "AU"
  },
  {
    id: "high-court-australia",
    title: "High Court of Australia - Judgments",
    url: "https://www.hcourt.gov.au/cases-and-judgments/judgments",
    category: "court",
    jurisdiction: "AU"
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

function resolveAssistantScope(value) {
  const raw = cleanQuery(value || "MK", 80);
  const upper = raw.toUpperCase();

  if (ASSISTANT_SCOPE_MAP[upper] !== undefined) {
    return {
      code: upper,
      label: ASSISTANT_SCOPE_LABELS[upper],
      jurisdictions: ASSISTANT_SCOPE_MAP[upper]
    };
  }

  const normalized = normalizeText(raw);
  let code = "MK";
  if (normalized.includes("европски суд") || normalized.includes("echr") || normalized.includes("human rights")) code = "ECHR";
  else if (normalized.includes("европска унија") || normalized.includes("european union")) code = "EU";
  else if (normalized.includes("меѓународ") || normalized.includes("international")) code = "INTL";
  else if (normalized.includes("common law") || normalized.includes("англо") || normalized.includes("anglo")) code = "COMMONLAW";
  else if (normalized.includes("компаратив") || normalized.includes("comparative")) code = "COMPARATIVE";

  return {
    code,
    label: ASSISTANT_SCOPE_LABELS[code],
    jurisdictions: ASSISTANT_SCOPE_MAP[code]
  };
}

function assistantDirectories(scope) {
  if (!scope.jurisdictions) return PUBLIC_WEB_SOURCES;
  const allowed = new Set(scope.jurisdictions);
  return PUBLIC_WEB_SOURCES.filter((source) => allowed.has(source.jurisdiction));
}

async function queryAssistantScope(env, { q, type, status, scope, limit }) {
  if (!scope.jurisdictions) {
    return queryPublicCorpus(env, {
      q,
      type,
      status,
      jurisdiction: null,
      limit
    });
  }

  const results = [];
  const seen = new Set();

  for (const jurisdiction of scope.jurisdictions) {
    const partial = await queryPublicCorpus(env, {
      q,
      type,
      status,
      jurisdiction,
      limit
    });

    for (const item of partial) {
      const key = `${item.entityType}:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(item);
      if (results.length >= limit) return results;
    }
  }

  return results;
}

function assistantTerms(question) {
  const stop = new Set([
    "кои","која","кој","како","дали","што","што","ова","оваа","кога","каде","при","или","има","може",
    "what","which","when","where","with","from","the","and","for","are","this","that","does","can","law","legal"
  ]);

  return normalizeText(question)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length >= 4 && !stop.has(term))
    .slice(0, 8);
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

async function handleAssistant(request, env) {
  if (request.method !== "POST") return methodNotAllowed(request);

  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, { ok: false, error: "invalid_json" }, 400);
  }

  const question = cleanQuery(body?.question, 1200);
  const researchMode = cleanQuery(body?.mode || "source", 40);
  const language = cleanQuery(body?.language || "mk", 8).toLowerCase() === "en" ? "en" : "mk";
  const scope = resolveAssistantScope(body?.jurisdiction || "MK");

  if (question.length < 4) {
    return json(request, {
      ok: false,
      error: "question_too_short",
      message: language === "en" ? "Enter a longer legal question." : "Внесете подолго правно прашање."
    }, 400);
  }

  const database = await dbStatus(env);
  if (!database.reachable || !database.schemaReady) {
    return json(request, { ok: false, error: "database_unavailable", database }, 503);
  }

  const type = researchMode === "case" ? "case" : "all";
  let results = await queryAssistantScope(env, {
    q: question,
    type,
    status: "all",
    scope,
    limit: 8
  });

  if (!results.length) {
    const seen = new Set();
    const combined = [];

    for (const term of assistantTerms(question)) {
      const partial = await queryAssistantScope(env, {
        q: term,
        type,
        status: "all",
        scope,
        limit: 4
      });

      for (const item of partial) {
        const key = `${item.entityType}:${item.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        combined.push(item);
        if (combined.length >= 8) break;
      }
      if (combined.length >= 8) break;
    }

    results = combined;
  }

  const directories = assistantDirectories(scope).map((source) => ({
    title: source.title,
    url: source.url,
    category: source.category,
    jurisdiction: source.jurisdiction
  }));

  const found = results.length > 0;
  const statement = language === "en"
    ? (found
        ? `Retrieved ${results.length} source record(s) from the verified public corpus. No generative legal conclusion was produced.`
        : "No matching indexed source was found in the current corpus. Official starting points are provided below; no legal conclusion was produced.")
    : (found
        ? `Пронајдени се ${results.length} изворни записи од проверениот јавен корпус. Не е генериран автоматски конечен правен заклучок.`
        : "Во тековниот корпус не е пронајден соодветен индексиран извор. Подолу се дадени официјални појдовни извори; не е генериран правен заклучок.");

  const humanGate = language === "en"
    ? [
        "Verify the current legal text, amendment history and effective date.",
        "Open and read every primary source before relying on a proposition.",
        "Check jurisdiction, procedural posture and finality of every cited decision.",
        "Keep Macedonian, ECHR/EU, international and comparative Common Law authorities legally distinct.",
        "A qualified human lawyer must approve any final legal conclusion, advice or filing."
      ]
    : [
        "Проверете го важечкиот текст, историјата на измените и датумот на важност.",
        "Отворете го и прочитајте го секој примарен извор пред да се потпрете на правно тврдење.",
        "Проверете ја јурисдикцијата, процесната положба и правосилноста на секоја цитирана одлука.",
        "Македонските, ЕСПЧ/ЕУ, меѓународните и компаративните Common Law извори мора правно да останат разграничени.",
        "Конечниот правен заклучок, совет или поднесок мора да го одобри квалификуван адвокат."
      ];

  return json(request, {
    ok: true,
    mode: "retrieval_only",
    sourcePolicy: "macedonian_law_first",
    question,
    researchMode,
    scope: {
      code: scope.code,
      label: scope.label,
      jurisdictions: scope.jurisdictions
    },
    statement,
    sources: results,
    officialDirectories: directories,
    humanGate
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
      retrievalAssistant: database.reachable && database.schemaReady ? "live_retrieval_only" : "blocked",
      citationAudit: "governed_preview",
      versionCompare: "governed_preview",
      documentUpload: "locked",
      caseWorkspace: "locked",
      vectorize: "not_bound",
      workersAI: "not_bound"
    }
  });
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://ai-advokat-github-io.aiadvokat16.workers.dev; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' mailto:"
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
    if (url.pathname === "/api/web-sources") return handleWebSources(request);
    if (url.pathname === "/api/zenodo") return handleZenodo(request);
    if (url.pathname === "/api/orcid") return handleOrcid(request);

    if (url.pathname === "/api/assistant") return handleAssistant(request, env);

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
