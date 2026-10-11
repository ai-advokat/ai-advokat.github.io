import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  REVIEWED_ARTICLE_REPRESENTATIONS,
  ZI_REVIEWED_SOURCE,
  attachReviewedArticleRepresentation,
  articleTextForLegalSynthesis
} from "../src/reviewed-article-representations.js";

const registry=JSON.parse(fs.readFileSync("data/reviewed-article-representations-2026.json","utf8"));

function article(number,text,{url=ZI_REVIEWED_SOURCE.url,sha=ZI_REVIEWED_SOURCE.sha256}={}){
  return {
    articleNumber:String(number),
    articleNumberNormalized:String(number),
    text,
    sourceUrl:url,
    sourceSha256:sha,
    status:"needs_version_review",
    humanReviewStatus:"pending"
  };
}

const raw4="Извршувањето заради остварување на парично побарување ќе се спроведе во\nобем што е потребен за намирување на тоа побарување.\n1 Редакциски пречистениот текст на Законот за извршување ги опфаќа: основниот текст... Oдлуката...";
const raw104="(1) За пописот и процената извршителот составува записник.\n(2) Во записникот, покрај другото, посебно се назначуваат поединечно попишаните предмети, нивната проценета вредност, изјавите од странките и од учесниците во постапката, како и изјавите од трети лица за постоењето на права што го спречуваат извршувањето.\n(3) Записникот за извршен попис на подвижни предмети со вредност поголема од 1.000 евра, задолжително се доставува до Заложниот регистар заради упис на заложното право.\nЗабелешка наместо попис";
const raw269="Овој закон влегува во сила осмиот ден од денот на објавувањето во „Службен весник на Република Македонија“ а ќе започне да се применува по четири месеци од денот на неговото влегување во сила.\n*Членот 269 е изменет, види: член 1 од Законот за изменување на Законот за извршување („Службен весник на РМ“ бр.142/16).";

test("ZIR1 governed data and runtime registry contain exactly the same three article IDs",()=>{
  const a=registry.representations.map(x=>x.id).sort();
  const b=REVIEWED_ARTICLE_REPRESENTATIONS.map(x=>x.id).sort();
  assert.deepEqual(b,a);
  assert.deepEqual(registry.representations.map(x=>x.article_number),["4","104","269"]);
});

test("ZIR2 Article 4 reviewed representation removes only the editorial provenance suffix",()=>{
  const raw=article("4",raw4);
  const out=attachReviewedArticleRepresentation("mk:zi",raw);
  assert.equal(out.text,raw4);
  assert.equal(out.reviewedText,registry.representations.find(x=>x.article_number==="4").reviewed_text);
  assert.doesNotMatch(out.reviewedText,/Редакциски пречистениот текст/);
  assert.equal(out.reviewedRepresentation.rawSourcePreserved,true);
  assert.equal(out.reviewedRepresentation.currentLawAuthority,false);
  assert.equal(out.reviewedRepresentation.humanGateApproved,false);
});

test("ZIR3 Article 104 excludes the Article 105 heading from legal synthesis",()=>{
  const out=attachReviewedArticleRepresentation("mk:zi",article("104",raw104));
  assert.match(out.text,/Забелешка наместо попис/);
  assert.doesNotMatch(out.reviewedText,/Забелешка наместо попис/);
  assert.match(out.reviewedText,/Заложниот регистар/);
  assert.equal(articleTextForLegalSynthesis(out),out.reviewedText);
});

test("ZIR4 Article 269 applies the official 142/2016 replacement only in the derived layer",()=>{
  const out=attachReviewedArticleRepresentation("mk:zi",article("269",raw269));
  assert.match(out.text,/по четири месеци/);
  assert.match(out.text,/\*Членот 269 е изменет/);
  assert.doesNotMatch(out.reviewedText,/по четири месеци/);
  assert.doesNotMatch(out.reviewedText,/\*Членот 269 е изменет/);
  assert.match(out.reviewedText,/од 1 јануари 2017 година/);
  assert.equal(out.reviewedRepresentation.amendmentGazetteIssue,"142/2016");
  assert.equal(out.reviewedRepresentation.legalCurrencyState,"pending_current_gate");
});

test("ZIR5 Article 269 derived representation is not applied before amendment entry into force",()=>{
  const out=attachReviewedArticleRepresentation("mk:zi",article("269",raw269),{referenceDate:"2016-07-31"});
  assert.equal(out.reviewedText,null);
  assert.equal(out.reviewedRepresentation,null);
});

test("ZIR6 fingerprint or marker drift fails closed",()=>{
  const badHash=attachReviewedArticleRepresentation("mk:zi",article("4",raw4,{sha:"0".repeat(64)}));
  assert.equal(badHash.reviewedText,null);
  const badUrl=attachReviewedArticleRepresentation("mk:zi",article("104",raw104,{url:"https://example.invalid/other.pdf"}));
  assert.equal(badUrl.reviewedText,null);
  const noMarker=attachReviewedArticleRepresentation("mk:zi",article("269","Овој закон ... по четири месеци од денот на неговото влегување во сила."));
  assert.equal(noMarker.reviewedText,null);
});

test("ZIR7 derived layer never marks any representation as current-law authority or Human-Gate approved",()=>{
  assert.equal(registry.governance.current_law_authority,false);
  assert.equal(registry.governance.human_gate_approved,false);
  assert.equal(registry.governance.raw_source_records_immutable,true);
  for(const x of REVIEWED_ARTICLE_REPRESENTATIONS){
    const out=attachReviewedArticleRepresentation("mk:zi",article(x.articleNumber,x.articleNumber==="4"?raw4:x.articleNumber==="104"?raw104:raw269));
    assert.equal(out.reviewedRepresentation.currentLawAuthority,false);
    assert.equal(out.reviewedRepresentation.humanGateApproved,false);
  }
});
