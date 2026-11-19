/** Browser-only display integrity gate. Not independent provider attestation. */
export function assertDisplayableLegalResponse(data) {
  const fail = () => { const err = new Error('Серверот не достави проверлив одговор за приказ. Не е издадено правно мислење.'); err.code='RESPONSE_INTEGRITY_GATE'; return err; };
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.ok !== true || typeof data.answer !== 'string' || !data.answer.trim()) throw fail();
  // Deny explicit local/mock evidence, but permit governed corpus-only responses
  // legitimately returned without invoking a language model.
  const denied = new Set(['SYNTHETIC','SYNTHETIC_LOCAL_TEST','SYNTHETIC_LOCAL_ONLY','SYNTHETIC_VALIDATION_ONLY','LOCAL_MOCK','MOCK','TEST_ONLY']);
  for (const field of [data.provider,data.model,data.sourceMode,data.mode,data.fast27Evidence?.serverMode]) {
    const value = String(field ?? '').trim().toUpperCase();
    if (denied.has(value) || value.startsWith('SYNTHETIC_')) throw fail();
  }
  // An explicit synthetic response cannot be promoted merely by changing provider metadata.
  if (data.fast27Evidence?.serverMode || data.liveProvider === false && data.legalAnswerGenerated === false || /^\s*\[?СИНТЕТИЧКИ ТЕСТ/i.test(data.answer)) throw fail();
  if (data.legalGovernance?.production === 'NO_GO' && data.modelInvoked === false && data.sourceMode === 'SYNTHETIC') throw fail();
  // The top-level response envelope may independently signal refusal. A successful
  // HTTP status or ok:true cannot override these explicit denial flags.
  const deniedStatuses = new Set(['LEGAL_HOLD', 'BLOCKED', 'REJECTED', 'NO_GO']);
  for (const statusField of [data.status, data.releaseStatus, data.legalStatus]) {
    if (deniedStatuses.has(String(statusField ?? '').trim().toUpperCase())) throw fail();
  }
  if (data.releaseAllowed === false || data.authorized === false || data.success === false) throw fail();
  // Object-shaped errors are refusals too; avoid displaying a misleading draft.
  if (data.error && typeof data.error === 'object') throw fail();
  // Explicit denial of legal release must prevail over HTTP 200 and non-empty text.
  // An OPEN human gate alone does NOT block a draft: only an affirmative legal hold does.
  const governance = data.legalGovernance;
  if (governance && typeof governance === 'object') {
    const status = String(governance.status ?? '').trim().toUpperCase();
    if (deniedStatuses.has(status) || governance.releaseAllowed === false || governance.authorized === false) throw fail();
  }
  if (data.legalAnswerGenerated === false || data.answerIsSynthetic === true || data.synthetic === true) throw fail();
  // Ambiguous success-with-error objects must not be rendered as legal advice.
  if (typeof data.error === 'string' && data.error.trim()) throw fail();
  return data;
}
