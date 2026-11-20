// Privacy-bounded, hash-addressed UI-string memoization.
// This is isolate-local and best-effort; it never writes to D1, disk, logs,
// or a cross-client cache. It is NOT a persistent/legal-translation cache.
const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_MAX_ENTRIES = 128;
const cache = new Map();

export function uiTranslationCacheEligible(items) {
  if (!Array.isArray(items) || !items.length || items.length > 24) return false;
  if (items.reduce((n, x) => n + String(x?.text || "").length, 0) > 1500) return false;
  return items.every((item) => {
    const text = String(item?.text || "");
    // Only small public UI labels, never files, case narratives or personal identifiers.
    if (!text || text.length > 140 || /[0-9@<>\\/\\\\]|https?:|\\b(?:case|matter|secret|passport|email|personal)\\b|(?:предмет|матичен|пасош|адреса|доверлив|личн[ио])/iu.test(text)) return false;
    return true;
  });
}

export async function uiTranslationCacheKey(target, items) {
  if (!uiTranslationCacheEligible(items)) return null;
  const source = JSON.stringify(["ui-only-v1", target, items.map(x => [x.id, x.text])]);
  const bytes = new TextEncoder().encode(source);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(hash, x => x.toString(16).padStart(2, "0")).join("");
}

export function readCachedUiTranslation(key, now = Date.now()) {
  if (!key) return null;
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= now) { cache.delete(key); return null; }
  return hit.data;
}

export function cacheUiTranslation(key, data, now = Date.now()) {
  if (!key || !data || !Array.isArray(data.translations)) return false;
  if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(key, { expiresAt: now + CACHE_TTL_MS, data: {
    translations: data.translations.map(item => ({ id: item.id, text: item.text })),
    provider: data.provider,
    translationModel: data.translationModel,
    fallbackItemCount: data.fallbackItemCount || 0,
    fallbackTranslationModel: data.fallbackTranslationModel || null
  } });
  return true;
}
