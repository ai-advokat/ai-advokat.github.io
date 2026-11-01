/* AI Advokat standalone reliability guard.
 * Client-side visibility only: never retries provider calls and never bypasses Human Gate.
 */
const previousFetch = window.fetch.bind(window);
const BOT_PATH = /\/api\/bot(?:\?|$)/;

function isBotRequest(input) {
  const raw = typeof input === 'string' ? input : String(input?.url || '');
  return BOT_PATH.test(raw);
}

function diagnosticId(data) {
  return String(data?.requestId || data?.governanceRunId || '').trim();
}

function dispatchFailure(detail) {
  window.dispatchEvent(new CustomEvent('aiadvokat:bot-runtime-failure', {detail}));
}

window.fetch = async function reliabilityFetch(input, init = {}) {
  if (!isBotRequest(input)) return previousFetch(input, init);

  let response;
  try {
    response = await previousFetch(input, init);
  } catch (error) {
    if (error?.name !== 'AbortError') {
      dispatchFailure({
        code:'network_error',
        status:0,
        message:'Не можам да воспоставам врска со AI runtime. Одговорот не е објавен; обидете се повторно.',
        requestId:null
      });
    }
    throw error;
  }

  let data = null;
  try { data = await response.clone().json(); } catch {}

  if (response.ok && data?.ok === true && !String(data?.answer || '').trim()) {
    const requestId = diagnosticId(data);
    const payload = {
      ok:false,
      error:'empty_success_response',
      message:'AI runtime врати празен одговор. Одговорот не е објавен; обидете се повторно.',
      requestId,
      governanceRunId:requestId || null
    };
    dispatchFailure({code:payload.error,status:502,message:payload.message,requestId});
    return new Response(JSON.stringify(payload), {
      status:502,
      headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
    });
  }

  if (!response.ok || data?.ok === false) {
    dispatchFailure({
      code:String(data?.error || 'runtime_error'),
      status:response.status,
      message:String(data?.message || data?.error || 'AI runtime не успеа безбедно да го заврши барањето.'),
      requestId:diagnosticId(data) || null
    });
  }
  return response;
};

function appendVisibleFailure(detail) {
  const host = document.getElementById('messages');
  if (!host) return;
  const last = host.lastElementChild;
  if (last?.classList?.contains('runtime-failure')) return;

  const article = document.createElement('article');
  article.className = 'message assistant runtime-failure';
  const body = document.createElement('div');
  body.className = 'text';
  body.textContent = String(detail?.message || 'AI runtime не успеа безбедно да го заврши барањето. Одговорот не е објавен.');
  article.append(body);

  const id = String(detail?.requestId || '').trim();
  const meta = document.createElement('small');
  meta.textContent = id ? 'Контролирана грешка · ' + id : 'Контролирана грешка';
  article.append(meta);
  host.append(article);
  article.scrollIntoView({block:'end'});
}

window.addEventListener('aiadvokat:bot-runtime-failure', event => {
  appendVisibleFailure(event.detail || {});
});
