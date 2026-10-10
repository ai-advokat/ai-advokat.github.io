// AI Advokat CasePilot real export engine v1.
// Pure Web/Worker-compatible JS: no Node APIs and no third-party runtime packages.
// MD is the canonical textual master. DOCX is generated as an uncompressed OpenXML
// package. PDF assembly accepts browser-rendered JPEG pages so Cyrillic is rendered
// with the user's/system font without shipping a font binary in this repository.

export const CASE_EXPORT_VERSION="1.0.0";
export const CASE_EXPORT_FORMATS=Object.freeze(["md","docx","pdf"]);
export const CASE_EXPORT_MODES=Object.freeze(["working","professional"]);

const MAX_SECTIONS=40;
const MAX_ITEMS_PER_SECTION=120;
const MAX_SOURCE_MANIFEST=500;
const MAX_PROVENANCE=1000;
const MAX_ITEM_TEXT=50000;
const MAX_TOTAL_TEXT=900000;
const CONTROL=/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u;
const te=new TextEncoder();

function cleanText(value,{max=5000,required=false,label="text"}={}){
  if(value===undefined||value===null||value===""){
    if(required) throw new Error("case_export_"+label+"_required");
    return "";
  }
  if(typeof value!=="string") throw new Error("case_export_"+label+"_invalid");
  const text=value.normalize("NFKC").trim();
  if(required && !text) throw new Error("case_export_"+label+"_required");
  if(text.length>max || CONTROL.test(text)) throw new Error("case_export_"+label+"_invalid");
  return text;
}

function isoDate(value,label="generated_at"){
  const text=cleanText(value,{max:40,required:true,label});
  const d=new Date(text);
  if(!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10)!==text.slice(0,10)){
    throw new Error("case_export_"+label+"_invalid");
  }
  return d.toISOString();
}

function cleanStatus(value){
  return cleanText(value,{max:48,label:"status"}).toUpperCase();
}

function normalizeSourceRef(value,index=0){
  if(!value || typeof value!=="object" || Array.isArray(value)) throw new Error("case_export_source_ref_invalid");
  return Object.freeze({
    id:cleanText(value.id,{max:120,required:true,label:"source_id"}),
    locator:cleanText(value.locator,{max:180,label:"source_locator"}),
    title:cleanText(value.title,{max:240,label:"source_title"})
  });
}

function normalizeItem(value,index){
  if(typeof value==="string"){
    return Object.freeze({heading:"",text:cleanText(value,{max:MAX_ITEM_TEXT,required:true,label:"item_text"}),status:"",sources:Object.freeze([])});
  }
  if(!value || typeof value!=="object" || Array.isArray(value)) throw new Error("case_export_item_invalid");
  const sources=Array.isArray(value.sources)?value.sources.map(normalizeSourceRef):[];
  if(sources.length>50) throw new Error("case_export_item_sources_limit");
  return Object.freeze({
    heading:cleanText(value.heading,{max:240,label:"item_heading"}),
    text:cleanText(value.text,{max:MAX_ITEM_TEXT,required:true,label:"item_text"}),
    status:cleanStatus(value.status),
    sources:Object.freeze(sources)
  });
}

function normalizeSection(value,index){
  if(!value || typeof value!=="object" || Array.isArray(value)) throw new Error("case_export_section_invalid");
  const items=Array.isArray(value.items)?value.items:[];
  if(items.length>MAX_ITEMS_PER_SECTION) throw new Error("case_export_section_item_limit");
  return Object.freeze({
    id:cleanText(value.id||("section-"+(index+1)),{max:100,required:true,label:"section_id"}),
    title:cleanText(value.title,{max:240,required:true,label:"section_title"}),
    items:Object.freeze(items.map(normalizeItem))
  });
}

function normalizeManifestEntry(value,index){
  if(!value || typeof value!=="object" || Array.isArray(value)) throw new Error("case_export_manifest_entry_invalid");
  const sha=value.sha256===undefined||value.sha256===null||value.sha256===""
    ? ""
    : cleanText(value.sha256,{max:64,label:"source_sha256"});
  if(sha && !/^[a-f0-9]{64}$/i.test(sha)) throw new Error("case_export_source_sha256_invalid");
  return Object.freeze({
    id:cleanText(value.id,{max:120,required:true,label:"source_id"}),
    title:cleanText(value.title,{max:240,required:true,label:"source_title"}),
    locator:cleanText(value.locator,{max:180,label:"source_locator"}),
    version:cleanText(value.version,{max:120,label:"source_version"}),
    sha256:sha.toLowerCase()
  });
}

function normalizeProvenance(value,index){
  if(!value || typeof value!=="object" || Array.isArray(value)) throw new Error("case_export_provenance_invalid");
  return Object.freeze({
    claimId:cleanText(value.claimId||value.id,{max:120,required:true,label:"claim_id"}),
    sourceId:cleanText(value.sourceId,{max:120,required:true,label:"source_id"}),
    locator:cleanText(value.locator,{max:180,label:"source_locator"}),
    note:cleanText(value.note,{max:1000,label:"provenance_note"})
  });
}

function normalizeHumanGate(value,mode){
  const source=(value && typeof value==="object" && !Array.isArray(value)) ? value : {};
  const status=cleanText(source.status||"pending",{max:32,required:true,label:"human_gate_status"}).toLowerCase();
  if(!["pending","approved","rejected"].includes(status)) throw new Error("case_export_human_gate_status_invalid");
  const reviewer=cleanText(source.reviewer,{max:180,label:"human_gate_reviewer"});
  const decidedAt=source.decidedAt ? isoDate(source.decidedAt,"human_gate_decided_at") : "";
  const decisionRef=cleanText(source.decisionRef,{max:180,label:"human_gate_decision_ref"});
  if(mode==="professional"){
    if(status!=="approved" || !reviewer || !decidedAt || !decisionRef){
      throw new Error("case_export_professional_requires_recorded_human_gate");
    }
  }
  return Object.freeze({status,reviewer,decidedAt,decisionRef});
}

export function normalizeCaseExportReport(input,{mode="working",serverHumanGate=null}={}){
  if(!CASE_EXPORT_MODES.includes(mode)) throw new Error("case_export_mode_invalid");
  if(!input || typeof input!=="object" || Array.isArray(input)) throw new Error("case_export_payload_required");

  const sections=Array.isArray(input.sections)?input.sections:[];
  const sourceManifest=Array.isArray(input.sourceManifest)?input.sourceManifest:[];
  const provenance=Array.isArray(input.provenance)?input.provenance:[];
  if(sections.length>MAX_SECTIONS) throw new Error("case_export_section_limit");
  if(sourceManifest.length>MAX_SOURCE_MANIFEST) throw new Error("case_export_source_manifest_limit");
  if(provenance.length>MAX_PROVENANCE) throw new Error("case_export_provenance_limit");

  const normalized=Object.freeze({
    exportVersion:CASE_EXPORT_VERSION,
    caseId:cleanText(input.caseId,{max:180,required:true,label:"case_id"}),
    title:cleanText(input.title,{max:240,required:true,label:"title"}),
    caseVersion:cleanText(input.caseVersion||"0.1",{max:80,required:true,label:"case_version"}),
    generatedAt:isoDate(input.generatedAt||new Date().toISOString()),
    mode,
    humanGate:normalizeHumanGate(serverHumanGate||input.humanGate,mode),
    summary:cleanText(input.summary,{max:20000,label:"summary"}),
    sections:Object.freeze(sections.map(normalizeSection)),
    sourceManifest:Object.freeze(sourceManifest.map(normalizeManifestEntry)),
    provenance:Object.freeze(provenance.map(normalizeProvenance))
  });

  let total=normalized.title.length+normalized.summary.length;
  for(const s of normalized.sections){
    total+=s.title.length;
    for(const item of s.items){
      total+=item.heading.length+item.text.length+item.status.length;
      for(const src of item.sources) total+=src.id.length+src.locator.length+src.title.length;
    }
  }
  for(const s of normalized.sourceManifest) total+=s.id.length+s.title.length+s.locator.length+s.version.length+s.sha256.length;
  for(const p of normalized.provenance) total+=p.claimId.length+p.sourceId.length+p.locator.length+p.note.length;
  if(total>MAX_TOTAL_TEXT) throw new Error("case_export_payload_too_large");

  return normalized;
}

export function caseExportFilename(report,format){
  if(!CASE_EXPORT_FORMATS.includes(format)) throw new Error("case_export_format_invalid");
  const id=String(report?.caseId||"case").replace(/[^A-Za-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80)||"case";
  const version=String(report?.caseVersion||"v1").replace(/[^A-Za-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40)||"v1";
  return `${id}-${version}-casepilot.${format}`;
}

export function caseExportMime(format){
  if(format==="md") return "text/markdown; charset=utf-8";
  if(format==="docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if(format==="pdf") return "application/pdf";
  throw new Error("case_export_format_invalid");
}

function gateLabel(report){
  return report.mode==="professional"
    ? "PROFESSIONAL COPY — HUMAN GATE APPROVED"
    : "WORKING COPY — HUMAN GATE PENDING";
}

function sourceRefText(ref){
  const bits=[ref.id];
  if(ref.locator) bits.push(ref.locator);
  if(ref.title) bits.push(ref.title);
  return bits.filter(Boolean).join(" · ");
}

export function caseExportBlocks(reportInput){
  const report=reportInput?.exportVersion===CASE_EXPORT_VERSION ? reportInput : normalizeCaseExportReport(reportInput);
  const blocks=[];
  blocks.push({kind:"title",text:report.title});
  blocks.push({kind:"warning",text:gateLabel(report)});
  blocks.push({kind:"meta",text:`Case ID: ${report.caseId}`});
  blocks.push({kind:"meta",text:`Case version: ${report.caseVersion}`});
  blocks.push({kind:"meta",text:`Generated: ${report.generatedAt}`});
  if(report.summary){
    blocks.push({kind:"heading1",text:"Executive summary"});
    blocks.push({kind:"body",text:report.summary});
  }

  for(const section of report.sections){
    blocks.push({kind:"heading1",text:section.title});
    if(section.items.length===0) blocks.push({kind:"body",text:"—"});
    for(const item of section.items){
      if(item.heading) blocks.push({kind:"heading2",text:item.heading});
      blocks.push({kind:"body",text:item.text});
      if(item.status) blocks.push({kind:"meta",text:`Status: ${item.status}`});
      if(item.sources.length){
        blocks.push({kind:"source",text:"Sources: "+item.sources.map(sourceRefText).join("; ")});
      }
    }
  }

  blocks.push({kind:"heading1",text:"Source manifest"});
  if(report.sourceManifest.length===0) blocks.push({kind:"body",text:"No source manifest entries supplied."});
  for(const src of report.sourceManifest){
    const details=[
      src.id,
      src.title,
      src.locator ? "Locator: "+src.locator : "",
      src.version ? "Version: "+src.version : "",
      src.sha256 ? "SHA-256: "+src.sha256 : ""
    ].filter(Boolean).join(" · ");
    blocks.push({kind:"source",text:details});
  }

  blocks.push({kind:"heading1",text:"Human Gate"});
  blocks.push({kind:"body",text:`Status: ${report.humanGate.status.toUpperCase()}`});
  if(report.humanGate.reviewer) blocks.push({kind:"body",text:"Reviewer: "+report.humanGate.reviewer});
  if(report.humanGate.decidedAt) blocks.push({kind:"body",text:"Decision time: "+report.humanGate.decidedAt});
  if(report.humanGate.decisionRef) blocks.push({kind:"body",text:"Decision reference: "+report.humanGate.decisionRef});

  blocks.push({kind:"heading1",text:"Provenance appendix"});
  if(report.provenance.length===0) blocks.push({kind:"body",text:"No provenance entries supplied."});
  for(const p of report.provenance){
    blocks.push({kind:"source",text:[
      `Claim ${p.claimId}`,
      `Source ${p.sourceId}`,
      p.locator ? "Locator: "+p.locator : "",
      p.note
    ].filter(Boolean).join(" · ")});
  }

  return Object.freeze(blocks.map(b=>Object.freeze(b)));
}

function mdEscapeInline(text){
  return String(text).replace(/([\\`*_{}\[\]<>])/g,"\\$1");
}

export function renderCaseExportMarkdown(reportInput){
  const report=reportInput?.exportVersion===CASE_EXPORT_VERSION ? reportInput : normalizeCaseExportReport(reportInput);
  const out=[];
  out.push("# "+report.title);
  out.push("");
  out.push("> **"+gateLabel(report)+"**");
  out.push("");
  out.push("- Case ID: "+mdEscapeInline(report.caseId));
  out.push("- Case version: "+mdEscapeInline(report.caseVersion));
  out.push("- Generated: "+mdEscapeInline(report.generatedAt));
  out.push("");
  if(report.summary){
    out.push("## Executive summary","");
    out.push(report.summary,"");
  }
  for(const section of report.sections){
    out.push("## "+section.title,"");
    if(!section.items.length) out.push("—","");
    for(const item of section.items){
      if(item.heading) out.push("### "+item.heading,"");
      out.push(item.text,"");
      if(item.status) out.push("_Status: "+mdEscapeInline(item.status)+"_","");
      if(item.sources.length){
        out.push("Sources:");
        for(const src of item.sources) out.push("- "+sourceRefText(src));
        out.push("");
      }
    }
  }
  out.push("## Source manifest","");
  if(!report.sourceManifest.length) out.push("No source manifest entries supplied.","");
  for(const src of report.sourceManifest){
    out.push("- "+[
      src.id+" — "+src.title,
      src.locator ? "Locator: "+src.locator : "",
      src.version ? "Version: "+src.version : "",
      src.sha256 ? "SHA-256: "+src.sha256 : ""
    ].filter(Boolean).join(" · "));
  }
  out.push("","## Human Gate","");
  out.push("- Status: "+report.humanGate.status.toUpperCase());
  if(report.humanGate.reviewer) out.push("- Reviewer: "+report.humanGate.reviewer);
  if(report.humanGate.decidedAt) out.push("- Decision time: "+report.humanGate.decidedAt);
  if(report.humanGate.decisionRef) out.push("- Decision reference: "+report.humanGate.decisionRef);
  out.push("","## Provenance appendix","");
  if(!report.provenance.length) out.push("No provenance entries supplied.","");
  for(const p of report.provenance){
    out.push("- "+[
      "Claim "+p.claimId,
      "Source "+p.sourceId,
      p.locator ? "Locator: "+p.locator : "",
      p.note
    ].filter(Boolean).join(" · "));
  }
  out.push("");
  return out.join("\n");
}

function xmlEscape(value){
  return String(value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&apos;");
}

function wParagraph(text,{style="Normal",bold=false}={}){
  const parts=String(text).split(/\r?\n/);
  return parts.map(line=>`<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r>${bold?"<w:rPr><w:b/></w:rPr>":""}<w:t xml:space="preserve">${xmlEscape(line||" ")}</w:t></w:r></w:p>`).join("");
}

function docxDocumentXml(report){
  const body=[];
  for(const block of caseExportBlocks(report)){
    const style=block.kind==="title" ? "Title"
      : block.kind==="heading1" ? "Heading1"
      : block.kind==="heading2" ? "Heading2"
      : block.kind==="warning" ? "Warning"
      : block.kind==="meta" || block.kind==="source" ? "Meta"
      : "Normal";
    body.push(wParagraph(block.text,{style,bold:block.kind==="warning"}));
  }
  body.push('<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join("")}</w:body></w:document>`;
}

function docxStylesXml(){
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:outlineLvl w:val="0"/><w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:outlineLvl w:val="1"/><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Meta"><w:name w:val="Meta"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Warning"><w:name w:val="Warning"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>
</w:styles>`;
}

function le16(n){
  return new Uint8Array([n&255,(n>>>8)&255]);
}
function le32(n){
  return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);
}
function concatBytes(parts){
  const arrays=parts.map(p=>p instanceof Uint8Array?p:te.encode(String(p)));
  const total=arrays.reduce((n,a)=>n+a.length,0);
  const out=new Uint8Array(total);
  let offset=0;
  for(const a of arrays){out.set(a,offset);offset+=a.length;}
  return out;
}
const CRC_TABLE=(()=>{
  const t=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++) c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
    t[n]=c>>>0;
  }
  return t;
})();
function crc32(bytes){
  let c=0xffffffff;
  for(const b of bytes) c=CRC_TABLE[(c^b)&255]^(c>>>8);
  return (c^0xffffffff)>>>0;
}

function zipStore(entries){
  const locals=[];
  const centrals=[];
  let offset=0;
  for(const entry of entries){
    const name=te.encode(entry.name);
    const data=entry.data instanceof Uint8Array?entry.data:te.encode(String(entry.data));
    const crc=crc32(data);
    const local=concatBytes([
      le32(0x04034b50),le16(20),le16(0x0800),le16(0),le16(0),le16(0),
      le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),
      name,data
    ]);
    locals.push(local);
    const central=concatBytes([
      le32(0x02014b50),le16(20),le16(20),le16(0x0800),le16(0),le16(0),le16(0),
      le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),le16(0),
      le16(0),le16(0),le32(0),le32(offset),name
    ]);
    centrals.push(central);
    offset+=local.length;
  }
  const centralStart=offset;
  const centralSize=centrals.reduce((n,a)=>n+a.length,0);
  const end=concatBytes([
    le32(0x06054b50),le16(0),le16(0),le16(entries.length),le16(entries.length),
    le32(centralSize),le32(centralStart),le16(0)
  ]);
  return concatBytes([...locals,...centrals,end]);
}

export function renderCaseExportDocxBytes(reportInput){
  const report=reportInput?.exportVersion===CASE_EXPORT_VERSION ? reportInput : normalizeCaseExportReport(reportInput);
  const core=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xmlEscape(report.title)}</dc:title><dc:creator>AI Advokat CasePilot</dc:creator><cp:lastModifiedBy>AI Advokat CasePilot</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${xmlEscape(report.generatedAt)}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${xmlEscape(report.generatedAt)}</dcterms:modified></cp:coreProperties>`;
  const contentTypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;
  const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;
  const docRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
  return zipStore([
    {name:"[Content_Types].xml",data:contentTypes},
    {name:"_rels/.rels",data:rels},
    {name:"docProps/core.xml",data:core},
    {name:"word/document.xml",data:docxDocumentXml(report)},
    {name:"word/styles.xml",data:docxStylesXml()},
    {name:"word/_rels/document.xml.rels",data:docRels}
  ]);
}

function asciiBytes(value){
  const text=String(value);
  const out=new Uint8Array(text.length);
  for(let i=0;i<text.length;i++) out[i]=text.charCodeAt(i)&255;
  return out;
}

export function buildPdfFromJpegPages(pages,{pageWidth=595.28,pageHeight=841.89}={}){
  if(!Array.isArray(pages)||pages.length===0) throw new Error("case_export_pdf_pages_required");
  const normalized=pages.map((p,index)=>{
    const bytes=p?.bytes instanceof Uint8Array?p.bytes:new Uint8Array(p?.bytes||[]);
    const width=Number(p?.width);
    const height=Number(p?.height);
    if(bytes.length<4 || bytes[0]!==0xff || bytes[1]!==0xd8) throw new Error("case_export_pdf_jpeg_required");
    if(!Number.isFinite(width)||width<1||!Number.isFinite(height)||height<1) throw new Error("case_export_pdf_dimensions_invalid");
    return {bytes,width:Math.round(width),height:Math.round(height)};
  });

  const objectCount=2+normalized.length*3;
  const objects=new Array(objectCount+1);
  objects[1]=asciiBytes("<< /Type /Catalog /Pages 2 0 R >>");
  const kids=[];
  normalized.forEach((_,i)=>kids.push((3+i*3)+" 0 R"));
  objects[2]=asciiBytes(`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${normalized.length} >>`);

  normalized.forEach((page,i)=>{
    const pageObj=3+i*3;
    const imageObj=pageObj+1;
    const contentObj=pageObj+2;
    objects[pageObj]=asciiBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>`);
    objects[imageObj]=concatBytes([
      asciiBytes(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`),
      page.bytes,
      asciiBytes("\nendstream")
    ]);
    const commands=`q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ`;
    objects[contentObj]=asciiBytes(`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`);
  });

  const header=asciiBytes("%PDF-1.4\n%AI-ADV\n");
  const chunks=[header];
  const offsets=new Array(objectCount+1).fill(0);
  let cursor=header.length;
  for(let i=1;i<=objectCount;i++){
    offsets[i]=cursor;
    const obj=concatBytes([asciiBytes(`${i} 0 obj\n`),objects[i],asciiBytes("\nendobj\n")]);
    chunks.push(obj);
    cursor+=obj.length;
  }
  const xrefOffset=cursor;
  const xref=[];
  xref.push(`xref\n0 ${objectCount+1}\n`);
  xref.push("0000000000 65535 f \n");
  for(let i=1;i<=objectCount;i++) xref.push(String(offsets[i]).padStart(10,"0")+" 00000 n \n");
  xref.push(`trailer\n<< /Size ${objectCount+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  chunks.push(asciiBytes(xref.join("")));
  return concatBytes(chunks);
}
