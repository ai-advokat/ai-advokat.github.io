// AI Advokat 4 — Professional DOCX Engine V1 (Draft PR-C).
// Stacked on PR-B. Pure local OOXML renderer: no provider calls, persistence,
// filing, signature, external transmission, migrations, or production activation.

import {
  LEGAL_DOCUMENT_AST_VERSION,
  LEGAL_DOCUMENT_EXPORT_VERSION,
  legalDocumentExportBundle
} from "./legal-document-export.js";

export const PROFESSIONAL_DOCX_ENGINE_VERSION="1.0.0";
export const PROFESSIONAL_DOCX_PROFILE=Object.freeze({
  page:"A4",
  widthTwips:11906,
  heightTwips:16838,
  marginsTwips:Object.freeze({top:1417,right:1417,bottom:1417,left:1417}),
  font:"Verdana",
  fontSizeHalfPoints:20,
  bodyLineTwips:276,
  bodyAfterTwips:120,
  courtProfile:"legal-court-v1",
  reviewProfile:"legal-review-v1"
});

const te=new TextEncoder();
const CONTROL=/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u;

function cleanText(value,{label="text",max=12000,required=false}={}){
  if(value===undefined||value===null||value===""){
    if(required) throw new Error("professional_docx_"+label+"_required");
    return "";
  }
  if(typeof value!=="string") throw new Error("professional_docx_"+label+"_invalid");
  const text=value.normalize("NFKC").trim();
  if(required&&!text) throw new Error("professional_docx_"+label+"_required");
  if(text.length>max||CONTROL.test(text)) throw new Error("professional_docx_"+label+"_invalid");
  return text;
}

function xmlEscape(value){
  return String(value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&apos;");
}

function le16(n){return new Uint8Array([n&255,(n>>>8)&255]);}
function le32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);}
function concatBytes(parts){
  const arrays=parts.map(p=>p instanceof Uint8Array?p:te.encode(String(p)));
  const total=arrays.reduce((sum,a)=>sum+a.length,0);
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
  const locals=[],centrals=[];
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

function runXml(text,{bold=false,italic=false,size=20}={}){
  const rPr=[
    '<w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:eastAsia="Verdana" w:cs="Verdana"/>',
    bold?"<w:b/>":"",
    italic?"<w:i/>":"",
    '<w:sz w:val="'+size+'"/><w:szCs w:val="'+size+'"/>'
  ].join("");
  return '<w:r><w:rPr>'+rPr+'</w:rPr><w:t xml:space="preserve">'+xmlEscape(text||" ")+'</w:t></w:r>';
}

function paragraph(text,{
  style="LegalBody",
  align=null,
  bold=false,
  italic=false,
  size=20,
  keepNext=false,
  keepLines=true,
  numId=null,
  firstLine=null,
  left=null
}={}){
  const pPr=[
    '<w:pStyle w:val="'+style+'"/>',
    keepNext?"<w:keepNext/>":"",
    keepLines?"<w:keepLines/>":"",
    align?'<w:jc w:val="'+align+'"/>':"",
    numId?'<w:numPr><w:ilvl w:val="0"/><w:numId w:val="'+numId+'"/></w:numPr>':"",
    (firstLine!==null||left!==null)?'<w:ind'+(left!==null?' w:left="'+left+'"':"")+(firstLine!==null?' w:firstLine="'+firstLine+'"':"")+'/>':""
  ].join("");
  return '<w:p><w:pPr>'+pPr+'</w:pPr>'+runXml(text,{bold,italic,size})+'</w:p>';
}

function tableRow(label,value){
  return '<w:tr><w:trPr><w:cantSplit/></w:trPr>'+
    '<w:tc><w:tcPr><w:tcW w:w="2200" w:type="dxa"/></w:tcPr>'+
      paragraph(label,{style:"LegalMeta",bold:true,keepNext:true,keepLines:true})+
    '</w:tc>'+
    '<w:tc><w:tcPr><w:tcW w:w="6900" w:type="dxa"/></w:tcPr>'+
      paragraph(value,{style:"LegalMeta",keepLines:true})+
    '</w:tc></w:tr>';
}

function metaTable(rows){
  return '<w:tbl>'+
    '<w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>'+
      '<w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>'+
    '</w:tblBorders><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr>'+
    rows.map(([label,value])=>tableRow(label,value)).join("")+
  '</w:tbl>';
}

function numberingXml(){
  const abstract=(id,format,text)=>'<w:abstractNum w:abstractNumId="'+id+'">'+
    '<w:multiLevelType w:val="singleLevel"/>'+
    '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="'+format+'"/><w:lvlText w:val="'+text+'"/><w:lvlJc w:val="left"/>'+
    '<w:pPr><w:tabs><w:tab w:val="num" w:pos="720"/></w:tabs><w:ind w:left="720" w:hanging="360"/></w:pPr>'+
    '<w:rPr><w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/><w:b/><w:sz w:val="20"/></w:rPr></w:lvl></w:abstractNum>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
    abstract(0,"upperRoman","%1.")+
    abstract(1,"decimal","%1.")+
    '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>'+
    '<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>'+
    '<w:num w:numId="3"><w:abstractNumId w:val="1"/></w:num>'+
    '<w:num w:numId="4"><w:abstractNumId w:val="1"/></w:num>'+
    '<w:num w:numId="5"><w:abstractNumId w:val="1"/></w:num>'+
    '</w:numbering>';
}

function stylesXml(){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
  '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:eastAsia="Verdana" w:cs="Verdana"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault>'+
  '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'+
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:eastAsia="Verdana" w:cs="Verdana"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="LegalBody"><w:name w:val="Legal Body"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="both"/><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="LegalMeta"><w:name w:val="Legal Meta"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60" w:line="240" w:lineRule="auto"/></w:pPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="LegalTitle"><w:name w:val="Legal Title"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:keepNext/><w:spacing w:before="240" w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="LegalSection"><w:name w:val="Legal Section"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="180" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="LegalWarning"><w:name w:val="Legal Warning"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:keepNext/><w:spacing w:after="180"/></w:pPr><w:rPr><w:b/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>'+
  '<w:style w:type="paragraph" w:styleId="LegalSignature"><w:name w:val="Legal Signature"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="right"/><w:keepLines/><w:spacing w:before="240" w:after="60"/></w:pPr></w:style>'+
  '</w:styles>';
}

function settingsXml(){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
    '<w:compat/><w:doNotTrackMoves/><w:doNotTrackFormatting/>'+
    '</w:settings>';
}

function footerXml(){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
    '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>'+
    '<w:r><w:rPr><w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/><w:sz w:val="16"/></w:rPr><w:t>Страница </w:t></w:r>'+
    '<w:fldSimple w:instr=" PAGE "><w:r><w:rPr><w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple>'+
    '</w:p></w:ftr>';
}

function coreXml(kind){
  const title=kind==="court"?"AI Advokat 4 Professional Legal Document":"AI Advokat 4 Internal Review Annex";
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'+
    '<dc:title>'+xmlEscape(title)+'</dc:title><dc:creator>AI Advokat 4</dc:creator><cp:lastModifiedBy>AI Advokat 4</cp:lastModifiedBy>'+
    '</cp:coreProperties>';
}

function packageDocx(documentXml,{kind="court"}={}){
  const contentTypes='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
    '<Default Extension="xml" ContentType="application/xml"/>'+
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'+
    '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'+
    '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'+
    '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'+
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'+
    '</Types>';
  const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'+
    '</Relationships>';
  const docRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'+
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>'+
    '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'+
    '</Relationships>';
  return zipStore([
    {name:"[Content_Types].xml",data:contentTypes},
    {name:"_rels/.rels",data:rels},
    {name:"docProps/core.xml",data:coreXml(kind)},
    {name:"word/document.xml",data:documentXml},
    {name:"word/styles.xml",data:stylesXml()},
    {name:"word/numbering.xml",data:numberingXml()},
    {name:"word/settings.xml",data:settingsXml()},
    {name:"word/footer1.xml",data:footerXml()},
    {name:"word/_rels/document.xml.rels",data:docRels}
  ]);
}

function sectionHeading(text){
  return paragraph(text.toUpperCase(),{
    style:"LegalSection",
    bold:true,
    keepNext:true,
    keepLines:true,
    numId:1
  });
}

function listItems(items,numId,{bold=false}={}){
  return items.map(item=>paragraph(item,{
    style:"LegalBody",
    bold,
    keepLines:true,
    numId
  })).join("");
}

function courtMeta(ast,subject){
  const court=ast.court||"[НАДЛЕЖЕН СУД]";
  const parties=ast.parties.length?ast.parties:[
    {role:"ТУЖИТЕЛ",name:"[ИМЕ И АДРЕСА]",identifier:""},
    {role:"ТУЖЕН",name:"[НАЗИВ И СЕДИШТЕ]",identifier:""}
  ];
  const rows=[["ДО",court]];
  for(const party of parties){
    rows.push([
      String(party.role||"СТРАНКА").toUpperCase(),
      [party.name,party.identifier].filter(Boolean).join(" · ")||"[ПОДАТОЦИ]"
    ]);
  }
  rows.push(["ПРЕДМЕТ",subject||"[ПРЕДМЕТ]"]);
  return metaTable(rows);
}

function reportSection(report,id){
  return report.sections.find(section=>section.id===id)||{items:[]};
}

function courtDocumentXml(bundle,options){
  const ast=bundle.ast;
  const report=bundle.courtReport;
  const subject=cleanText(options.subject||"",{label:"subject",max:500});
  const heading=cleanText(options.pleadingHeading||"Т У Ж Б А",{label:"pleading_heading",max:120,required:true});
  const place=cleanText(options.place||"[МЕСТО]",{label:"place",max:160,required:true});
  const date=cleanText(options.date||"[ДАТУМ]",{label:"date",max:80,required:true});
  const signature=cleanText(options.signature||"[ПОТПИС]",{label:"signature",max:240,required:true});

  const facts=reportSection(report,"facts").items.map(x=>x.text);
  const legalArgs=reportSection(report,"legal-arguments").items.map(x=>[x.heading,x.text].filter(Boolean).join(" — "));
  const legalBases=reportSection(report,"legal-bases").items.map(x=>[x.heading,x.text].filter(Boolean).join(" — "));
  const evidence=reportSection(report,"evidence-proposals").items.map(x=>[x.heading,x.text].filter(Boolean).join(" — "));
  const petitum=reportSection(report,"petitum").items.map(x=>x.text);
  const attachments=reportSection(report,"attachments").items.map(x=>x.text);

  const body=[];
  if(bundle.mode==="working"){
    body.push(paragraph("РАБОТЕН НАЦРТ — НЕ Е ЗА ПОДНЕСУВАЊЕ",{style:"LegalWarning",bold:true,align:"center",keepNext:true}));
  }
  body.push(courtMeta(ast,subject));
  body.push(paragraph(heading,{style:"LegalTitle",bold:true,size:24,align:"center",keepNext:true}));

  body.push(sectionHeading("Фактичка состојба"));
  body.push(listItems(facts.length?facts:["[ФАКТИЧКА СОСТОЈБА]"],2));

  body.push(sectionHeading("Правна основа"));
  body.push(listItems(
    [...legalBases,...legalArgs].length?[...legalBases,...legalArgs]:["[ПРОВЕРЕНА ПРАВНА ОСНОВА]"],
    3
  ));

  body.push(sectionHeading("Доказни предлози"));
  body.push(listItems(evidence.length?evidence:["[ДОКАЗНИ ПРЕДЛОЗИ]"],3));

  body.push(sectionHeading("Тужбено барање"));
  body.push(listItems(petitum.length?petitum:["[ТУЖБЕНО БАРАЊЕ]"],4,{bold:true}));

  body.push(sectionHeading("Прилози"));
  body.push(listItems(attachments.length?attachments:["[ПРИЛОЗИ]"],5));

  body.push(paragraph(place+", "+date,{style:"LegalSignature",align:"right",keepLines:true}));
  body.push(paragraph(signature,{style:"LegalSignature",align:"right",bold:true,keepLines:true}));

  const m=PROFESSIONAL_DOCX_PROFILE.marginsTwips;
  body.push('<w:sectPr><w:footerReference w:type="default" r:id="rId4"/>'+
    '<w:pgSz w:w="'+PROFESSIONAL_DOCX_PROFILE.widthTwips+'" w:h="'+PROFESSIONAL_DOCX_PROFILE.heightTwips+'"/>'+
    '<w:pgMar w:top="'+m.top+'" w:right="'+m.right+'" w:bottom="'+m.bottom+'" w:left="'+m.left+'" w:header="708" w:footer="708" w:gutter="0"/>'+
    '</w:sectPr>');

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+
    body.join("")+
    '</w:body></w:document>';
}

function reviewDocumentXml(bundle){
  const report=bundle.reviewAnnexReport;
  const body=[
    paragraph("INTERNAL REVIEW ANNEX — NOT FOR FILING",{style:"LegalWarning",bold:true,align:"center",keepNext:true}),
    paragraph(report.title,{style:"LegalTitle",bold:true,size:24,align:"center",keepNext:true})
  ];
  for(const section of report.sections){
    body.push(sectionHeading(section.title));
    if(!section.items.length){
      body.push(paragraph("—",{style:"LegalBody",keepLines:true}));
      continue;
    }
    for(const item of section.items){
      const text=[item.heading,item.text,item.status?"Status: "+item.status:""].filter(Boolean).join("\n");
      body.push(paragraph(text,{style:"LegalBody",keepLines:true}));
    }
  }
  const gate=bundle.readiness.humanGate;
  body.push(sectionHeading("Human Gate"));
  body.push(paragraph([
    "Status: "+String(gate.status||"pending").toUpperCase(),
    gate.reviewer?"Reviewer: "+gate.reviewer:"",
    gate.decidedAt?"Decision time: "+gate.decidedAt:"",
    gate.decisionRef?"Decision reference: "+gate.decisionRef:""
  ].filter(Boolean).join("\n"),{style:"LegalBody",keepLines:true}));

  const m=PROFESSIONAL_DOCX_PROFILE.marginsTwips;
  body.push('<w:sectPr><w:footerReference w:type="default" r:id="rId4"/>'+
    '<w:pgSz w:w="'+PROFESSIONAL_DOCX_PROFILE.widthTwips+'" w:h="'+PROFESSIONAL_DOCX_PROFILE.heightTwips+'"/>'+
    '<w:pgMar w:top="'+m.top+'" w:right="'+m.right+'" w:bottom="'+m.bottom+'" w:left="'+m.left+'" w:header="708" w:footer="708" w:gutter="0"/>'+
    '</w:sectPr>');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+
    body.join("")+
    '</w:body></w:document>';
}

export function renderProfessionalLegalDocxBundle(astInput,{
  mode="working",
  serverHumanGate=null,
  subject="",
  place="[МЕСТО]",
  date="[ДАТУМ]",
  signature="[ПОТПИС]",
  pleadingHeading="Т У Ж Б А"
}={}){
  const bundle=legalDocumentExportBundle(astInput,{mode,serverHumanGate});
  if(bundle.ast.version!==LEGAL_DOCUMENT_AST_VERSION||bundle.ast.exportVersion!==LEGAL_DOCUMENT_EXPORT_VERSION){
    throw new Error("professional_docx_legal_document_ast_required");
  }
  const courtXml=courtDocumentXml(bundle,{subject,place,date,signature,pleadingHeading});
  const reviewXml=reviewDocumentXml(bundle);
  return Object.freeze({
    engineVersion:PROFESSIONAL_DOCX_ENGINE_VERSION,
    profile:PROFESSIONAL_DOCX_PROFILE,
    mode,
    readiness:bundle.readiness,
    ast:bundle.ast,
    courtDocument:packageDocx(courtXml,{kind:"court"}),
    reviewAnnex:packageDocx(reviewXml,{kind:"review"})
  });
}
