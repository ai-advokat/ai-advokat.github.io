// A3.19 governed source-discovery candidate adapted from Zoki's 2026-11-16
// package. No article text, source PDF or original corpus is bundled here.
// OFFLINE/STAGING ONLY until Human Gate; never issue new legal authority.
export const A319_DISCOVERY_GATE_VERSION = 'A319_DISCOVERY_PRESERVE_REVIEWED_SOURCES_RC1';
const HOLD = 'LEGAL_HOLD';
const SHA = /^[a-f0-9]{64}$/i;
const ARTICLE_IDS = [...Array.from({length: 50}, (_, i) => String(i + 1)), '34-а', '34-б', '34-в'];
function clean(value) { return typeof value === 'string' ? value.trim() : ''; }
function norm(value) { return clean(value).normalize('NFC').toLocaleLowerCase('mk'); }
async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function validateA319Corpus(data) {
  const errors = [];
  if (data?.schema !== 'paragraf.a318.corpus.v1' || !Array.isArray(data.articles)) {
    return {ok:false, count:0, errors:['invalid_schema']};
  }
  if (data.production !== 'NO_GO' || data.subsequent_amendments !== 'NOT_EXHAUSTIVELY_VERIFIED') {
    errors.push('unsafe_corpus_status');
  }
  if (data.articles.length !== ARTICLE_IDS.length) errors.push('article_count_not_53');
  const ids = new Set();
  for (const article of data.articles) {
    if (!article || typeof article !== 'object') { errors.push('invalid_article'); continue; }
    const id = String(article.article_id ?? '');
    if (!ARTICLE_IDS.includes(id)) errors.push('invalid_article_id');
    if (ids.has(id)) errors.push('duplicate_article');
    ids.add(id);
    if (article.legal_status !== HOLD || article.authorized_for_ai_citation !== false || article.human_review !== 'PENDING') {
      errors.push('approval_tampering:' + id);
    }
    if (typeof article.text !== 'string' || !article.text.startsWith('Член ')) {
      errors.push('invalid_text:' + id);
    } else if (!SHA.test(article.text_sha256 ?? '') || (await sha256(article.text)) !== article.text_sha256.toLowerCase()) {
      errors.push('text_sha_mismatch:' + id);
    }
  }
  for (const id of ARTICLE_IDS) if (!ids.has(id)) errors.push('missing:' + id);
  return {ok:errors.length === 0, count:data.articles.length, errors:[...new Set(errors)]};
}

export function retrieveA319(data, query, {limit=5}={}) {
  if (!Array.isArray(data?.articles)) return [];
  const q = clean(query).slice(0, 300);
  if (!q) return [];
  const numbered = q.match(/(?:член(?:от|ови)?\s*)(34[-‐‑–—]?\s*[абв]|[1-9]\d?)/iu);
  const requested = numbered?.[1].replace(/[‐‑–—]/gu,'-').replace(/\s+/gu,'').toLocaleLowerCase('mk') ?? null;
  // Never turn an explicit unavailable article number into an unrelated text match.
  if (requested && !ARTICLE_IDS.includes(requested)) return [];
  const terms = norm(q).split(/[^\p{L}\p{N}]+/u).filter(t => t.length >= 4).slice(0, 12);
  return data.articles.map(article => {
    if (requested && article.article_id !== requested) return null;
    const text = norm(article.text);
    const score = (requested ? 100 : 0) + terms.filter(t => text.includes(t)).length;
    return score ? {article,score} : null;
  }).filter(Boolean)
    .sort((a,b) => b.score - a.score || a.article.article_id.localeCompare(b.article.article_id, 'mk'))
    .slice(0, Math.max(1, Math.min(10, Number(limit) || 5)))
    .map(x => x.article);
}

export async function a319AttachCorpusToChat({corpus, chatResponse, question}={}) {
  const validation = await validateA319Corpus(corpus);
  if (!validation.ok) return {ok:false, error:'CORPUS_VALIDATION_FAILED', reasons:validation.errors,
    discoveryOnly:true, humanGateRequired:true};
  if (!chatResponse || typeof chatResponse !== 'object' || Array.isArray(chatResponse)) {
    return {ok:false, error:'INVALID_CHAT_RESPONSE'};
  }
  const matched = retrieveA319(corpus, question ?? '', {limit:5});
  const discovered = matched.map(article => ({
    instrument:'Закон за бесплатна правна помош',
    articleId:article.article_id,
    textSha256:article.text_sha256,
    legalStatus:HOLD,
    humanReviewStatus:'PENDING',
    verifiedLegalCitation:false,
    authorizedForAiCitation:false,
    discoveryOnly:true,
    // Deliberately no raw text or authoritative URL until item-level legal review.
  }));
  // CRITICAL: preserve the original answer and independently reviewed source
  // metadata exactly. In particular, do not mutate legalSources or overwrite
  // legalSourceVerification on an otherwise verified chat response.
  return {
    ok:true,
    matched:discovered.length,
    gateVersion:A319_DISCOVERY_GATE_VERSION,
    chatResponse:{
      ...chatResponse,
      a319DiscoveryOnly:{
        status:HOLD,
        authoritativeCitationAllowed:false,
        humanGateRequired:true,
        sources:discovered,
        warning:'Работен корпус за пронаоѓање; не е верификуван тековен законски текст или дозволена правна цитатна основа.'
      }
    }
  };
}
