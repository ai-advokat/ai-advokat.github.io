import {describe,test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const cards=JSON.parse(fs.readFileSync("data/legal-evidence-cards.json","utf8"));
const gov=JSON.parse(fs.readFileSync("data/publication-governance.json","utf8"));

describe("legal evidence cards",()=>{
  test("LEC1 one evidence card exists for each last-set guide",()=>{
    const g=gov.pipeline.filter(x=>x.source_set==="last_set_2026_10_03");
    assert.equal(cards.cards.length,10);
    assert.deepEqual(new Set(cards.cards.map(x=>x.id)),new Set(g.map(x=>x.id)));
  });

  test("LEC2 all downstream gates remain fail-closed",()=>{
    for(const x of cards.cards){
      assert.equal(x.public_release,false);
      assert.equal(x.rag_eligible,false);
      assert.equal(x.github_merge_approved,false);
      assert.equal(x.production_corpus_write_approved,false);
    }
  });

  test("LEC3 only inheritance may claim verified_current_law",()=>{
    const verified=cards.cards.filter(x=>x.epistemic_status==="verified_current_law");
    assert.deepEqual(verified.map(x=>x.id),["inheritance-estate-guide-2025-r1"]);
    assert.equal(verified[0].legal_source_review_date,"2026-10-03");
    for(const x of cards.cards.filter(x=>x.id!=="inheritance-estate-guide-2025-r1")){
      assert.equal(x.epistemic_status,"pending_verification");
    }
  });

  test("LEC4 evidence cards mirror author gates from governance",()=>{
    const gm=new Map(gov.pipeline.map(x=>[x.id,x]));
    for(const x of cards.cards){
      assert.equal(x.author_approval,gm.get(x.id).author_approval);
      assert.equal(x.public_release,gm.get(x.id).public_release);
      assert.equal(x.rag_eligible,gm.get(x.id).rag_eligible);
    }
  });

  test("LEC5 every card has a linked audit and identity",()=>{
    for(const x of cards.cards){
      assert.ok(x.id);
      assert.ok(x.title);
      assert.ok(x.kind);
      assert.ok(x.source_edition);
      assert.match(x.audit_file,/^docs\/guides\/AUDIT_.*\.md$/);
    }
  });
});
