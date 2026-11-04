import test from "node:test";
import assert from "node:assert/strict";
import {
  historicalCaseLawTemporalGateRequest,
  formatHistoricalCaseLawTemporalGateAnswer,
  simpleClientAcknowledgementRequest,
  formatSimpleClientAcknowledgement
} from "../src/index.js";

test("historical case-law temporal gate catches old-to-current applicability questions",()=>{
  const q="Дали правен став на Апелационен суд Штип од 1997 година автоматски е важечко право во 2026? Оддели историски извор од тековна применливост.";
  assert.equal(historicalCaseLawTemporalGateRequest(q),true);
  const answer=formatHistoricalCaseLawTemporalGateAnswer(q);
  assert.match(answer,/1997/u);
  assert.match(answer,/2026/u);
  assert.match(answer,/не е автоматски применлива|не станува автоматски важечко право/iu);
  assert.match(answer,/историски извор/iu);
  assert.match(answer,/тековна применливост/iu);
});

test("historical case-law temporal gate does not capture ordinary single-year questions",()=>{
  assert.equal(historicalCaseLawTemporalGateRequest("Што решил судот во предмет од 1997 година?"),false);
});

test("simple client acknowledgement stays non-legal and citation-free",()=>{
  const q="Напиши кратка и професионална порака до клиент: Го примивме вашиот документ и ќе го разгледаме.";
  assert.equal(simpleClientAcknowledgementRequest(q),true);
  const answer=formatSimpleClientAcknowledgement();
  assert.match(answer,/документ/iu);
  assert.doesNotMatch(answer,/член\s+\d+|Службен весник|HUDOC/iu);
});

test("simple acknowledgement lane does not capture legal research",()=>{
  assert.equal(simpleClientAcknowledgementRequest("Напиши порака до клиент за член 12 од закон и документот што го примивме."),false);
});
