// Public-layer regression tests (static front end). No browser and no dependencies:
// these tests read the HTML/JS sources and the Worker sources and check the contracts
// between them, the publication-status facts, link integrity and accessibility basics.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadWorker } from "./load-worker.mjs";

const { workerModule, security } = await loadWorker();
const read = (p) => fs.readFileSync(p, "utf8");
const PAGES = [
  "index.html", "membership.html", "legal-notice.html", "privacy-policy.html", "ai-use-policy.html", "offline.html", "guides/index.html",
  "scholar/index.html", "scholar/sindzir/index.html", "scholar/electronic-ai-evidence/index.html",
  "scholar/mobile-phone-privilege/index.html", "scholar/ai-legal-practice-judiciary/index.html"
];
const SCHOLAR = PAGES.filter((p) => /^scholar\/.+\/index\.html$/.test(p));
const index = read("index.html");
const worker = read("src/index.js");
const versions = read("src/corpus-versions.js");
const KOCANI_DOI = "10.5281/zenodo.22981554";
const stripScripts = (html) => html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
const PUBLISHED = workerModule.ZENODO_RECORDS.filter((r) => r.status === "published");

describe("frontend ↔ API contract", () => {
  test("FC1 every error code /api/assistant can return has a UI state (no silent 'service unavailable')", () => {
    const handler = worker.slice(worker.indexOf("async function handleAssistant("), worker.indexOf("function handleWebSources("));
    const codes = new Set([
      ...[...handler.matchAll(/error:\s*"([a-z_]+)"/g)].map((m) => m[1]),
      ...[...handler.matchAll(/assistantError\(request,\s*\d+,\s*"([a-z_]+)"/g)].map((m) => m[1]),
      ...[...versions.matchAll(/^\s{2}([a-z_]+):\s*"/gm)].map((m) => m[1]).filter((c) => c.startsWith("version_") || c === "no_articles"),
      "free_quota_exhausted", "membership_quota_exhausted", "method_not_allowed"
    ]);
    const statesBlock = index.slice(index.indexOf("const ASSISTANT_STATES={"), index.indexOf("const UNAVAILABLE_STATE"));
    const missing = [...codes].filter((c) => !new RegExp(`\\b${c}:\\{`).test(statesBlock));
    assert.deepEqual(missing, [], `UI has no state for: ${missing.join(", ")}`);
    assert.ok(codes.size >= 20, `expected the full code set, got ${codes.size}`);
  });

  test("FC2 the assistant request body uses only fields the Worker reads (q, instrument, date)", () => {
    const body = index.match(/body:JSON\.stringify\(\{q,instrument:[^)]*\)/);
    assert.ok(body, "assistant request body not found");
    const accepted = new Set([...worker.slice(worker.indexOf("async function handleAssistant("), worker.indexOf("function handleWebSources(")).matchAll(/payload\.([a-zA-Z]+)/g)].map((m) => m[1]));
    for (const f of ["q", "instrument", "date"]) assert.ok(accepted.has(f), `Worker does not read payload.${f}`);
    assert.ok(!/body:JSON\.stringify\(\{q,instrument:"mk:zro"\}\)/.test(index), "instrument must not be hard-coded");
  });

  test("FC3 search filter options are subsets of the Worker's VALID_TYPES / VALID_STATUSES", () => {
    const set = (name) => new Set(JSON.parse(worker.match(new RegExp(`const ${name} = new Set\\((\\[[^\\]]*\\])\\)`))[1]));
    const options = (id) => [...index.match(new RegExp(`<select id="${id}"[^>]*>([\\s\\S]*?)</select>`))[1].matchAll(/value="([^"]+)"/g)].map((m) => m[1]);
    const types = set("VALID_TYPES"), statuses = set("VALID_STATUSES");
    for (const v of options("typeFilter")) assert.ok(types.has(v), `type option '${v}' is not accepted by /api/search`);
    for (const v of options("statusFilter")) assert.ok(statuses.has(v), `status option '${v}' is not accepted by /api/search`);
  });

  test("FC4 the UI never labels a version 'current' unless it is current AND Human-Gate approved", () => {
    const fn = index.slice(index.indexOf("function versionCurrencyText("), index.indexOf("function citationStatusLabel("));
    assert.match(fn, /v\.isCurrent && v\.humanReviewStatus==="approved"\) return T\("ТЕКОВНА/);
    assert.match(fn, /НЕ е потврдена преку Human Gate/);
    const cit = index.slice(index.indexOf("function citationStatusLabel("), index.indexOf("function versionList("));
    assert.match(cit, /c\.status==="current_consolidated" && approved\) return T\("ТЕКОВЕН · ПРОВЕРЕН"/);
  });

  test("FC5 refusals render no answer text (fail-closed message on every state)", () => {
    const fn = index.slice(index.indexOf("function renderAssistantState("), index.indexOf("function renderAssistantAnswer("));
    assert.match(fn, /Не е генериран правен одговор\./);
    assert.ok(!/data\.answer/.test(fn), "refusal renderer must not print an answer");
  });

  test("FC6 the search box queries the live public corpus and labels the local fallback honestly", () => {
    assert.match(index, /new URL\(API_BASE\+"\/api\/search"\)/);
    const fallback = index.slice(index.indexOf("data:[", index.indexOf("const dynamicContent")), index.indexOf("en:{", index.indexOf("const dynamicContent")));
    assert.ok(!/status:"official"/.test(fallback), "local fallback entries must never be labelled official");
    assert.match(index, /Прикажани се само локалните записи/);
  });

  test("FC7 removed decorative controls stay removed (jurisdiction / research mode were never sent to the API)", () => {
    assert.ok(!/id="jurisdiction"/.test(index));
    assert.ok(!/id="researchMode"/.test(index));
  });
});

describe("publication status facts", () => {
  test("PS1 the homepage and Scholar pages never show the reserved Kočani DOI", () => {
    for (const p of ["index.html", "scholar/index.html", ...SCHOLAR]) assert.ok(!read(p).includes(KOCANI_DOI), p);
    assert.ok(!read("sitemap.xml").includes("kocani"));
  });

  test("PS2 the Kočani card is a draft without DOI, Scholar page or citation", () => {
    const pubs = index.slice(index.indexOf("publications:["), index.indexOf("data:[", index.indexOf("publications:[")));
    const kocani = pubs.match(/\{title:"Кочани[^}]*\}/)[0];
    assert.match(kocani, /doi:""/);
    assert.match(kocani, /published:false/);
    assert.match(kocani, /badge:"НАЦРТ · НЕ Е ОБЈАВЕН"/);
    assert.ok(/if\(!pub\.published \|\| !meta\) return "";/.test(index), "citations only for published works");
  });

  test("PS3 every published DOI has a Scholar page whose citation meta and JSON-LD agree", () => {
    for (const rec of PUBLISHED) {
      const page = SCHOLAR.find((p) => read(p).includes(`name="citation_doi" content="${rec.doi}"`));
      assert.ok(page, `no Scholar page for ${rec.doi}`);
      const html = read(page);
      const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
      assert.equal(ld["@type"], "ScholarlyArticle");
      assert.equal(ld.identifier.value, rec.doi);
      assert.equal(ld.headline, html.match(/name="citation_title" content="([^"]*)"/)[1].replace(/&quot;/g, '"'));
      assert.equal(ld.datePublished, html.match(/name="DC.date" content="([^"]*)"/)[1]);
      assert.equal(ld.url, html.match(/rel="canonical" href="([^"]*)"/)[1]);
      assert.ok(html.includes(`https://doi.org/${rec.doi}`), `${page} must link the DOI resolver`);
      assert.ok(index.includes(`"${rec.doi}":{scholar:`), `homepage has no Scholar mapping for ${rec.doi}`);
    }
  });

  test("PS4 structured data never claims legal services or attorney representation", () => {
    for (const p of PAGES) {
      for (const m of read(p).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        const json = JSON.parse(m[1]);
        assert.ok(!/LegalService|Attorney|LegalAidService/.test(JSON.stringify(json)), `${p}: forbidden schema type`);
      }
    }
  });
});

describe("membership page matches the Worker", () => {
  const plans = {};
  for (const m of worker.matchAll(/(\w+): \{ code:"(\w+)", name:"\w+", monthlyPriceMkd:(\d+), annualPriceMkd:(\d+), monthlyQuota:(\w+), seats:(\d+), trialDays:(\d+) \}/g)) {
    plans[m[2]] = { monthly: Number(m[3]), annual: Number(m[4]), quota: m[5] === "FREE_MONTHLY_ASSISTANT_QUOTA" ? security.FREE_MONTHLY_ASSISTANT_QUOTA : Number(m[5]), seats: Number(m[6]), trial: Number(m[7]) };
  }
  const html = read("membership.html");
  const fmt = (n) => n.toLocaleString("de-DE");

  test("MP1 the comparison table lists exactly the Worker's prices, quotas, seats and trial", () => {
    assert.deepEqual(Object.keys(plans).sort(), ["free", "office", "pro", "start"]);
    for (const [code, p] of Object.entries(plans)) {
      const row = html.match(new RegExp(`<tr><th scope="row">${code.toUpperCase()}</th>([\\s\\S]*?)</tr>`));
      assert.ok(row, `no comparison row for ${code}`);
      const cells = [...row[1].matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((m) => m[1]);
      assert.equal(cells[0], fmt(p.monthly), `${code} monthly`);
      assert.equal(cells[1], fmt(p.annual), `${code} annual`);
      assert.equal(cells[2], fmt(p.quota), `${code} quota`);
      assert.equal(cells[3], String(p.seats), `${code} seats`);
      assert.equal(cells[4].startsWith(String(p.trial)), p.trial > 0, `${code} trial`);
      assert.equal(p.annual, p.monthly * 10, `${code}: the page says annual = 10 monthly payments`);
    }
  });

  test("MP2 no card payments, no automatic renewal, Human Gate activation are stated", () => {
    assert.match(html, /нема картички/);
    assert.match(html, /нема автоматско обновување/);
    assert.match(html, /Human Gate/);
    assert.ok(!/name="(card|cc|cardNumber|cvv|iban)"/i.test(html), "no payment fields");
  });

  test("MP3 every membership form control has a label; e-mail is required and described", () => {
    for (const id of ["displayName", "email", "organizationName", "planCode", "billingCycle", "membershipKey"]) {
      assert.match(html, new RegExp(`<label for="${id}"`), id);
    }
    assert.match(html, /id="email"[^>]*required[^>]*aria-describedby="emailHint"/);
  });
});

describe("links and metadata", () => {
  const exists = (href, from) => {
    const clean = href.split("#")[0].split("?")[0];
    if (!clean) return true;
    const rel = clean.startsWith("/") ? clean.slice(1) : path.join(path.dirname(from), clean);
    const target = rel === "" || rel.endsWith("/") ? path.join(rel, "index.html") : rel;
    return fs.existsSync(target);
  };

  test("LM1 every internal href/src in the static pages resolves to a file", () => {
    const broken = [];
    for (const p of PAGES) {
      for (const m of stripScripts(read(p)).matchAll(/\b(?:href|src|srcset)="([^"]+)"/g)) {
        const v = m[1];
        if (/^(https?:|mailto:|#|data:)/.test(v)) continue;
        if (!exists(v, p)) broken.push(`${p} → ${v}`);
      }
    }
    assert.deepEqual(broken, []);
  });

  test("LM2 in-page anchors point at existing ids", () => {
    for (const p of PAGES) {
      const html = read(p);
      const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
      for (const m of stripScripts(html).matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(m[1]), `${p}: #${m[1]} has no target`);
    }
  });

  test("LM3 external links that open a new tab use rel=noopener", () => {
    for (const p of PAGES) {
      for (const m of read(p).matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) assert.match(m[0], /rel="[^"]*noopener/, `${p}: ${m[0]}`);
    }
  });

  test("LM4 sitemap.xml and sitemap.txt list the same URLs and every URL is a real page", () => {
    const xml = [...read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
    const txt = read("sitemap.txt").split(/\r?\n/).filter(Boolean).sort();
    assert.deepEqual(xml, txt);
    for (const u of xml) assert.ok(exists(u.replace("https://ai-advokat.github.io", ""), "index.html"), u);
    assert.match(read("robots.txt"), /Disallow: \/api\//);
  });

  test("LM5 indexable pages have a canonical URL, a description and a title", () => {
    for (const p of PAGES.filter((x) => x !== "offline.html")) {
      const html = read(p);
      assert.match(html, /<link rel="canonical" href="https:\/\/ai-advokat\.github\.io\//, `${p} canonical`);
      assert.match(html, /<meta name="description" content="[^"]{20,}/, `${p} description`);
      assert.match(html, /<title>[^<]{5,}<\/title>/, `${p} title`);
    }
  });

  test("LM6 every JSON-LD block parses", () => {
    for (const p of PAGES) for (const m of read(p).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(m[1]);
  });

  test("LM7 the WebP portrait exists and the PNG fallback is kept", () => {
    assert.ok(fs.existsSync("assets/zoran-stojankic.webp") && fs.statSync("assets/zoran-stojankic.webp").size < 200_000);
    assert.match(index, /<source srcset="\/assets\/zoran-stojankic\.webp" type="image\/webp">/);
    assert.ok(fs.existsSync("assets/zoran-stojankic.png"));
  });
});

describe("accessibility regressions", () => {
  const controls = (html) => [...stripScripts(html).matchAll(/<(input|select|textarea)\b([^>]*)>/g)].filter((m) => !/type="hidden"/.test(m[2]));

  test("A11Y1 every form control has an accessible name", () => {
    for (const p of PAGES) {
      const html = read(p);
      for (const m of controls(html)) {
        const id = (m[2].match(/\bid="([^"]+)"/) || [])[1];
        const named = /aria-label(ledby)?="/.test(m[2]) || (id && new RegExp(`<label[^>]*for="${id}"`).test(html));
        assert.ok(named, `${p}: <${m[1]}${m[2].slice(0, 60)}> has no label`);
      }
    }
  });

  test("A11Y2 exactly one h1 per page and no skipped heading levels in static markup", () => {
    for (const p of PAGES) {
      const levels = [...stripScripts(read(p)).matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
      assert.equal(levels.filter((l) => l === 1).length, 1, `${p}: h1 count`);
      for (let i = 1; i < levels.length; i++) assert.ok(levels[i] - levels[i - 1] <= 1, `${p}: h${levels[i - 1]} → h${levels[i]}`);
    }
  });

  test("A11Y3 images have alt text; pages declare a language", () => {
    for (const p of PAGES) {
      const html = read(p);
      assert.match(html, /<html lang="(mk|en)"/, p);
      for (const m of stripScripts(html).matchAll(/<img\b[^>]*>/g)) assert.match(m[0], /\balt="/, `${p}: ${m[0].slice(0, 80)}`);
    }
  });

  test("A11Y4 skip links target an existing main element; no positive tabindex; no role=button on non-buttons", () => {
    for (const p of PAGES.filter((x) => x !== "offline.html")) {
      const html = read(p);
      const skip = html.match(/<a class="skip" href="#([^"]+)"/);
      assert.ok(skip, `${p}: no skip link`);
      assert.match(html, new RegExp(`<main[^>]*id="${skip[1]}"`), `${p}: skip target`);
      assert.ok(!/tabindex="[1-9]/.test(html), `${p}: positive tabindex`);
      assert.ok(!/<(article|div|span)\b[^>]*role="button"/.test(html), `${p}: role=button on a non-button`);
    }
    assert.match(index, /Прескокни до главната содржина/);
  });

  test("A11Y5 colour tokens meet WCAG contrast (text ≥ 4.5, focus ring ≥ 3)", () => {
    const lum = (hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const token = (block, name) => block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))[1];
    const light = index.slice(index.indexOf(":root {"), index.indexOf("}", index.indexOf(":root {")));
    const dark = index.slice(index.indexOf('html[data-theme="dark"] {'), index.indexOf("}", index.indexOf('html[data-theme="dark"] {')));
    for (const [block, label] of [[light, "light"], [dark, "dark"]]) {
      for (const bg of ["bg", "surface", "surface-2", "gold-soft"]) {
        for (const fg of ["ink", "muted"]) assert.ok(ratio(token(block, fg), token(block, bg)) >= 4.5, `${label}: --${fg} on --${bg}`);
      }
      assert.ok(ratio(token(block, "focus"), token(block, "surface")) >= 3, `${label}: focus ring`);
    }
    assert.ok(ratio("#9ec3e6", token(dark, "surface")) >= 4.5, "dark .tag colour");
  });
});
