const VERSION = "1.3.2";

const ALLOWED_ORIGINS = new Set([
  "https://ai-advokat.github.io",
  "https://ai-advokat-github-io.aiadvokat16.workers.dev",
  "http://localhost:8787",
  "http://127.0.0.1:8787"
]);

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
    url: "https://ldbis.pravda.gov.mk/Prebaruvanje.aspx",
    category: "ministry",
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

const TEMPLATE_LIBRARY = Object.freeze([
  {
    id: "legal-memo",
    title: "Legal memo skeleton",
    fields: ["issue", "facts", "authorities", "analysis", "counterarguments", "conclusion"]
  },
  {
    id: "chronology",
    title: "Case chronology worksheet",
    fields: ["date", "event", "actor", "document", "source", "status"]
  },
  {
    id: "evidence-map",
    title: "Evidence map worksheet",
    fields: ["fact", "status", "source", "support", "conflict", "human_review"]
  },
  {
    id: "submission-outline",
    title: "Submission outline",
    fields: ["court_or_authority", "parties", "issue", "legal_basis", "requested_action", "attachments"]
  }
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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

function notEnabled(request, capability, message) {
  return json(request, {
    ok: false,
    status: "governed_preview",
    capability,
    message
  }, 503);
}

function clampLimit(value, fallback = 12, max = 30) {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

function cleanQuery(value, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase("mk");
}

function jurisdictionScope(value) {
  const s = normalizeText(value);
  if (!s || s.includes("компаратив") || s.includes("comparative")) return null;
  if (s.includes("северна македонија") || s.includes("north macedonia")) return new Set(["MK"]);
  if (s.includes("европски суд") || s.includes("echr") || s.includes("human rights")) return new Set(["ECHR"]);
  if (s.includes("европска унија") || s.includes("european union") || s === "eu") return new Set(["EU"]);
  return null;
}

function mapStatus(entityType, rawStatus) {
  const s = String(rawStatus ?? "").toLowerCase();
  if (entityType === "source") {
    if (s === "official") return "official";
    if (s === "verified") return "verified";
    return "pending";
  }
  if (entityType === "paper") {
    if (s === "published") return "verified";
    return "pending";
  }
  if (["approved", "reviewed", "current", "final"].includes(s)) return "verified";
  if (["official"].includes(s)) return "official";
  return "pending";
}

async function dbStatus(env) {
  if (!env.DB) {
    return { bound: false, reachable: false, schemaReady: false, schemaVersion: null };
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

    return { bound: true, reachable: true, schemaReady: Boolean(schemaVersion), schemaVersion };
  } catch {
    return { bound: true, reachable: false, schemaReady: false, schemaVersion: null };
  }
}

async function unicodeFallbackRows(env, { q, type = "all", status = "all", jurisdiction = null, perTable = 12 }) {
  const target = normalizeText(q);
  const rows = [];
  const include = (kind) => type === "all" || type === kind;
  const keep = (items) => items.filter((row) => {
    if (!normalizeText(row.search_blob).includes(target)) return false;
    if (status !== "all" && mapStatus(row.entity_type, row.raw_status) !== status) return false;
    return true;
  });
  const pageSize = 250;

  const scan = async (sql, bindings = []) => {
    const matches = [];
    let offset = 0;

    while (matches.length < perTable) {
      const result = await env.DB.prepare(sql).bind(...bindings, pageSize, offset).all();
      const page = result.results ?? [];

      for (const row of keep(page)) {
        matches.push(row);
        if (matches.length >= perTable) break;
      }

      if (page.length < pageSize) break;
      offset += pageSize;
    }

    return matches;
  };

  if (include("source")) {
    rows.push(...await scan(`
      SELECT 'source' AS entity_type, id, title,
             COALESCE(issuing_body, source_type, '') AS meta,
             COALESCE(notes, '') AS snippet, url, jurisdiction,
             source_status AS raw_status, publication_date AS item_date,
             title || ' ' || COALESCE(issuing_body,'') || ' ' || COALESCE(notes,'') AS search_blob
      FROM sources
      WHERE (? IS NULL OR jurisdiction = ?)
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `, [jurisdiction, jurisdiction]));
  }

  if (include("law")) {
    rows.push(...await scan(`
      SELECT 'law' AS entity_type, li.id, li.title,
             trim(COALESCE(li.instrument_type,'') || CASE WHEN li.gazette_reference IS NOT NULL THEN ' | ' || li.gazette_reference ELSE '' END) AS meta,
             COALESCE(li.notes, '') AS snippet, s.url AS url, li.jurisdiction,
             CASE WHEN s.source_status = 'official' THEN 'official' ELSE li.human_review_status END AS raw_status,
             COALESCE(li.effective_date, li.adopted_date) AS item_date,
             li.title || ' ' || COALESCE(li.short_title,'') || ' ' || COALESCE(li.gazette_reference,'') || ' ' || COALESCE(li.notes,'') AS search_blob
      FROM legal_instruments li LEFT JOIN sources s ON s.id = li.canonical_source_id
      WHERE (? IS NULL OR li.jurisdiction = ?)
      ORDER BY li.updated_at DESC
      LIMIT ? OFFSET ?
    `, [jurisdiction, jurisdiction]));
  }

  if (include("case")) {
    rows.push(...await scan(`
      SELECT 'case' AS entity_type, cl.id, cl.case_title AS title,
             trim(cl.court || CASE WHEN cl.case_number IS NOT NULL THEN ' | ' || cl.case_number ELSE '' END) AS meta,
             COALESCE(cl.reasoning_summary, cl.outcome_summary, '') AS snippet,
             COALESCE(cl.source_url, s.url) AS url, cl.jurisdiction,
             CASE WHEN s.source_status = 'official' THEN 'official' ELSE cl.human_review_status END AS raw_status,
             cl.decision_date AS item_date,
             cl.case_title || ' ' || COALESCE(cl.case_number,'') || ' ' || COALESCE(cl.legal_area,'') || ' ' || COALESCE(cl.reasoning_summary,'') || ' ' || COALESCE(cl.outcome_summary,'') AS search_blob
      FROM case_law cl LEFT JOIN sources s ON s.id = cl.source_id
      WHERE (? IS NULL OR cl.jurisdiction = ?)
      ORDER BY cl.decision_date DESC, cl.updated_at DESC
      LIMIT ? OFFSET ?
    `, [jurisdiction, jurisdiction]));
  }

  if (include("paper") && (!jurisdiction || jurisdiction === "MK")) {
    rows.push(...await scan(`
      SELECT 'paper' AS entity_type, id, title,
             trim(author_name || CASE WHEN venue IS NOT NULL THEN ' | ' || venue ELSE '' END) AS meta,
             COALESCE(abstract, '') AS snippet,
             CASE WHEN publication_status = 'published' THEN canonical_url ELSE NULL END AS url,
             'MK' AS jurisdiction, publication_status AS raw_status,
             publication_date AS item_date,
             title || ' ' || COALESCE(subtitle,'') || ' ' || author_name || ' ' || COALESCE(abstract,'') || ' ' || COALESCE(keywords,'') AS search_blob
      FROM publications
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `));
  }

  return rows;
}

async function queryPublicCorpus(env, { q, type = "all", status = "all", jurisdiction = null, limit = 12 }) {
  if (!env.DB) return [];

  const needle = `%${normalizeText(q)}%`;
  const perTable = Math.max(4, Math.ceil(limit / 2));
  const queryLimit = status === "all"
    ? perTable
    : Math.max(80, Math.min(250, perTable * 20));
  const results = [];

  const include = (kind) => type === "all" || type === kind;

  if (include("source")) {
    const stmt = env.DB.prepare(`
      SELECT
        'source' AS entity_type,
        id,
        title,
        COALESCE(issuing_body, source_type, '') AS meta,
        COALESCE(notes, '') AS snippet,
        url,
        jurisdiction,
        source_status AS raw_status,
        publication_date AS item_date
      FROM sources
      WHERE lower(title || ' ' || COALESCE(issuing_body,'') || ' ' || COALESCE(notes,'')) LIKE ?
        AND (? IS NULL OR jurisdiction = ?)
      ORDER BY CASE source_status WHEN 'official' THEN 0 WHEN 'verified' THEN 1 ELSE 2 END, updated_at DESC
      LIMIT ?
    `).bind(needle, jurisdiction, jurisdiction, queryLimit);
    const rows = await stmt.all();
    results.push(...(rows.results ?? []));
  }

  if (include("law")) {
    const stmt = env.DB.prepare(`
      SELECT
        'law' AS entity_type,
        li.id,
        li.title,
        trim(COALESCE(li.instrument_type,'') || CASE WHEN li.gazette_reference IS NOT NULL THEN ' | ' || li.gazette_reference ELSE '' END) AS meta,
        COALESCE(li.notes, '') AS snippet,
        s.url AS url,
        li.jurisdiction,
        CASE WHEN s.source_status = 'official' THEN 'official' ELSE li.human_review_status END AS raw_status,
        COALESCE(li.effective_date, li.adopted_date) AS item_date
      FROM legal_instruments li
      LEFT JOIN sources s ON s.id = li.canonical_source_id
      WHERE lower(li.title || ' ' || COALESCE(li.short_title,'') || ' ' || COALESCE(li.gazette_reference,'') || ' ' || COALESCE(li.notes,'')) LIKE ?
        AND (? IS NULL OR li.jurisdiction = ?)
      ORDER BY li.updated_at DESC
      LIMIT ?
    `).bind(needle, jurisdiction, jurisdiction, queryLimit);
    const rows = await stmt.all();
    results.push(...(rows.results ?? []));
  }

  if (include("case")) {
    const stmt = env.DB.prepare(`
      SELECT
        'case' AS entity_type,
        cl.id,
        cl.case_title AS title,
        trim(cl.court || CASE WHEN cl.case_number IS NOT NULL THEN ' | ' || cl.case_number ELSE '' END) AS meta,
        COALESCE(cl.reasoning_summary, cl.outcome_summary, '') AS snippet,
        COALESCE(cl.source_url, s.url) AS url,
        cl.jurisdiction,
        CASE WHEN s.source_status = 'official' THEN 'official' ELSE cl.human_review_status END AS raw_status,
        cl.decision_date AS item_date
      FROM case_law cl
      LEFT JOIN sources s ON s.id = cl.source_id
      WHERE lower(cl.case_title || ' ' || COALESCE(cl.case_number,'') || ' ' || COALESCE(cl.legal_area,'') || ' ' || COALESCE(cl.reasoning_summary,'') || ' ' || COALESCE(cl.outcome_summary,'')) LIKE ?
        AND (? IS NULL OR cl.jurisdiction = ?)
      ORDER BY cl.decision_date DESC, cl.updated_at DESC
      LIMIT ?
    `).bind(needle, jurisdiction, jurisdiction, queryLimit);
    const rows = await stmt.all();
    results.push(...(rows.results ?? []));
  }

  if (include("paper") && (!jurisdiction || jurisdiction === "MK")) {
    const stmt = env.DB.prepare(`
      SELECT
        'paper' AS entity_type,
        id,
        title,
        trim(author_name || CASE WHEN venue IS NOT NULL THEN ' | ' || venue ELSE '' END) AS meta,
        COALESCE(abstract, '') AS snippet,
        CASE WHEN publication_status = 'published' THEN canonical_url ELSE NULL END AS url,
        'MK' AS jurisdiction,
        publication_status AS raw_status,
        publication_date AS item_date
      FROM publications
      WHERE lower(title || ' ' || COALESCE(subtitle,'') || ' ' || author_name || ' ' || COALESCE(abstract,'') || ' ' || COALESCE(keywords,'')) LIKE ?
      ORDER BY updated_at DESC
      LIMIT ?
    `).bind(needle, queryLimit);
    const rows = await stmt.all();
    results.push(...(rows.results ?? []));
  }

  const normalizeRow = (row) => ({
    entityType: row.entity_type,
    id: row.id,
    title: row.title,
    meta: row.meta,
    snippet: row.snippet,
    url: row.url || null,
    jurisdiction: row.jurisdiction || null,
    status: mapStatus(row.entity_type, row.raw_status),
    rawStatus: row.raw_status || null,
    date: row.item_date || null
  });

  const normalized = results.map(normalizeRow);
  let filtered = status === "all"
    ? normalized
    : normalized.filter((item) => item.status === status);

  const needsUnicodeFallback = Boolean(q) && /[^\u0000-\u007F]/u.test(q);
  if (needsUnicodeFallback && filtered.length < limit) {
    const fallbackRows = await unicodeFallbackRows(env, {
      q,
      type,
      status,
      jurisdiction,
      perTable: Math.max(perTable, limit)
    });
    const seen = new Set(filtered.map((item) => `${item.entityType}:${item.id}`));

    for (const row of fallbackRows) {
      const item = normalizeRow(row);
      if (status !== "all" && item.status !== status) continue;
      const key = `${item.entityType}:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      filtered.push(item);
      if (filtered.length >= limit) break;
    }
  }

  return filtered.slice(0, limit);
}

async function handleSearch(request, env, url) {
  if (request.method !== "GET") return methodNotAllowed(request);

  const q = cleanQuery(url.searchParams.get("q"));
  const type = cleanQuery(url.searchParams.get("type") || "all", 24);
  const status = cleanQuery(url.searchParams.get("status") || "all", 24);
  const limit = clampLimit(url.searchParams.get("limit"));

  if (q.length < 2) {
    return json(request, {
      ok: false,
      error: "query_too_short",
      message: "Use at least two characters."
    }, 400);
  }

  const database = await dbStatus(env);
  if (!database.reachable || !database.schemaReady) {
    return json(request, {
      ok: false,
      error: "database_unavailable",
      database
    }, 503);
  }

  const results = await queryPublicCorpus(env, { q, type, status, limit });
  return json(request, {
    ok: true,
    mode: "d1_public_corpus",
    query: q,
    count: results.length,
    results
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
  const jurisdiction = cleanQuery(body?.jurisdiction || "North Macedonia", 80);
  const researchMode = cleanQuery(body?.mode || "source", 40);

  if (question.length < 4) {
    return json(request, { ok: false, error: "question_too_short" }, 400);
  }

  const database = await dbStatus(env);
  if (!database.reachable || !database.schemaReady) {
    return json(request, { ok: false, error: "database_unavailable", database }, 503);
  }

  const jurisdictionFilter = jurisdictionScope(jurisdiction);
  const jurisdictionCode = jurisdictionFilter ? [...jurisdictionFilter][0] : null;

  let results = await queryPublicCorpus(env, {
    q: question,
    type: researchMode === "case" ? "case" : "all",
    status: "all",
    jurisdiction: jurisdictionCode,
    limit: 8
  });

  if (!results.length) {
    const stop = new Set([
      "koi", "kako", "dali", "shto", "sto", "what", "which", "when", "where", "with", "from",
      "the", "and", "for", "are", "ova", "ovaa", "koga", "kade", "kako", "koja", "koj", "pri"
    ]);
    const terms = question
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((x) => x.length >= 4 && !stop.has(x))
      .slice(0, 6);

    const seen = new Set();
    const combined = [];
    for (const term of terms) {
      const partial = await queryPublicCorpus(env, {
        q: term,
        type: researchMode === "case" ? "case" : "all",
        status: "all",
        jurisdiction: jurisdictionCode,
        limit: 4
      });
      for (const item of partial) {
        const key = `${item.entityType}:${item.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(item);
        }
        if (combined.length >= 8) break;
      }
      if (combined.length >= 8) break;
    }
    results = combined;
  }

  return json(request, {
    ok: true,
    mode: "retrieval_only",
    jurisdiction,
    researchMode,
    question,
    statement: results.length
      ? "Source retrieval completed. No generative legal conclusion was produced."
      : "No matching source was found in the current public corpus. No legal conclusion was produced.",
    sources: results,
    humanGate: [
      "Verify the current legal text and effective date.",
      "Open and read every primary source before relying on a proposition.",
      "Check procedural posture and finality of every cited case.",
      "Distinguish allegations, findings and final judgments.",
      "A qualified human lawyer must approve any final legal conclusion or filing."
    ]
  });
}

async function handleCitationAudit(request, env, url) {
  if (request.method !== "GET") return methodNotAllowed(request);

  const q = cleanQuery(url.searchParams.get("q"), 300);
  if (q.length < 3) {
    return json(request, { ok: false, error: "citation_too_short" }, 400);
  }

  const doiMatch = q.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  const doi = doiMatch ? doiMatch[0].replace(/[.,;)]+$/, "") : null;

  const reserved = doi ? ZENODO_RECORDS.find((x) => x.doi.toLowerCase() === doi.toLowerCase()) : null;
  if (reserved) {
    return json(request, {
      ok: true,
      query: q,
      result: {
        kind: "doi",
        identifier: reserved.doi,
        recordStatus: reserved.status,
        verification: "reserved_draft_metadata",
        publicUrl: null,
        note: "The DOI is reserved in a Zenodo draft. It must not be represented as a published public record until Zenodo publication."
      }
    });
  }

  const database = await dbStatus(env);
  if (!database.reachable || !database.schemaReady) {
    return json(request, {
      ok: true,
      query: q,
      result: {
        kind: doi ? "doi" : "citation",
        identifier: doi,
        verification: "database_not_ready",
        note: "The local citation registry is not ready. Reserved draft DOI metadata remains available above."
      }
    });
  }

  if (doi) {
    const row = await env.DB.prepare(`
      SELECT id, title, author_name, doi, canonical_url, publication_status, human_review_status
      FROM publications
      WHERE lower(doi) = lower(?)
      LIMIT 1
    `).bind(doi).first();

    if (row) {
      return json(request, {
        ok: true,
        query: q,
        result: {
          kind: "doi",
          identifier: doi,
          verification: "local_registry_match",
          title: row.title,
          author: row.author_name,
          publicationStatus: row.publication_status,
          humanReviewStatus: row.human_review_status,
          publicUrl: row.publication_status === "published" ? row.canonical_url : null
        }
      });
    }
  }

  let citationMatches = [];

  if (/[^\u0000-\u007F]/u.test(q)) {
    const target = normalizeText(q);
    const pageSize = 250;
    let offset = 0;

    while (citationMatches.length < 10) {
      const pageResult = await env.DB.prepare(`
        SELECT id, citing_type, citing_id, locator, quotation, support_status, verified_by, verified_at
        FROM citations
        ORDER BY verified_at DESC, created_at DESC
        LIMIT ? OFFSET ?
      `).bind(pageSize, offset).all();

      const page = pageResult.results ?? [];
      for (const row of page) {
        if (
          normalizeText(row.locator).includes(target) ||
          normalizeText(row.quotation).includes(target)
        ) {
          const { quotation, ...publicRow } = row;
          citationMatches.push(publicRow);
          if (citationMatches.length >= 10) break;
        }
      }

      if (page.length < pageSize) break;
      offset += pageSize;
    }
  } else {
    const escaped = q.toLowerCase()
      .replaceAll("\\", "\\\\")
      .replaceAll("%", "\\%")
      .replaceAll("_", "\\_");
    const pattern = `%${escaped}%`;

    citationMatches = (await env.DB.prepare(`
      SELECT id, citing_type, citing_id, locator, support_status, verified_by, verified_at
      FROM citations
      WHERE lower(COALESCE(locator,'')) LIKE ? ESCAPE '\\'
         OR lower(COALESCE(quotation,'')) LIKE ? ESCAPE '\\'
      ORDER BY verified_at DESC, created_at DESC
      LIMIT 10
    `).bind(pattern, pattern).all()).results ?? [];
  }

  return json(request, {
    ok: true,
    query: q,
    result: {
      kind: doi ? "doi" : "citation",
      identifier: doi,
      verification: citationMatches.length ? "citation_registry_matches" : "not_verified",
      matches: citationMatches
    }
  });
}

async function handleVersions(request, env, url) {
  if (request.method !== "GET") return methodNotAllowed(request);

  const database = await dbStatus(env);
  if (!database.reachable || !database.schemaReady) {
    return json(request, { ok: false, error: "database_unavailable", database }, 503);
  }

  const instrumentId = Number.parseInt(url.searchParams.get("instrument_id") || "", 10);
  const q = cleanQuery(url.searchParams.get("q"), 240);

  let instrument = null;
  if (Number.isFinite(instrumentId) && instrumentId > 0) {
    instrument = await env.DB.prepare(`
      SELECT id, title, short_title, jurisdiction, gazette_reference, current_status, human_review_status
      FROM legal_instruments WHERE id = ? LIMIT 1
    `).bind(instrumentId).first();
  } else if (q.length >= 2) {
    instrument = await env.DB.prepare(`
      SELECT id, title, short_title, jurisdiction, gazette_reference, current_status, human_review_status
      FROM legal_instruments
      WHERE lower(title || ' ' || COALESCE(short_title,'')) LIKE ?
      ORDER BY updated_at DESC LIMIT 1
    `).bind(`%${q.toLowerCase()}%`).first();

    if (!instrument) {
      const target = normalizeText(q);
      const pageSize = 250;
      let offset = 0;

      while (!instrument) {
        const candidates = await env.DB.prepare(`
          SELECT id, title, short_title, jurisdiction, gazette_reference, current_status, human_review_status
          FROM legal_instruments
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `).bind(pageSize, offset).all();

        const page = candidates.results ?? [];
        instrument = page.find((row) =>
          normalizeText(`${row.title} ${row.short_title ?? ""}`).includes(target)
        ) ?? null;

        if (instrument || page.length < pageSize) break;
        offset += pageSize;
      }
    }
  } else {
    return json(request, { ok: false, error: "instrument_required" }, 400);
  }

  if (!instrument) {
    return json(request, { ok: true, instrument: null, versions: [], comparisonReady: false });
  }

  const rows = await env.DB.prepare(`
    SELECT id, version_label, valid_from, valid_to, is_current, checksum_sha256,
           human_review_status, substr(COALESCE(text_content,''), 1, 8000) AS text_excerpt
    FROM instrument_versions
    WHERE instrument_id = ?
    ORDER BY COALESCE(valid_from, '0000-00-00') DESC, id DESC
    LIMIT 20
  `).bind(instrument.id).all();

  const versions = rows.results ?? [];
  return json(request, {
    ok: true,
    instrument,
    versions,
    comparisonReady: versions.length >= 2,
    note: versions.length >= 2
      ? "Two or more stored versions are available for human comparison."
      : "At least two verified stored versions are required for comparison."
  });
}

function handleTemplates(request) {
  if (request.method !== "GET") return methodNotAllowed(request);
  return json(request, { ok: true, templates: TEMPLATE_LIBRARY });
}

function handleWebSources(request) {
  if (request.method !== "GET") return methodNotAllowed(request);
  return json(request, {
    ok: true,
    mode: "curated_official_directory",
    sources: PUBLIC_WEB_SOURCES,
    note: "This is a curated source directory, not an unrestricted web-search engine."
  });
}

function handleZenodo(request) {
  if (request.method !== "GET") return methodNotAllowed(request);
  return json(request, {
    ok: true,
    author: ORCID.name,
    orcid: ORCID,
    records: ZENODO_RECORDS,
    note: "Private Zenodo draft/editor URLs are intentionally not exposed by the public API."
  });
}

function handleOrcid(request) {
  if (request.method !== "GET") return methodNotAllowed(request);
  return json(request, { ok: true, orcid: ORCID });
}

async function handleCapabilities(request, env) {
  if (request.method !== "GET") return methodNotAllowed(request);
  const database = await dbStatus(env);

  return json(request, {
    ok: true,
    version: VERSION,
    capabilities: {
      d1: !database.bound ? "not_bound" : !database.reachable ? "unreachable" : database.schemaReady ? "live" : "schema_missing",
      publicSearch: database.reachable && database.schemaReady ? "live" : "blocked",
      retrievalResearch: database.reachable && database.schemaReady ? "limited_production" : "blocked",
      citationAudit: database.reachable && database.schemaReady ? "limited_production" : "limited_static",
      versionCompare: database.reachable && database.schemaReady ? "limited_production" : "blocked",
      officialSourceDirectory: "live",
      templates: "live",
      documentUpload: env.DOCUMENTS ? "not_released" : "governed_preview",
      caseWorkspace: "governed_preview",
      vectorize: env.VECTORIZE ? "bound_not_released" : "not_bound",
      workersAI: env.AI ? "bound_not_released" : "not_bound",
      zenodo: "metadata_only",
      orcid: "live"
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
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (!url.pathname.startsWith("/api/")) {
      return withSecurityHeaders(await env.ASSETS.fetch(request));
    }

    if (url.pathname === "/api/health") {
      if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed(request);
      const database = await dbStatus(env);
      return json(request, {
        ok: database.reachable && database.schemaReady,
        service: "AI Advokat",
        version: VERSION,
        architecture: "worker-plus-static-assets-plus-d1",
        humanGate: true,
        database
      }, database.reachable && database.schemaReady ? 200 : 503);
    }

    if (url.pathname === "/api/capabilities") return handleCapabilities(request, env);

    if (url.pathname === "/api/db-status") {
      if (request.method !== "GET") return methodNotAllowed(request);
      const database = await dbStatus(env);
      return json(request, { ok: database.reachable && database.schemaReady, database }, database.reachable && database.schemaReady ? 200 : 503);
    }

    if (url.pathname === "/api/search") return handleSearch(request, env, url);
    if (url.pathname === "/api/assistant") return handleAssistant(request, env);
    if (url.pathname === "/api/citation-audit") return handleCitationAudit(request, env, url);
    if (url.pathname === "/api/versions") return handleVersions(request, env, url);
    if (url.pathname === "/api/templates") return handleTemplates(request);
    if (url.pathname === "/api/web-sources") return handleWebSources(request);
    if (url.pathname === "/api/zenodo") return handleZenodo(request);
    if (url.pathname === "/api/orcid") return handleOrcid(request);

    if (url.pathname === "/api/documents") {
      return notEnabled(
        request,
        "document_upload",
        "Confidential document upload is not enabled until authentication, encrypted storage, retention controls and access governance are in place."
      );
    }

    if (url.pathname === "/api/cases") {
      return notEnabled(
        request,
        "case_workspace",
        "Case workspaces are not enabled until authentication, role-based permissions, secure storage and audit controls are in place."
      );
    }

    return json(request, { ok: false, error: "api_not_found" }, 404);
  }
};
