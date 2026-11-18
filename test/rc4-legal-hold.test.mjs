import test from 'node:test';
import assert from 'node:assert/strict';
import {assertDisplayableLegalResponse as gate} from '../src/experimental/rc4/legal-response-integrity.mjs';
const draft = {ok:true,answer:'Работен одговор',provider:'openai'};
for (const status of ['LEGAL_HOLD','legal_hold','BLOCKED','REJECTED','NO_GO']) {
  test('HTTP 200 never displays affirmative governance hold '+status,()=>assert.throws(()=>gate({...draft,legalGovernance:{status}}), /не достави проверлив/));
}
test('explicit release denial blocked',()=>assert.throws(()=>gate({...draft,legalGovernance:{releaseAllowed:false}})));
test('explicit no legal answer blocked',()=>assert.throws(()=>gate({...draft,legalAnswerGenerated:false})));
test('explicit synthetic true blocked',()=>assert.throws(()=>gate({...draft,synthetic:true})));
test('synthetic answer flag blocked',()=>assert.throws(()=>gate({...draft,answerIsSynthetic:true})));
test('success with error blocked',()=>assert.throws(()=>gate({...draft,error:'upstream unavailable'})));
test('draft with human gate open remains displayable',()=>assert.equal(gate({...draft,legalGovernance:{humanGate:'OPEN'}}).answer,draft.answer));
test('governed corpus answer remains displayable',()=>assert.equal(gate({ok:true,answer:'Оригинален корпус',provider:'canonical_corpus_no_model',modelInvoked:false}).answer,'Оригинален корпус'));
test('no claim of provider attestation',()=>assert.equal(gate({...draft,providerIndependentlyVerified:false}).providerIndependentlyVerified,false));
