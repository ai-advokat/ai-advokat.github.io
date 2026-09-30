import test from "node:test";
import assert from "node:assert/strict";
import { scoreArticle } from "../src/index.js";

const approvedRow={
  article_number:"12",
  article_number_normalized:"12",
  article_heading:"Работен однос",
  article_text:"Работниот однос се уредува согласно закон и договор.",
  status:"current_consolidated",
  human_review_status:"approved"
};

test("approved status cannot manufacture relevance",()=>{
  assert.equal(scoreArticle(approvedRow,"наследство и оставинска постапка"),0);
});

test("verified or approved status only boosts an already relevant row",()=>{
  const score=scoreArticle(approvedRow,"работен однос");
  assert.ok(score>25,score);
});

test("exact article request remains strongly ranked",()=>{
  const score=scoreArticle(approvedRow,"член 12");
  assert.ok(score>=1000,score);
});

test("needs-version-review status cannot manufacture relevance",()=>{
  const pending={...approvedRow,status:"needs_version_review",human_review_status:"pending"};
  assert.equal(scoreArticle(pending,"развод на брак"),0);
});
