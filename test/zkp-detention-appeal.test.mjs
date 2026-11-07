import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ZKP_DETENTION_APPEAL_ARTICLES,
  isZkpDetentionAppealRequest,
  assessZkpDetentionAppealArticles,
  formatZkpDetentionAppealAnswer
} from "../src/zkp-detention-appeal.js";

const fixtures=[
  {articleNumber:"164",heading:"Определување притвор",text:"Притвор може да се определи само под условите предвидени во овој закон. Траењето на притворот мора да биде сведено на најкратко нужно време. При одлучување ќе се води посебна сметка за сразмерноста. Во текот на целата постапка притворот ќе се укине веднаш штом ќе престанат причините врз основа на кои бил определен."},
  {articleNumber:"165",heading:"Основи за определување притвор",text:"Ако постои основано сомневање и притворот е неопходен, може да се определи ако постои опасност од бегство; основан страв од влијание врз сведоците; особени околности дека ќе го повтори кривичното дело."},
  {articleNumber:"167",heading:"Елементи на решението за притвор",text:"Во образложението задолжително ќе се наведат сите факти и докази од кои произлегува основаното сомневање, образложените причини кои ја оправдуваат секоја одделна основа и причините поради кои целта не може да се оствари со друга мерка за обезбедување присуство."},
  {articleNumber:"169",heading:"Доставување на решението за притвор и правото на жалба",text:"Против решението со кое се определува притвор може да се жали во рок од 24 часа. Жалбата не го задржува извршувањето. Советот што одлучува по жалбата е должен да донесе одлука во рок од 48 часа."},
  {articleNumber:"170",heading:"Краткотраен притвор",text:"Против решението е дозволена жалба во рок од пет часа од врачувањето, а советот е должен да реши по жалбата во рок од три часа."},
  {articleNumber:"171",heading:"Траење на притворот во истражната постапка",text:"Против решението на советот за продолжување на притворот дозволена е жалба во рок од 48 часа до непосредно повисокиот суд. Жалбата не го одлага извршувањето."},
  {articleNumber:"172",heading:"Траење на притворот по одобрување на обвинителниот акт",text:"По одобрување на обвинението притворот може да се определи, продолжи или укине само со решение на советот. Жалбата против решението не го задржува извршувањето."},
  {articleNumber:"173",heading:"Укинување на притворот",text:"Притворот се укинува со решение кога ќе престанат причините, ако натамошниот притвор не би бил во сразмерност или кога истата цел може да се постигне со некоја друга мерка. Против решението е дозволена жалба во рок од 24 часа."},
  {articleNumber:"174",heading:"Притвор по објавување на пресудата",text:"По објавување на пресудата советот донесува посебно решение за продолжување, определување или укинување на притворот."}
];

test("detention appeal intent is narrow and explicit",()=>{
  assert.equal(isZkpDetentionAppealRequest("Жалба против решение за притвор"),true);
  assert.equal(isZkpDetentionAppealRequest("Подготви правен лек за продолжување на притвор"),true);
  assert.equal(isZkpDetentionAppealRequest("Кои се основите за притвор?"),false);
  assert.equal(isZkpDetentionAppealRequest("Напиши жалба за парнична пресуда"),false);
});

test("detention appeal formatter requires all exact statutory evidence rows",()=>{
  assert.deepEqual(ZKP_DETENTION_APPEAL_ARTICLES,["164","165","167","169","170","171","172","173","174"]);
  assert.equal(assessZkpDetentionAppealArticles(fixtures).ok,true);
  const missing=assessZkpDetentionAppealArticles(fixtures.filter(x=>x.articleNumber!=="169"));
  assert.equal(missing.ok,false);
  assert.ok(missing.missing.includes("169"));
});

test("source-first detention appeal is useful, phase-aware and does not invent case law",()=>{
  const answer=formatZkpDetentionAppealAnswer({title:"Закон за кривичната постапка"},fixtures);
  assert.match(answer,/^ЖАЛБА ПРОТИВ РЕШЕНИЕ ЗА ПРИТВОР/u);
  assert.match(answer,/член 169 став \(2\).*24 часа/isu);
  assert.match(answer,/член 170 став \(5\).*5 часа/isu);
  assert.match(answer,/член 171 став \(6\).*48 часа/isu);
  assert.match(answer,/Член 172 самиот не наведува посебен рок/iu);
  assert.match(answer,/член 167 став \(2\)/iu);
  assert.match(answer,/фактите и доказите/iu);
  assert.match(answer,/друга мерка/iu);
  assert.match(answer,/Датум и час на прием/iu);
  assert.match(answer,/Конкретни броеви на предмети не се додаваат автоматски/iu);
  assert.match(answer,/Human Gate/iu);
  assert.doesNotMatch(answer,/пресуда за определување притвор/iu);
});

test("chat runtime routes detention appeals before generic AI drafting",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  const chat=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
  assert.match(worker,/zkpDetentionAppealFastLane/);
  assert.match(worker,/canonical_zkp_detention_articles_no_model/);
  assert.match(worker,/provider:"canonical_corpus_no_model"/);
  assert.match(worker,/providerCalled:false/);
  assert.match(worker,/quotaConsumed:false/);
  const detentionPos=worker.indexOf("const detentionAppealFastLane=await zkpDetentionAppealFastLane");
  const retrievalPos=worker.indexOf("const retrievalPlan=legalRetrievalPlan");
  assert.ok(detentionPos>0 && retrievalPos>detentionPos,"detention fast lane must precede generic retrieval/provider flow");
  assert.match(chat,/ZKP source-first · членови 164, 165, 167, 169–174 · deterministic\/no-model · Human Gate/);
  assert.match(chat,/Deterministic legal fallback · без model call · Human Gate required/);
});
