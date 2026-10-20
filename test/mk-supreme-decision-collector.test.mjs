import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  parseArgs,
  normalizeOfficialUrl,
  parseRobots,
  robotsAllows,
  extractLinks,
  isDecisionCandidate,
  loadRightsReview,
  MAX_LIMIT
} from "../scripts/download-mk-supreme-decisions.mjs";

test("supreme collector caps one run at 100 and prevents aggressive polling",()=>{
  assert.equal(parseArgs(["--limit","100"]).limit,MAX_LIMIT);
  assert.throws(()=>parseArgs(["--limit","101"]),/1_to_100/);
  assert.throws(()=>parseArgs(["--delay-ms","100"]),/delay_min/);
});

test("supreme collector accepts only official Supreme Court HTTPS hosts",()=>{
  assert.equal(normalizeOfficialUrl("https://www.vrhoven.sud.mk/a").hostname,"www.vrhoven.sud.mk");
  assert.equal(normalizeOfficialUrl("https://vrhoven.sud.mk/a").hostname,"vrhoven.sud.mk");
  assert.throws(()=>normalizeOfficialUrl("http://www.vrhoven.sud.mk/a"),/https_required/);
  assert.throws(()=>normalizeOfficialUrl("https://evil-vrhoven.sud.mk/a"),/official_host_required/);
});

test("supreme collector respects robots longest-match rules",()=>{
  const groups=parseRobots("User-agent: *\nDisallow: /private\nAllow: /private/public\n");
  assert.equal(robotsAllows(groups,"/decisions"),true);
  assert.equal(robotsAllows(groups,"/private/x"),false);
  assert.equal(robotsAllows(groups,"/private/public/a"),true);
});

test("supreme collector extracts same-host decision links and ignores external hosts",()=>{
  const html='<a href="/files/presuda-1.pdf">Пресуда Рев.бр.1/2026</a><a href="https://example.com/x.pdf">x</a><a href="/news">Вести</a>';
  const links=extractLinks(html,"https://www.vrhoven.sud.mk/decisions");
  assert.equal(links.length,2);
  assert.equal(links[0].url,"https://www.vrhoven.sud.mk/files/presuda-1.pdf");
  assert.equal(isDecisionCandidate(links[0]),true);
  assert.equal(isDecisionCandidate(links[1]),false);
});

test("bounded automated retrieval requires documented rights review",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"rights-"));
  const ok=path.join(dir,"ok.json");
  fs.writeFileSync(ok,JSON.stringify({
    source_id:"mk-supreme-court",
    approved_for_bounded_automated_retrieval:true,
    reviewed_on:"2026-10-20",
    reviewed_by:"Human Gate",
    basis:"Court public-decision retrieval terms reviewed"
  }));
  assert.equal(loadRightsReview(ok).source_id,"mk-supreme-court");

  const bad=path.join(dir,"bad.json");
  fs.writeFileSync(bad,JSON.stringify({
    source_id:"mk-supreme-court",
    approved_for_bounded_automated_retrieval:false
  }));
  assert.throws(()=>loadRightsReview(bad),/not_approved/);
});

test("collector source code keeps provenance and production release fail-closed",()=>{
  const source=fs.readFileSync("scripts/download-mk-supreme-decisions.mjs","utf8");
  assert.match(source,/sha256/);
  assert.match(source,/manifest\.ndjson/);
  assert.match(source,/human_gate_required:true/);
  assert.match(source,/production_eligible:false/);
  assert.doesNotMatch(source,/headers\s*:\s*\{[^}]*["'](?:cookie|authorization)["']/i);
  assert.doesNotMatch(source,/credentials\s*:/i);
  assert.match(source,/https:\/\/www\.vrhoven\.sud\.mk\//);
});
