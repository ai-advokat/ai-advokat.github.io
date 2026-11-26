import test from 'node:test';
import assert from 'node:assert/strict';
import {parseResponseRevision,createResponseRevision,verifyResponseRevision,isResponseRevisionRetry,caseResponseRevisionKey} from '../src/case-response-revisions.js';
import {caseResponseHash} from '../src/case-response-sources.js';
const caseId='CASE-123e4567-e89b-42d3-a456-426614174000', other='CASE-123e4567-e89b-42d3-a456-426614174001', accountId='synthetic-lawyer', draftId='DRAFT-123e4567-e89b-42d3-a456-426614174011';
const draft={draftId, responseSourcesSha256:'a'.repeat(64)};
const at='2026-11-25T00:00:00.000Z';
function inp(number=1,base=null,text='\u041f\u0440\u0432 \u0442\u0435\u043a\u0441\u0442.') {return parseResponseRevision({draftId,requestId:`00000000-0000-4000-8000-${String(number).padStart(12,'0')}`,text,note:'test',base});}
const mk=async(input)=>createResponseRevision({caseId,accountId,input,draft,savedAt:at});
const parent=(r)=>({number:r.number,sha256:r.sha256});
test('hash exact UTF8 known vector', async()=>assert.equal(await caseResponseHash('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'));
test('same content in distinct revisions has distinct revision SHA',async()=>{const r1=await mk(inp()),r2=await mk(inp(2,parent(r1)));assert.equal(r1.text,r2.text);assert.notEqual(r1.sha256,r2.sha256);assert.equal(r2.number,2);assert.equal(r2.parentSha256,r1.sha256)});
test('rollback to original text retains distinct identity',async()=>{const r1=await mk(inp()),r2=await mk(inp(2,parent(r1),'changed')),r3=await mk(inp(3,parent(r2)));assert.equal(r3.text,r1.text);assert.notEqual(r3.sha256,r1.sha256);assert.equal(r3.number,3)});
test('stored text mutation rejected',async()=>{const r=await mk(inp());assert.equal(await verifyResponseRevision({...r,text:'changed'},caseId,1),null)});
test('wrong case/number rejected and exact revision verified',async()=>{const r=await mk(inp());assert.equal((await verifyResponseRevision(r,caseId,1)).sha256,r.sha256);assert.equal(await verifyResponseRevision(r,other,1),null);assert.equal(await verifyResponseRevision(r,caseId,2),null)});
test('writer mutation rejected',async()=>{const r=await mk(inp());assert.equal(await verifyResponseRevision({...r,accountId:'other'},caseId,1),null)});
test('idempotent retry only exact actor, request, payload',async()=>{const i=inp(),r=await mk(i);assert.equal(isResponseRevisionRetry(r,i,accountId),true);assert.equal(isResponseRevisionRetry(r,i,'other'),false);assert.equal(isResponseRevisionRetry(r,{...i,text:'changed'},accountId),false);assert.equal(isResponseRevisionRetry(r,inp(2),accountId),false)});
test('reject malformed input and bidi control',()=>{const i=inp();assert.equal(parseResponseRevision({...i,draftId:'DRAFT-invalid'}),null);assert.equal(parseResponseRevision({...i,text:'\u202eabc'}),null);assert.equal(parseResponseRevision({...i,base:{number:0,sha256:'a'.repeat(64)}}),null)});
test('revision storage keys are ordered and case separated',()=>{assert.ok(caseResponseRevisionKey(caseId,9)<caseResponseRevisionKey(caseId,10));assert.notEqual(caseResponseRevisionKey(caseId,1),caseResponseRevisionKey(other,1))});
