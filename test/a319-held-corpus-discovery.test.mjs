import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateA319Corpus,retrieveA319,a319AttachCorpusToChat} from '../src/a319-held-corpus-discovery.js';

function corpus(){
  const ids=[...Array.from({length:50},(_,i)=>String(i+1)),'34-а','34-б','34-в'];
  return {
    schema:'paragraf.a318.corpus.v1',production:'NO_GO',subsequent_amendments:'NOT_EXHAUSTIVELY_VERIFIED',
    articles:ids.map(id=>{
      const text=`Член ${id}\nСинтетички текст за локална проверка.`;
      return {
        article_id:id,text,text_sha256:createHash('sha256').update(text).digest('hex'),
        legal_status:'LEGAL_HOLD',authorized_for_ai_citation:false,human_review:'PENDING'
      };
    })
  };
}

test('A319 gate validates 53 synthetic held articles', async()=>{
  const r=await validateA319Corpus(corpus());
  assert.equal(r.ok,true,JSON.stringify(r.errors));
  assert.equal(r.count,53);
});
test('A319 exact Cyrillic article is found',()=>{
  assert.deepEqual(retrieveA319(corpus(),'член 34-в став 9').map(x=>x.article_id),['34-в']);
});
test('A319 nonexistent article never falls back to unrelated results',()=>{
  assert.deepEqual(retrieveA319(corpus(),'член 88, правна помош'),[]);
});
test('A319 rejects out-of-corpus article 101 instead of returning article 10',()=>{
  assert.deepEqual(retrieveA319(corpus(),'член 101').map(x=>x.article_id),[]);
});
test('A319 rejects unreviewed letter variant 34-г instead of returning 34',()=>{
  assert.deepEqual(retrieveA319(corpus(),'член 34-г').map(x=>x.article_id),[]);
});
test('A319 rejects invalid contiguous variant 34г',()=>{
  assert.deepEqual(retrieveA319(corpus(),'член 34г').map(x=>x.article_id),[]);
});
test('A319 rejects partial or malformed article notation',()=>{
  for (const q of ['член 34-аб', 'член 34--а','член 10-а','член 10/11','член 34-4','член 10.1']) {
    assert.deepEqual(retrieveA319(corpus(),q).map(x=>x.article_id),[],q);
  }
});
test('A319 rejects a query mixing valid and invalid explicit articles',()=>{
  assert.deepEqual(retrieveA319(corpus(),'член 10 и член 101').map(x=>x.article_id),[]);
  assert.deepEqual(retrieveA319(corpus(),'член 34-а и член 34-г').map(x=>x.article_id),[]);
});
test('A319 supports exact article 10 and exact Cyrillic letter variants',()=>{
  assert.deepEqual(retrieveA319(corpus(),'член 10').map(x=>x.article_id),['10']);
  assert.deepEqual(retrieveA319(corpus(),'член 34-а').map(x=>x.article_id),['34-а']);
  assert.deepEqual(retrieveA319(corpus(),'чл.34-в').map(x=>x.article_id),['34-в']);
  assert.deepEqual(retrieveA319(corpus(),'член 34а').map(x=>x.article_id),['34-а']);
});
test('A319 accepts multiple exact valid article references without extras',()=>{
  assert.deepEqual(retrieveA319(corpus(),'член 34-а и член 34-в').map(x=>x.article_id).sort(),['34-а','34-в']);
});
test('A319 never creates held source citations after invalid lookup',async()=>{
  const r=await a319AttachCorpusToChat({corpus:corpus(),question:'член 101',chatResponse:{answer:'Не е утврден член'}});
  assert.equal(r.ok,true);
  assert.equal(r.matched,0);
  assert.deepEqual(r.chatResponse.a319DiscoveryOnly.sources,[]);
});
test('A319 tampered source bytes are rejected',async()=>{
  const c=corpus();c.articles[0].text+=' tampered';
  assert.equal((await validateA319Corpus(c)).ok,false);
});
test('A319 fake source approval is rejected',async()=>{
  const c=corpus();c.articles[0].human_review='APPROVED';
  assert.equal((await validateA319Corpus(c)).ok,false);
});
test('A319 preserves independent verified source and global gate',async()=>{
  const independent={title:'Human-reviewed independent law',verifiedLegalCitation:true,verificationState:'APPROVED'};
  const response={answer:'Предметен одговор од проверен независен извор',legalSources:[independent],
    legalSourceVerification:{status:'APPROVED',authoritativeCitationAllowed:true}};
  const before=structuredClone(response);
  const r=await a319AttachCorpusToChat({corpus:corpus(),question:'член 34-в',chatResponse:response});
  assert.equal(r.ok,true);
  assert.deepEqual(r.chatResponse.legalSources,before.legalSources);
  assert.deepEqual(r.chatResponse.legalSourceVerification,before.legalSourceVerification);
  assert.equal(r.chatResponse.answer,before.answer);
  assert.equal(r.chatResponse.a319DiscoveryOnly.status,'LEGAL_HOLD');
  assert.equal(r.chatResponse.a319DiscoveryOnly.authoritativeCitationAllowed,false);
  assert.equal(r.chatResponse.a319DiscoveryOnly.sources[0].articleId,'34-в');
  assert.equal(r.chatResponse.a319DiscoveryOnly.sources[0].verifiedLegalCitation,false);
  assert.equal(r.chatResponse.a319DiscoveryOnly.sources[0].text,undefined);
  assert.deepEqual(response,before,'input response was mutated');
});
test('A319 held corpus never creates legalSources',async()=>{
  const r=await a319AttachCorpusToChat({corpus:corpus(),question:'член 13',chatResponse:{answer:'Тест'}});
  assert.equal(r.ok,true);
  assert.equal(r.chatResponse.legalSources,undefined);
  assert.equal(r.chatResponse.a319DiscoveryOnly.sources[0].authorizedForAiCitation,false);
});
test('A319 invalid user-provided corpus fails closed',async()=>{
  const c=corpus();c.production='GO';
  const r=await a319AttachCorpusToChat({corpus:c,question:'член 13',chatResponse:{answer:'Test'}});
  assert.equal(r.ok,false);
  assert.equal(r.error,'CORPUS_VALIDATION_FAILED');
});
