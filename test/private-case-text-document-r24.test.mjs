import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {decodePrivateCaseTextDocument,privateCaseTextMime} from "../src/private-case-text-document.js";

const enc=new TextEncoder();
const read=(mimeType,text,filename="fixture.txt")=>
  decodePrivateCaseTextDocument({mimeType,bytes:enc.encode(text),filename});

test("bounded private CSV, MD, TXT and JSON use strict UTF8 and untrusted label",()=>{
  for(const [mime,body] of [
    ["application/json",'{"тужба":"пример", "article":"not verified"}'],
    ["text/markdown","# Синтетички поднесок\nНема потврден извор."],
    ["text/csv","ид,износ\nтест,100"],
    ["text/plain","Адвокатски податоци — само синтетички."]
  ]){
    const r=read(mime,body);
    assert.equal(r.handled,true);assert.equal(r.ok,true);
    assert.match(r.text,/UNTRUSTED PRIVATE FILE DATA/);
    assert.ok(r.text.includes(body));
    assert.equal(r.trustedLegalAuthority,false);
    assert.equal(r.requiresHumanReview,true);
    assert.ok(privateCaseTextMime(mime));
  }
});
test("rejects corrupt JSON, unsafe bytes, unsupported MIME and unbounded text",()=>{
  assert.deepEqual(read("image/jpeg","ignored"),{handled:false});
  assert.equal(read("application/json","{unclosed").error,"case_text_document_invalid_json");
  assert.equal(read("text/plain","abc\u0000def").error,"case_text_document_control_character");
  assert.equal(read("text/plain","").error,"case_text_document_empty");
  const invalid=decodePrivateCaseTextDocument({mimeType:"text/plain",bytes:new Uint8Array([0xff,0xfe,0xfa])});
  assert.equal(invalid.error,"case_text_document_invalid_utf8");
  assert.equal(read("text/plain","x".repeat(256*1024+1)).error,"case_text_document_partition_required");
  assert.equal(read("text/plain","x".repeat(120001)).error,"case_text_document_empty_or_too_long");
});
test("private AI upload path uses direct text as untrusted evidence and no silent model upload on selection",()=>{
  const worker=readFileSync("src/index.js","utf8");
  const ui=readFileSync("assets/casepilot-workspace-ui.js","utf8");
  const html=readFileSync("casepilot-workspace.html","utf8");
  assert.match(worker,/decodePrivateCaseTextDocument/);
  assert.match(worker,/if\(directText.handled\)/);
  assert.match(worker,/parts.push\(\{type:"input_text",text:directText.text\}\)/);
  assert.match(ui,/textFilesNeedExplicitAIConsent/);
  assert.match(ui,/JSON\/MD\/CSV\/TXT не се испратени на AI/);
  assert.match(html,/\.json,\.md,\.csv,\.txt/);
});
