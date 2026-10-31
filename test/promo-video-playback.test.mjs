import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const home=fs.readFileSync("index.html","utf8");
const academy=fs.readFileSync("academy/index.html","utf8");

test("homepage CSP permits same-origin self-hosted promo video",()=>{
  assert.match(home,/media-src 'self'/);
  assert.doesNotMatch(home,/media-src 'none'/);
  assert.match(home,/\/assets\/ai-advokat-official-promo\.mp4/);
  assert.match(home,/id="promoModalVideo"/);
  assert.match(home,/data-promo-open/);
});

test("academy legacy video is self-hosted and Descript-free",()=>{
  assert.match(academy,/\/assets\/ai-advokat-promo-reel-2026-10-26\.mp4/);
  assert.match(academy,/<video class="legacyFrame" controls playsinline preload="metadata"/);
  assert.doesNotMatch(academy,/share\.descript\.com/);
  assert.doesNotMatch(academy,/<iframe class="legacyFrame"/);
});

test("both self-hosted promo assets are real H.264 MP4 files",()=>{
  for(const path of [
    "assets/ai-advokat-official-promo.mp4",
    "assets/ai-advokat-promo-reel-2026-10-26.mp4"
  ]){
    const stat=fs.statSync(path);
    assert.ok(stat.size>10_000_000,path+" unexpectedly small");
    const buf=fs.readFileSync(path);
    assert.ok(buf.subarray(0,64).includes(Buffer.from("ftyp")),path+" missing MP4 ftyp");
    assert.ok(buf.includes(Buffer.from("avc1")),path+" missing H.264 avc1 marker");
  }
});

test("service worker does not cache navigations or promo videos",()=>{
  const sw=fs.readFileSync("service-worker.js","utf8");
  assert.match(sw,/request\.mode === "navigate"[\s\S]*fetch\(request\)/);
  assert.doesNotMatch(sw,/ai-advokat-official-promo\.mp4/);
  assert.doesNotMatch(sw,/ai-advokat-promo-reel-2026-10-26\.mp4/);
});
