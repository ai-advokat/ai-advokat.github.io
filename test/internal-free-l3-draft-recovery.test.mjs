import test from "node:test";
import assert from "node:assert/strict";
import {deterministicFormalDraftCapacityFallback,isFormalLegalDraftRequest} from "../src/response-quality.js";
import {macedonianDeliveryVerdict} from "../src/macedonian-language-guard.js";

const cases=[
  {
    id:"divorce",
    q:"Изработи ми тужба за развод на брак."
  },
  {
    id:"debt",
    q:"Факти: Доверител: Правно лице А. Должник: Правно лице Б. Основа: Договор за услуги. Главен долг: 150.000 денари. Рокот за плаќање не е наведен. Подготви работен нацрт за судска наплата без да измислуваш датум, надлежност, рок или член."
  }
];

for(const tc of cases){
  test("L3 deterministic fallback is formal and V14 releasable: "+tc.id,()=>{
    assert.equal(isFormalLegalDraftRequest(tc.q),true,"formal draft classifier missed "+tc.id);
    const draft=deterministicFormalDraftCapacityFallback({userText:tc.q});
    assert.ok(draft,"deterministic draft missing for "+tc.id);
    const verdict=macedonianDeliveryVerdict(draft,{userText:tc.q});
    assert.equal(verdict.deliver,true,JSON.stringify({
      id:tc.id,
      state:verdict.state,
      clean:verdict.clean,
      quality:verdict.quality,
      releaseGate:verdict.releaseGate,
      text:verdict.text
    },null,2));
  });
}
