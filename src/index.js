const VERSION = "1.1.0";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "same-origin"
    }
  });
}

function methodNotAllowed() {
  return json({ ok: false, error: "method_not_allowed" }, 405);
}

function notEnabled(capability) {
  return json({
    ok: false,
    status: "not_enabled",
    capability,
    message: "The endpoint is reserved, but its production data/AI binding has not been enabled yet."
  }, 501);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname === "/api/health") {
      if (request.method !== "GET" && request.method !== "HEAD") return methodNotAllowed();
      return json({
        ok: true,
        service: "AI Advokat",
        version: VERSION,
        architecture: "worker-plus-static-assets",
        humanGate: true
      });
    }

    if (url.pathname === "/api/capabilities") {
      if (request.method !== "GET") return methodNotAllowed();
      return json({
        ok: true,
        version: VERSION,
        capabilities: {
          search: "reserved",
          assistant: "reserved",
          documents: "reserved",
          zenodo: "reserved",
          d1: "not-bound",
          r2: "not-bound",
          vectorize: "not-bound",
          workersAI: "not-bound"
        }
      });
    }

    if (url.pathname === "/api/search") return notEnabled("search");
    if (url.pathname === "/api/assistant") return notEnabled("assistant");
    if (url.pathname === "/api/documents") return notEnabled("documents");
    if (url.pathname === "/api/zenodo") return notEnabled("zenodo");

    return json({ ok: false, error: "api_not_found" }, 404);
  }
};
