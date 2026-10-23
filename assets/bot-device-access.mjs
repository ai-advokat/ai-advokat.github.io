const NAME = 'aiAdvokatBotDeviceAccessV1';
const TTL = 7 * 24 * 60 * 60 * 1000;
export function forgetDeviceAccess(storage) {
  try { storage.removeItem(NAME); } catch {}
}
export function saveDeviceAccess(storage, token, now = Date.now()) {
  try {
    storage.setItem(NAME, JSON.stringify({token, expires:now + TTL}));
    return true;
  } catch { return false; }
}
export function readDeviceAccess(storage, now = Date.now()) {
  try {
    const data = JSON.parse(storage.getItem(NAME) || 'null');
    if (!data) return '';
    if (typeof data.token !== 'string' || !data.token || !Number.isFinite(data.expires) || data.expires <= now || data.expires > now + TTL) {
      forgetDeviceAccess(storage); return '';
    }
    return data.token;
  } catch { forgetDeviceAccess(storage); return ''; }
}
