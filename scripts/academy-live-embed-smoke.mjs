// Post-deploy, actual Chromium smoke: the real Worker bot must render inside public Academy.
// Never submits a prompt, consumes tokens, accesses private matters or changes records.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const ACADEMY = "https://ai-advokat.github.io/academy/";
const BOT_ORIGIN = "https://ai-advokat-github-io.aiadvokat16.workers.dev";
const executablePath = process.env.BROWSER_EXECUTABLE || "/usr/bin/google-chrome";
const browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
try {
  const results = [];
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    const context = await browser.newContext({ viewport, serviceWorkers: "block" });
    const page = await context.newPage();
    const navigations = [];
    const errors = [];
    page.on("response", response => {
      if (response.url().startsWith(BOT_ORIGIN + "/bot/")) {
        navigations.push({ status: response.status(), url: response.url(), headers: response.headers() });
      }
    });
    page.on("console", message => {
      if (message.type() === "error" && /frame-ancestors|X-Frame-Options|refused to display/i.test(message.text())) errors.push(message.text().slice(0,500));
    });
    await page.goto(ACADEMY + "?embed-uat=" + String(viewport.width), { waitUntil: "domcontentloaded", timeout: 40000 });
    const launcher = page.locator("#academyChatLaunch");
    assert.equal(await launcher.isVisible(), true, "Academy launcher absent");
    assert.equal(await page.locator("#academyChatDialog iframe").count(), 0, "Iframe must not load before click");
    await launcher.click();
    await page.locator("#academyChatDialog[open] iframe").waitFor({ state: "attached", timeout: 20000 });
    const embedded = page.frameLocator("#academyChatDialog iframe");
    await embedded.locator("#question").waitFor({ state: "visible", timeout: 40000 });
    assert.equal(await embedded.locator("#send").count(), 1, "Actual bot composer send control absent");
    const okDocument = navigations.find(entry => entry.status === 200);
    assert.ok(okDocument, "No successful live Worker bot HTML response");
    assert.equal(okDocument.headers["x-frame-options"], undefined, "Bot document still sends a frame-blocking XFO header");
    assert.match(okDocument.headers["content-security-policy"] || "", /frame-ancestors https:\/\/ai-advokat\.github\.io(?:;|$)/);
    assert.equal(errors.length, 0, "Browser rejected Worker framing");
    results.push({ width: viewport.width, height: viewport.height, academyLauncher: "PASS", liveWorkerBotDocument: "PASS", liveBotComposer: "PASS", aiPromptSent: false });
    await context.close();
  }
  console.log("ACADEMY LIVE EMBED PASS", JSON.stringify(results));
} finally {
  await browser.close();
}
