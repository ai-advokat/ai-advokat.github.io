import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
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


test("valid DOCX text is extracted through the deterministic ZIP/XML helper when Python is available",(t)=>{
  const py=spawnSync("python3",["--version"],{encoding:"utf8"});
  if(py.error?.code==="ENOENT") return t.skip("python3 unavailable");
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"supreme-stage-docx-"));
  const docx=path.join(dir,"decision.docx");
  const make=spawnSync("python3",["-c",[
    "import zipfile,sys",
    "p=sys.argv[1]",
    "xml='''<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:t>Врховен суд</w:t></w:r></w:p><w:p><w:r><w:t>Рев.бр. 12/2026</w:t></w:r></w:p><w:p><w:r><w:t>ПРЕСУДА</w:t></w:r></w:p></w:body></w:document>'''",
    "z=zipfile.ZipFile(p,'w',zipfile.ZIP_DEFLATED);z.writestr('word/document.xml',xml);z.close()"
  ].join(";"),docx],{encoding:"utf8"});
  assert.equal(make.status,0,make.stderr);
  const r=readableTextForDownloadedFile(docx,"application/vnd.openxmlformats-officedocument.wordprocessingml.document",{
    extractedDir:path.join(dir,"extracted")
  });
  assert.equal(r.status,"ready");
  assert.equal(r.extraction,"docx_zip_xml");
  assert.match(r.text,/Врховен суд/);
  assert.match(r.text,/Рев\.бр\. 12\/2026/);
  assert.match(r.extractedTextSha256,/^[a-f0-9]{64}$/);
  assert.ok(fs.existsSync(r.extractedTextPath));
});

test("direct staging source declares deterministic binary extractors and source-binding evidence",()=>{
  const stage=fs.readFileSync("scripts/collect-and-stage-mk-supreme-decisions.mjs","utf8");
  const helper=fs.readFileSync("scripts/extract-case-law-document-text.py","utf8");
  const collector=fs.readFileSync("scripts/download-mk-supreme-decisions.mjs","utf8");
  assert.match(stage,/extract-case-law-document-text\.py/);
  assert.match(stage,/extractedTextSha256/);
  assert.match(helper,/pdftotext/);
  assert.match(helper,/docx_zip_xml/);
  assert.match(helper,/antiword/);
  assert.match(helper,/unrtf/);
  assert.match(collector,/direct_https_retrieval_sha256/);
  assert.match(collector,/remote_content_hash_verified:true/);
  assert.match(collector,/human_gate_status:"pending"/);
});
