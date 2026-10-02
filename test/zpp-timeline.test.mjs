// ZPP public version timeline: official metadata, conservative status wording,
// fail-closed staleness, and no front-end inference of legal currency.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ZT = require("../assets/zpp-timeline.js");
const src = fs.readFileSync("assets/zpp-timeline.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const intake = fs.readFileSync("migrations/0019_law_intake_batch_1.sql", "utf8");
const byId = Object.fromEntries(ZT.ZPP_TIMELINE.items.map((i) => [i.id, i]));
const allLabels = () => [
  ...Object.values(ZT.PHASES).flatMap((p) => [p.mk, p.en, p.noteMk, p.noteEn]),
  ...ZT.ZPP_TIMELINE.items.flatMap((i) => [i.title.mk, i.title.en, i.kindLabel.mk, i.kindLabel.en])
];

describe("ZPP timeline metadata", () => {
  test("Z1 the three official items carry exactly the verified Gazette numbers and dates", () => {
    assert.deepEqual(ZT.ZPP_TIMELINE.items.map((i) => i.gazette), ["7/2011", "124/2015", "151/2026"]);
    assert.deepEqual(
      ZT.ZPP_TIMELINE.items.map((i) => [i.published, i.entryIntoForce, i.applicationFrom, i.terminationShownByLdbis]),
      [["2011-01-20", null, null, null], ["2015-07-23", "2015-07-31", "2016-01-31", "2027-01-18"], ["2026-07-08", "2026-07-16", "2027-01-18", null]]
    );
    assert.equal(byId["zpp-7-2011"].kindLabel.mk, "Пречистена верзија");
    assert.equal(ZT.ZPP_TIMELINE.instrumentKey, "mk:zpp");
  });

  test("Z2 the metadata is internally consistent (publication ≤ force ≤ application; pre-2027 track ends when 151/2026 applies)", () => {
    assert.deepEqual(ZT.consistencyProblems(), []);
    const broken = JSON.parse(JSON.stringify(ZT.ZPP_TIMELINE));
    broken.items[2].applicationFrom = "2026-07-01";
    assert.ok(ZT.consistencyProblems(broken).length >= 2);
  });

  test("Z3 every item links to official LDBIS metadata over https; the 151/2026 and pre-2027 links match the repository's source registry", () => {
    for (const it of ZT.ZPP_TIMELINE.items) assert.match(it.sourceUrl, /^https:\/\/ldbis\.pravda\.gov\.mk\/PregledNaZakon\.aspx\?id=\d+$/);
    assert.ok(intake.includes(byId["zpp-151-2026"].sourceUrl), "151/2026 LDBIS URL differs from migrations/0019");
    assert.ok(intake.includes(byId["zpp-7-2011"].sourceUrl), "pre-2027 LDBIS URL differs from migrations/0019");
  });

  test("Z4 the timeline agrees with the backend version registry seeded in 0019 (labels and 151/2026 start)", () => {
    assert.match(intake, /'future-application-151\/2026','2027-01-18'/);
    assert.equal(byId["zpp-151-2026"].applicationFrom, "2027-01-18");
    assert.match(intake, /'applicable-track-79\/2005-through-124\/2015'/);
  });
});

describe("conservative status wording", () => {
  test("Z5 the 151/2026 law is never presented as already applicable", () => {
    const p = ZT.phaseFor(byId["zpp-151-2026"], "2026-10-02");
    assert.equal(p.key, "future_application");
    assert.equal(p.mk, "Објавен и стапен во сила; примена од 18.01.2027");
    assert.equal(p.en, "Published and in force; application begins 18 January 2027");
    assert.ok(!/(^|\s)се применува(\s|$)/.test(p.mk) && !/\bapplies\b|\bapplicable\b/i.test(p.en), "no 'applies now' wording");
  });

  test("Z6 'current consolidated' never appears except negated", () => {
    for (const label of [...allLabels(), ...[...index.matchAll(/zpp[A-Za-z0-9]*:"([^"]+)"/g)].map((m) => m[1])]) {
      for (const m of label.matchAll(/тековен пречистен текст|current consolidated text/gi)) {
        const before = label.slice(Math.max(0, m.index - 25), m.index);
        assert.match(before, /не е потврдена како |not confirmed as a /, `un-negated currency claim: "${label}"`);
      }
      assert.ok(!/ТЕКОВЕН · ПРОВЕРЕН|CURRENT · VERIFIED|ТЕКОВНА · ОДОБРЕНА/.test(label), label);
    }
  });

  test("Z7 the pre-2027 track is described as applicable but explicitly not confirmed as current consolidated", () => {
    const p = ZT.phaseFor(byId["zpp-124-2015"], "2026-10-02");
    assert.equal(p.key, "current_track");
    assert.match(p.mk, /не е потврдена како тековен пречистен текст/);
    assert.match(p.en, /not confirmed as a current consolidated text/);
    assert.equal(ZT.phaseFor(byId["zpp-7-2011"], "2026-10-02").key, "reference");
  });

  test("Z8 phase labels are withdrawn after statusReviewBy instead of being recomputed", () => {
    assert.equal(ZT.ZPP_TIMELINE.statusAsOf, "2026-10-02");
    assert.ok(ZT.ZPP_TIMELINE.statusReviewBy < byId["zpp-151-2026"].applicationFrom);
    assert.equal(ZT.isStale("2026-10-02"), false);
    assert.equal(ZT.isStale("2027-01-17"), false);
    for (const day of ["2027-01-18", "2027-06-01", "2030-01-01"]) {
      assert.equal(ZT.isStale(day), true, day);
      for (const it of ZT.ZPP_TIMELINE.items) assert.equal(ZT.phaseFor(it, day).key, "stale", `${it.id} on ${day}`);
    }
  });

  test("Z9 no clock-based legal reasoning in the data module; the page only asks isStale()", () => {
    assert.ok(!/Date\.now|new Date\(\)/.test(src), "the data module must not read the clock");
    const fn = index.slice(index.indexOf("function renderZppTimeline("), index.indexOf("function renderLayerLadder("));
    assert.match(fn, /ZT\.isStale\(today\)/);
    assert.ok(!/applicationFrom\s*[<>]=?|[<>]=?\s*[a-z.]*applicationFrom/.test(fn), "no date comparison against application dates in the page");
  });

  test("Z10 unknown dates are shown as 'not stated', never guessed", () => {
    const rows = ZT.dateRows(byId["zpp-7-2011"], "mk");
    assert.deepEqual(rows.map((r) => [r.key, r.iso]), [["published", "2011-01-20"], ["entryIntoForce", null], ["applicationFrom", null]]);
    assert.equal(rows[1].value, "не е наведено во метаподатоците");
    assert.deepEqual(ZT.dateRows(byId["zpp-124-2015"], "en").map((r) => r.key), ["published", "entryIntoForce", "applicationFrom", "terminationShownByLdbis"]);
    assert.equal(ZT.formatDate("2027-01-18", "mk"), "18.01.2027");
    assert.equal(ZT.formatDate("2027-01-18", "en"), "18 January 2027");
  });
});

describe("Human Gate and page structure", () => {
  test("Z11 Human Gate comes from /api/instruments only and is never assumed approved", () => {
    assert.ok(!/humanReviewStatus\s*:/.test(src), "the data module must not store a Human Gate status");
    assert.equal(ZT.humanGateLabel(null, "mk"), "непознато (регистарот не е достапен)");
    assert.equal(ZT.humanGateLabel({}, "en"), "unknown (registry unavailable)");
    assert.equal(ZT.humanGateLabel({ humanReviewStatus: "pending" }, "mk"), "чека проверка");
    assert.equal(ZT.humanGateLabel({ humanReviewStatus: "weird" }, "mk"), "чека проверка");
    assert.match(index, /zppInstrument=instruments\.find\(i=>i\.canonicalKey==="mk:zpp"\)/);
  });

  test("Z12 the section is accessible and shows the 'entry into force ≠ application' explanation in MK and EN", () => {
    assert.match(index, /<section class="zppTimeline" id="zpp-timeline" aria-labelledby="zppTitle">/);
    assert.match(index, /<ol class="zppItems" id="zppItems"/);
    assert.match(index, /zppEifTitle:"Стапување во сила ≠ почеток на примена"/);
    assert.match(index, /zppEifTitle:"Entry into force ≠ start of application"/);
    const fn = index.slice(index.indexOf("function renderZppTimeline("), index.indexOf("function renderLayerLadder("));
    assert.match(fn, /el\("time",\{datetime:r\.iso/);
    assert.match(fn, /class:"srcBadge"/);
    assert.match(fn, /data-phase":phase\.key/);
    assert.match(fn, /text:phase\[L\]/, "phase is conveyed as text, not colour only");
    const helper = index.indexOf('<script src="/assets/zpp-timeline.js"></script>');
    assert.ok(helper > 0 && helper < index.indexOf("window.AI_ADVOCAT_CONFIG"));
  });

  test("Z13 transitional provisions are flagged as not covered", () => {
    assert.match(index, /zppCaveat:"Преодните одредби на новиот закон/);
  });
});
