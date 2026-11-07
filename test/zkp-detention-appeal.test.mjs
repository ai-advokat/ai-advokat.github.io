import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ZKP_DETENTION_APPEAL_VERSION,
  ZKP_DETENTION_APPEAL_ARTICLES,
  isZkpDetentionAppealRequest,
  formatZkpDetentionAppealAnswer
} from "../src/zkp-detention-appeal.js";

const worker=fs.readFileSync("src/index.js","utf8");
const chatJs=fs.readFileSync("assets/ai-advokat-chat.js","utf8");

const articles=[
  {articleNumber:"164",heading:"Основни правила за притвор",text:"Притворот мора да трае најкратко нужно време и ќе се укине кога ќе престанат причините; при изборот се почитува сразмерноста."},
  {articleNumber:"165",heading:"Основи за определување притвор",text:"Ако постои основано сомневање дека определено лице сторило кривично дело, притвор може да се определи само под законските услови."},
  {articleNumber:"166",heading:"Определување притвор во претходната постапка",text:"Во претходната постапка за определување притвор се постапува по образложен предлог согласно закон."},
  {articleNumber:"167",heading:"Содржина на решението за притвор",text:"Решението мора да ги содржи фактите и доказите од кои произлегува основаното сомневање, причините за притвор и причините поради кои целта не може да се оствари со друга мерка за обезбедување присуство."},
  {articleNumber:"168",heading:"Изведување пред судија",text:"Лицето се изведува пред судија и има право на бранител согласно процесните гаранции."},
  {articleNumber:"169",heading:"Доставување на решението за притвор и право на жалба",text:"Притвореното лице може да поднесе жалба во рок од 24 часа од часот на предавањето на решението. Жалбата не го задржува извршувањето. Советот одлучува во рок од 48 часа."}
];

test("ZKP detention appeal lane recognises initial detention appeal but excludes extension/revocation phases",()=>{
  assert.equal(isZkpDetentionAppealRequest("Изработи жалба против решение за определување притвор"),true);
  assert.equal(isZkpDetentionAppealRequest("Жалба против решението со кое е определен притвор"),true);
  assert.equal(isZkpDetentionAppealRequest("Жалба против решение за продолжување на притвор"),false);
  assert.equal(isZkpDetentionAppealRequest("Барање за укинување на притвор"),false);
});

test("ZKP detention appeal formatter requires bounded statutory evidence and emits a usable source-first scaffold",()=>{
  const answer=formatZkpDetentionAppealAnswer({title:"Закон за кривичната постапка"},articles);
  assert.ok(answer);
  assert.match(answer,/ЖАЛБА ПРОТИВ РЕШЕНИЕ ЗА ОПРЕДЕЛУВАЊЕ ПРИТВОР/);
  assert.match(answer,/рок од 24 часа/);
  assert.match(answer,/рок од 48 часа/);
  assert.match(answer,/Жалбата не го задржува извршувањето/);
  assert.match(answer,/Член 167/);
  assert.match(answer,/друга мерка за обезбедување присуство/);
  assert.match(answer,/HUMAN GATE/);
  assert.match(answer,/deterministic\/no-model/);

  const incomplete=articles.filter(a=>a.articleNumber!=="169");
  assert.equal(formatZkpDetentionAppealAnswer({title:"ЗКП"},incomplete),null);
  assert.equal(ZKP_DETENTION_APPEAL_VERSION,"AI_ADVOCAT_ZKP_DETENTION_APPEAL_V1");
  assert.deepEqual([...ZKP_DETENTION_APPEAL_ARTICLES],["164","165","166","167","168","169"]);
});

test("chat worker routes detention appeal before provider fallback with exact provenance metadata",()=>{
  assert.match(worker,/zkpDetentionAppealFastLane/);
  assert.match(worker,/canonical_zkp_detention_appeal/);
  assert.match(worker,/canonical_zkp_detention_articles_164_169_no_model/);
  assert.match(worker,/provider:"canonical_corpus_no_model"/);
  assert.match(worker,/providerCalls:0/);
  assert.match(worker,/quotaConsumed:false/);
});

test("frontend labels detention answer as governed ZKP rather than GPT general assistance",()=>{
  assert.match(chatJs,/canonical_zkp_detention_articles_164_169_no_model/);
  assert.match(chatJs,/Governed ZKP corpus · членови 164–169 · deterministic\/no-model/);
});
