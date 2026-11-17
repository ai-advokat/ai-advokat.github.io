import test from "node:test";
import assert from "node:assert/strict";
import { loadWorker } from "./load-worker.mjs";

// Real Worker headers, mocked static assets. No AI provider calls or credentials.
const { worker } = await loadWorker();
const BASE = "https://ai-advokat-github-io.aiadvokat16.workers.dev";
const ACADEMY = "https://ai-advokat.github.io";

async function requestStatic(path, { type = "text/html; charset=utf-8", status = 200, method = "GET" } = {}) {
  const env = {
    ASSETS: {
      fetch: async () => new Response(status === 204 ? null : "synthetic-asset", {
        status,
        headers: {
          "Content-Type": type,
          "X-Frame-Options": "DENY",
          "Cross-Origin-Resource-Policy": "same-origin"
        }
      })
    }
  };
  return worker.fetch(new Request(BASE + path, { method }), env, { waitUntil() {} });
}

function expectBlocked(response) {
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.equal(response.headers.get("Cross-Origin-Resource-Policy"), "same-origin");
  assert.match(response.headers.get("Content-Security-Policy") || "", /frame-ancestors 'none'/);
}

test("Only the existing public bot HTML can be framed by Academy", async () => {
  const response = await requestStatic("/bot/?release=core-r15");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Frame-Options"), null);
  assert.equal(response.headers.get("Cross-Origin-Resource-Policy"), "cross-origin");
  const csp = response.headers.get("Content-Security-Policy") || "";
  assert.match(csp, /frame-ancestors https:\/\/ai-advokat\.github\.io(?:;|$)/);
  assert.doesNotMatch(csp, /frame-ancestors \*/);
  assert.doesNotMatch(csp, /frame-ancestors 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /form-action 'self' mailto:/);
  assert.equal(ACADEMY, "https://ai-advokat.github.io");
});

test("Public bot release redirect is compatible with Academy embedding", async () => {
  const response = await requestStatic("/bot/");
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("X-Frame-Options"), null);
  assert.match(response.headers.get("Location") || "", /\/bot\/\?release=core-r15/);
  assert.match(response.headers.get("Content-Security-Policy") || "", /frame-ancestors https:\/\/ai-advokat\.github\.io/);
});

test("Every other static page, bot subroute and asset stays protected", async () => {
  for (const path of [
    "/", "/academy/", "/bot/index.html", "/bot/private", "/casepilot-workspace.html",
    "/hybrid-legal-intelligence.html", "/assets/standalone-bot.js"
  ]) {
    const response = await requestStatic(path);
    expectBlocked(response);
  }
});

test("Disallowed media, error pages and non-GET requests cannot be framed", async () => {
  expectBlocked(await requestStatic("/bot/?release=core-r15", { type: "application/json" }));
  expectBlocked(await requestStatic("/bot/?release=core-r15", { type: "text/html", status: 404 }));
  expectBlocked(await requestStatic("/bot/?release=core-r15", { type: "text/html", method: "POST" }));
});

test("Microphone permission policy is unchanged for the bot", async () => {
  const response = await requestStatic("/bot/?release=core-r15");
  assert.match(response.headers.get("Permissions-Policy") || "", /microphone=\(self\)/);
});
