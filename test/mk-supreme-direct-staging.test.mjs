import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  htmlToPlainText,
  readableTextForDownloadedFile
} from "../scripts/collect-and-stage-mk-supreme-decisions.mjs";

test("direct staging turns downloaded HTML decisions into legal text without scripts",()=>{
  const text=htmlToPlainText("<html><style>.x{}</style><script>alert(1)</script><h1>Врховен суд</h1><p>Рев.бр. 12/2026</p><div>ПРЕСУДА</div></html>");
  assert.match(text,/Врховен суд/);
  assert.match(text,/Рев\.бр\. 12\/2026/);
  assert.match(text,/ПРЕСУДА/);
  assert.doesNotMatch(text,/alert|\.x/);
});

test("direct staging refuses to guess text from PDF and Word binaries",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"supreme-stage-"));
  const pdf=path.join(dir,"decision.pdf");
  const docx=path.join(dir,"decision.docx");
  fs.writeFileSync(pdf,Buffer.from("%PDF-1.7 fake"));
  fs.writeFileSync(docx,Buffer.from("PK fake"));
  assert.equal(readableTextForDownloadedFile(pdf,"application/pdf").status,"needs_text_extraction");
  assert.equal(readableTextForDownloadedFile(docx,"application/vnd.openxmlformats-officedocument.wordprocessingml.document").status,"needs_text_extraction");
});

test("direct staging reads HTML/text only and keeps production fail-closed",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"supreme-stage-text-"));
  const html=path.join(dir,"decision.html");
  fs.writeFileSync(html,"<p>ОДЛУКА</p><p>Рев.бр. 2/2026</p>");
  const r=readableTextForDownloadedFile(html,"text/html");
  assert.equal(r.status,"ready");
  assert.match(r.text,/Рев\.бр\. 2\/2026/);

  const source=fs.readFileSync("scripts/collect-and-stage-mk-supreme-decisions.mjs","utf8");
  assert.match(source,/buildCaseLawMetadataBatch/);
  assert.match(source,/buildGovernedCaseLawNdjson/);
  assert.match(source,/sourceClass:"official_public"/);
  assert.match(source,/production_eligible:false/);
  assert.match(source,/human_gate_required:true/);
});
