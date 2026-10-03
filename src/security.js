// AI Advokat — security, quota and abuse-prevention primitives.
// Design rules (fail-safe > accurate > auditable > cheap > convenient):
//   * No plaintext IP is ever stored; only an HMAC-SHA256 of it with a server-side salt.
//   * Every quota / rate-limit decision is a single atomic SQL statement (no read -> decide -> write).
//   * Missing secrets fail closed.

export const FREE_MONTHLY_ASSISTANT_QUOTA = 10;
export const ASSISTANT_BURST_LIMIT = 5;          // requests
export const ASSISTANT_BURST_WINDOW_SECONDS = 60;
export const MEMBERSHIP_REQUEST_HOURLY_LIMIT = 3;
export const MEMBERSHIP_REQUEST_DAILY_LIMIT = 10;
export const MIN_SALT_LENGTH = 32;

export class SecurityConfigError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Client identity
// ---------------------------------------------------------------------------

function expandIpv6(address) {
  let addr = address.toLowerCase();
  const zone = addr.indexOf("%");
  if (zone >= 0) addr = addr.slice(0, zone);

  // IPv4-mapped / embedded IPv4 tail (e.g. ::ffff:192.0.2.1)
  const v4Tail = addr.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4Tail) {
    const [a, b, c, d] = v4Tail.slice(1).map(Number);
    if ([a, b, c, d].some((n) => n > 255)) return null;
    const hex = [((a << 8) | b).toString(16), ((c << 8) | d).toString(16)];
    addr = addr.slice(0, addr.length - v4Tail[0].length) + hex.join(":");
  }

  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 && missing !== 0) return null;
  if (missing < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => g.padStart(4, "0"));
}

/**
 * Returns the network prefix used for rate limiting:
 *   IPv4 -> the full address; IPv6 -> the /64 prefix (one customer allocation),
 *   so rotating addresses inside one /64 does not reset the quota.
 * Returns null when the value is not a valid IP address.
 */
export function networkPrefix(ip) {
  const value = String(ip || "").trim();
  if (!value) return null;
  const v4 = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    if (v4.slice(1).some((n) => Number(n) > 255)) return null;
    return `v4:${v4.slice(1).map(Number).join(".")}`;
  }
  if (!value.includes(":")) return null;
  const groups = expandIpv6(value);
  if (!groups) return null;
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) is really an IPv4 client.
  if (groups.slice(0, 5).every((g) => g === "0000") && groups[5] === "ffff") {
    const a = parseInt(groups[6], 16);
    const b = parseInt(groups[7], 16);
    return `v4:${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`;
  }
  return `v6:${groups.slice(0, 4).join(":")}::/64`;
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function saltIsConfigured(env) {
  return typeof env?.RATE_LIMIT_SALT === "string" && env.RATE_LIMIT_SALT.length >= MIN_SALT_LENGTH;
}

/**
 * Privacy-preserving client identifier: "anon:v1:" + HMAC(salt, network prefix).
 * Throws SecurityConfigError when the salt is missing (fail closed) or when the
 * client address cannot be determined.
 */
export async function anonymousSubject(request, env) {
  if (!saltIsConfigured(env)) throw new SecurityConfigError("rate_limit_salt_missing");
  const prefix = networkPrefix(request.headers.get("CF-Connecting-IP"));
  if (!prefix) throw new SecurityConfigError("client_address_unavailable");
  const digest = await hmacHex(env.RATE_LIMIT_SALT, `ai-advokat/v1/${prefix}`);
  return `anon:v1:${digest.slice(0, 40)}`;
}

// ---------------------------------------------------------------------------
// Time helpers (UTC)
// ---------------------------------------------------------------------------

export function currentPeriod(now = new Date()) {
  return now.toISOString().slice(0, 7);
}

export function secondsUntilNextMonth(now = new Date()) {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

function windowStart(now, windowSeconds) {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms).toISOString();
}

function secondsUntilWindowEnds(now, windowSeconds) {
  const ms = windowSeconds * 1000;
  const end = (Math.floor(now.getTime() / ms) + 1) * ms;
  return Math.max(1, Math.ceil((end - now.getTime()) / 1000));
}

// ---------------------------------------------------------------------------
// Atomic fixed-window limiter (D1)
// ---------------------------------------------------------------------------

/**
 * Atomically consumes one slot in a fixed window. Returns {allowed, retryAfter}.
 * A single UPSERT ... WHERE request_count < limit ... RETURNING decides; concurrent
 * callers can never push the counter past `limit`.
 */
export async function consumeWindow(env, { scope, subject, limit, windowSeconds, now = new Date() }) {
  const start = windowStart(now, windowSeconds);
  const result = await env.DB.prepare(
    `INSERT INTO security_rate_limit_windows(scope,subject_key,window_start,request_count,updated_at)
     VALUES (?,?,?,1,CURRENT_TIMESTAMP)
     ON CONFLICT(scope,subject_key,window_start) DO UPDATE SET
       request_count=security_rate_limit_windows.request_count+1,
       updated_at=CURRENT_TIMESTAMP
     WHERE security_rate_limit_windows.request_count < ?
     RETURNING request_count`
  ).bind(scope, subject, start, limit).run();

  const allowed = (result.results ?? []).length > 0;
  return { allowed, retryAfter: allowed ? 0 : secondsUntilWindowEnds(now, windowSeconds) };
}

/** Opportunistic cleanup of expired windows (older than 2 days). */
export async function pruneRateLimitWindows(env) {
  await env.DB.prepare(
    "DELETE FROM security_rate_limit_windows WHERE updated_at < datetime('now','-2 days')"
  ).run();
}

/**
 * Burst protection for the assistant. The optional Cloudflare Rate Limiting
 * binding (ASSISTANT_BURST) is only a cheap, permissive first filter — Cloudflare
 * documents it as eventually consistent and per-location — so the exact D1 window
 * is always enforced as well.
 */
export async function checkAssistantBurst(env, subject, now = new Date()) {
  if (env.ASSISTANT_BURST && typeof env.ASSISTANT_BURST.limit === "function") {
    try {
      const { success } = await env.ASSISTANT_BURST.limit({ key: subject });
      if (!success) return { allowed: false, retryAfter: ASSISTANT_BURST_WINDOW_SECONDS };
    } catch (error) {
      console.error("assistant_burst_binding_failed", String(error?.message || error).slice(0, 120));
    }
  }
  return consumeWindow(env, {
    scope: "assistant_burst",
    subject,
    limit: ASSISTANT_BURST_LIMIT,
    windowSeconds: ASSISTANT_BURST_WINDOW_SECONDS,
    now
  });
}

// ---------------------------------------------------------------------------
// Monthly assistant quota — atomic reservation + compensation
// ---------------------------------------------------------------------------

/**
 * Reserves one assistant request for `subject` in `period` if and only if the
 * counter is below `quota`. Returns {reserved, used}.
 */
export async function reserveMonthlyQuota(env, { subject, period, quota }) {
  const result = await env.DB.prepare(
    `INSERT INTO membership_usage_monthly(subject_key,period_ym,assistant_requests,last_request_at,updated_at)
     VALUES (?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
     ON CONFLICT(subject_key,period_ym) DO UPDATE SET
       assistant_requests=membership_usage_monthly.assistant_requests+1,
       last_request_at=CURRENT_TIMESTAMP,
       updated_at=CURRENT_TIMESTAMP
     WHERE membership_usage_monthly.assistant_requests < ?
     RETURNING assistant_requests`
  ).bind(subject, period, quota).run();

  const row = (result.results ?? [])[0];
  return row ? { reserved: true, used: Number(row.assistant_requests) } : { reserved: false, used: quota };
}

/** Returns one reserved request (used only when the AI provider itself failed). */
export async function releaseMonthlyQuota(env, { subject, period }) {
  await env.DB.prepare(
    `UPDATE membership_usage_monthly
        SET assistant_requests=assistant_requests-1, updated_at=CURRENT_TIMESTAMP
      WHERE subject_key=? AND period_ym=? AND assistant_requests>0`
  ).bind(subject, period).run();
}

// ---------------------------------------------------------------------------
// Turnstile (server-side verification)
// ---------------------------------------------------------------------------

export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TURNSTILE_ACTION = "membership_request";

export async function verifyTurnstile(env, { token, remoteIp, allowedHostnames }) {
  if (typeof env?.TURNSTILE_SECRET !== "string" || !env.TURNSTILE_SECRET) {
    throw new SecurityConfigError("turnstile_secret_missing");
  }
  if (typeof token !== "string" || !token || token.length > 2048) {
    return { ok: false, reason: "turnstile_missing" };
  }

  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  if (remoteIp) form.append("remoteip", remoteIp);

  let outcome;
  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(5000)
    });
    outcome = await response.json();
  } catch (error) {
    console.error("turnstile_verify_failed", String(error?.message || error).slice(0, 120));
    return { ok: false, reason: "turnstile_unavailable" };
  }

  if (!outcome || outcome.success !== true) return { ok: false, reason: "turnstile_invalid" };
  if (outcome.action !== TURNSTILE_ACTION) return { ok: false, reason: "turnstile_action_mismatch" };
  if (!allowedHostnames.has(String(outcome.hostname || "").toLowerCase())) {
    return { ok: false, reason: "turnstile_hostname_mismatch" };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Prompt-injection defences
// ---------------------------------------------------------------------------

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/gu;

export function hasControlCharacters(value) {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/u.test(String(value ?? ""));
}

/**
 * Makes untrusted text safe to place inside a delimited prompt block:
 * removes control / bidi characters and any delimiter-like sequences so the
 * text cannot close its own block or open a fake one.
 */
export function sanitizeForPrompt(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(CONTROL_CHARS, "")
    .replace(/<{2,}|>{2,}|«{2,}|»{2,}|\[{2,}|\]{2,}/gu, " ")
    .replace(/\b(?:END_)?(?:LEGAL_SOURCES|USER_QUESTION|SYSTEM_RULES)\b/giu, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeArticleRef(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("mk")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "");
}

/**
 * Extracts every article number the answer refers to: bracketed citations
 * ([Член 12], [Член 12-а]) and prose references (член 12, членот 12, чл. 12, Article 12).
 */
export function citedArticleNumbers(answer) {
  const found = new Set();
  const text = String(answer ?? "").normalize("NFKC");
  const pattern = /(?<![\p{L}])(?:член(?:от|ови|овите)?|чл\.|article)\s*(\d+(?:\s*[-–—]\s*[\p{L}]{1,3}(?![\p{L}]))?)/giu;
  for (const match of text.matchAll(pattern)) found.add(normalizeArticleRef(match[1]));
  return found;
}

function answerClaimSegments(answer) {
  return String(answer ?? "")
    .normalize("NFKC")
    .split(/\n+|(?<=[.!?])\s+(?=[\p{L}\d\[])/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isMetaOnlySegment(segment) {
  const clean=String(segment ?? "").replace(/^[-*•#\s]+/u,"").trim();
  if(!clean) return true;
  if(/^(?:Краток одговор|Правна основа|Примена(?:\/објаснување)?|Ограничувања(?: и што треба да се провери)?|Заклучок)\s*:?$/iu.test(clean)) return true;

  // Metadata/disclaimer text is ignored only when the entire segment is a
  // recognised disclaimer. A disclaimer prefix must never hide a later claim.
  return /^(?:
    Во\s+достапниот\s+корпус\s+)?(?:
    нема\s+доволна\s+основа(?:\s+во\s+достапниот\s+корпус)?|
    нема\s+доволно\s+релевантен\s+член|
    потребна\s+е\s+дополнителна\s+проверка(?:\s+на\s+официјалните\s+извори)?|
    потребна\s+е\s+човечка\s+професионална\s+проверка|
    ова\s+не\s+е\s+конечен\s+индивидуален\s+правен\s+совет|
    ова\s+е\s+истражувачка\s+помош
  )[.!?]?$/iux.test(clean);
}

const CLAIM_SUPPORT_STOPWORDS = new Set([
  "краток","одговор","правна","основа","примена","објаснување","поврзано","според","член","членот",
  "ова","овој","оваа","овие","тоа","како","дека","кој","која","кое","кои","исто",
  "при","под","над","пред","по","од","до","за","со","без","во","на","и","а","но","или","се","е","го","ја","ги",
  "the","a","an","and","or","of","to","in","for","with","article","according"
]);

function supportStem(token) {
  const clean=String(token ?? "").normalize("NFKC").toLocaleLowerCase("mk").replace(/[^\p{L}\p{N}]/gu,"");
  if(clean.length<4 || CLAIM_SUPPORT_STOPWORDS.has(clean)) return null;
  return clean.length>6 ? clean.slice(0,Math.max(5,clean.length-2)) : clean;
}

function supportStems(text) {
  const out=[];
  for(const token of String(text ?? "").split(/[^\p{L}\p{N}]+/u)){
    const stem=supportStem(token);
    if(stem) out.push(stem);
  }
  return [...new Set(out)];
}

function segmentWithoutCitations(segment) {
  return String(segment ?? "")
    .replace(/\[(?:Член|чл\.|Article)\s*\d+(?:\s*[-–—]\s*[\p{L}]{1,3})?\]/giu," ")
    .replace(/(?<![\p{L}])(?:член(?:от|ови|овите)?|чл\.|article)\s*\d+(?:\s*[-–—]\s*[\p{L}]{1,3})?/giu," ")
    .replace(/^(?:Краток одговор|Правна основа|Примена(?:\/објаснување)?|Ограничувања(?: и што треба да се провери)?|Заклучок|Поврзано)\s*:\s*/iu," ")
    .trim();
}

function legalPolaritySignature(text) {
  const t=String(text ?? "").normalize("NFKC").toLocaleLowerCase("mk");
  return {
    negatedObligation:/\b(?:не\s+(?:е\s+)?долж\w*|не\s+мора|не\s+треба)\b/u.test(t),
    positiveObligation:/\b(?:е\s+долж\w*|мора|треба)\b/u.test(t) && !/\b(?:не\s+(?:е\s+)?долж\w*|не\s+мора|не\s+треба)\b/u.test(t),
    prohibition:/\b(?:не\s+смее|забран\w*)\b/u.test(t),
    permission:/\b(?:може|дозвол\w*|има\s+право)\b/u.test(t) && !/\b(?:не\s+може|нема\s+право)\b/u.test(t),
    deniedPermission:/\b(?:не\s+може|нема\s+право)\b/u.test(t),
    absoluteQualifier:/\b(?:секогаш|никогаш|исклучиво|само|секој|секоја|секое|сите)\b/u.test(t)
  };
}

function legalPolarityCompatible(claim, source) {
  const c=legalPolaritySignature(claim);
  const s=legalPolaritySignature(source);

  if(c.negatedObligation && s.positiveObligation && !s.negatedObligation) return false;
  if(c.positiveObligation && s.negatedObligation && !s.positiveObligation) return false;
  if(c.permission && s.deniedPermission && !s.permission) return false;
  if(c.deniedPermission && s.permission && !s.deniedPermission) return false;
  if(c.prohibition && !s.prohibition) return false;

  // Absolute qualifiers materially strengthen a legal proposition. They must be
  // present in the cited source, otherwise the answer is overclaiming.
  if(c.absoluteQualifier && !s.absoluteQualifier) return false;

  return true;
}

function claimSupport(segment, citedRefs, articleMap) {
  const sourceText=[...citedRefs]
    .map(ref=>articleMap.get(ref)?.text || "")
    .join(" ");
  const claimText=segmentWithoutCitations(segment);
  if(!legalPolarityCompatible(claimText,sourceText)){
    return {ok:false,unsupported:["legal_polarity_or_modality_mismatch"],ratio:0};
  }

  const sourceStems=supportStems(sourceText);
  const claimStems=supportStems(claimText);
  if(!claimStems.length) return {ok:true,unsupported:[]};

  const unsupported=claimStems.filter(stem=>!sourceStems.some(src=>src.startsWith(stem) || stem.startsWith(src)));
  const supported=claimStems.length-unsupported.length;
  const ratio=supported/claimStems.length;

  // Conservative source-entailment proxy: reject when multiple substantive
  // concepts are absent, or when most content words have no source support.
  return {
    ok: unsupported.length<2 && ratio>=0.5,
    unsupported,
    ratio
  };
}

/**
 * Accepts an AI answer only if:
 * 1) it cites at least one retrieved article;
 * 2) every cited article is inside the retrieved corpus;
 * 3) every substantive claim segment carries its own retrieved-article citation; and
 * 4) each extracted claim is lexically grounded in the text of its cited article(s).
 *
 * The final check is deliberately conservative: it is not a legal-entailment model.
 * It exists to prevent a valid citation from laundering unrelated propositions.
 */
export function validateAnswerCitations(answer, articles) {
  const articleMap=new Map();
  for(const a of articles){
    for(const ref of [a.articleNumberNormalized,a.articleNumber].filter(Boolean).map(normalizeArticleRef)){
      articleMap.set(ref,a);
    }
  }
  const allowed=new Set(articleMap.keys());
  const cited=citedArticleNumbers(answer);
  const unexpected=[...cited].filter((n)=>!allowed.has(n));
  if(!cited.size) return {ok:false,reason:"no_citations",unexpected:[],cited:[],claims:[]};
  if(unexpected.length) return {ok:false,reason:"citation_outside_retrieved_corpus",unexpected,cited:[...cited],claims:[]};

  const claims=[];
  const uncovered=[];
  const unsupported=[];

  for(const segment of answerClaimSegments(answer)){
    if(isMetaOnlySegment(segment)) continue;
    const refs=citedArticleNumbers(segment);
    if(!refs.size){
      uncovered.push(segment);
      continue;
    }
    const support=claimSupport(segment,refs,articleMap);
    const claim={text:segment,cited:[...refs],support};
    claims.push(claim);
    if(!support.ok) unsupported.push(claim);
  }

  if(uncovered.length){
    return {ok:false,reason:"uncited_claim_segment",unexpected:[],cited:[...cited],uncovered:uncovered.slice(0,5),claims};
  }
  if(unsupported.length){
    return {
      ok:false,
      reason:"claim_not_grounded_in_cited_source",
      unexpected:[],
      cited:[...cited],
      uncovered:[],
      unsupported:unsupported.slice(0,5),
      claims
    };
  }

  return {ok:true,unexpected:[],cited:[...cited],uncovered:[],unsupported:[],claims};
}
