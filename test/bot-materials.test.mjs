import test from 'node:test';
import assert from 'node:assert/strict';
import {localGuideDocuments} from '../assets/bot-materials.mjs';
test('local guides are never read or transmitted without opt-in',async()=>{
  assert.deepEqual(await localGuideDocuments({documentsForGuides(){throw Error('must not read')}},['a'],false),[]);
});
test('selected guide IDs use the existing vault validation and two document bound',async()=>{
  let args;
  const docs=[{guideId:'a',sha256:'verified'}];
  assert.equal(await localGuideDocuments({async documentsForGuides(...a){args=a;return docs}},['a','b','c'],true),docs);
  assert.deepEqual(args,[[{id:'a'},{id:'b'},{id:'c'}],{max:2}]);
});
test('unavailable or failed vault is explicit rather than silently claimed as used',async()=>{
  await assert.rejects(localGuideDocuments(null,['a'],true));
  await assert.rejects(localGuideDocuments({async documentsForGuides(){throw Error('storage')}},['a'],true),/storage/);
});
