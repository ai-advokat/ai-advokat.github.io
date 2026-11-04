import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { augmentWorkersAIJudicialDiscovery } from "../src/workers-ai-provider.js";

test("FREE AI Advokat chat receives non-authority judicial discovery context",()=>{
  const messages=[
    {role:"system",content:"You are AI Advokat FREE Workers AI mode."},
    {role:"user",content:"USER QUESTION:\nШто има во судската практика на Апелационен суд Гостивар за граѓански спорови?"}
  ];
  const out=augmentWorkersAIJudicialDiscovery(messages);
  assert.equal(out.length,2);
  assert.match(out[1].content,/JUDICIAL DISCOVERY CONTEXT/);
  assert.match(out[1].content,/Апелационен суд Гостивар/);
  assert.match(out[1].content,/LEGAL_AUTHORITY: false/);
  assert.match(out[1].content,/Do not state a holding/);
});

test("non-chat Workers AI calls are not contaminated by judicial discovery",()=>{
  const messages=[
    {role:"system",content:"Repair Macedonian language only."},
    {role:"user",content:"Поправи го текстот."}
  ];
  const out=augmentWorkersAIJudicialDiscovery(messages);
  assert.deepEqual(out,messages);
});

test("OpenAI orchestrator adds discovery only after authority preflight",()=>{
  const src=fs.readFileSync(new URL("../src/agent-orchestrator.js",import.meta.url),"utf8");
  const preflight=src.indexOf("validateExecutionPreconditions(plan,{corpusContext,externalContext,externalResearchEnabled})");
  const discovery=src.indexOf("judicialDiscoveryContext(String(researchInput||input||");
  const effective=src.indexOf("effectiveCorpusContext");
  assert.ok(preflight>=0);
  assert.ok(discovery>preflight);
  assert.ok(effective>discovery);
  assert.match(src,/enforceCanonicalContextProvenance\(judicialDiscovery\.context\)/);
});
