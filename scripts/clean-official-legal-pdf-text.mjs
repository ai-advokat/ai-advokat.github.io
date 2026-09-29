#!/usr/bin/env node
import fs from "node:fs";

const [,,inputPath,outputPath,reportPath] = process.argv;
if (!inputPath || !outputPath || !reportPath) {
  console.error("Usage: node scripts/clean-official-legal-pdf-text.mjs <raw.txt> <clean.txt> <report.json>");
  process.exit(2);
}

const raw=fs.readFileSync(inputPath,"utf8").normalize("NFKC").replace(/\r\n?/g,"\n");
const lines=raw.split("\n");
const removed=[];
const kept=[];

const noisePatterns=[
  /^\s*Службен весник на Република Северна Македонија\s+Редакциски пречистени текстови\s*$/iu,
  /^\s*\d+\s+од\s+\d+\s*$/iu,
  /^\s*Page\s+\d+\s*$/iu
];

for (let i=0;i<lines.length;i++) {
  const line=lines[i].replace(/\f/g,"").trimEnd();
  if (!line.trim()) {
    kept.push("");
    continue;
  }
  if (noisePatterns.some(re=>re.test(line))) {
    removed.push({line:i+1,text:line});
    continue;
  }
  kept.push(line);
}

let clean=kept.join("\n")
  .replace(/\n{3,}/g,"\n\n")
  .trim()+"\n";

fs.writeFileSync(outputPath,clean,"utf8");

const articleHeaders=[...clean.matchAll(/^\s*Член\s+([0-9]+(?:\s*[-–—]\s*[A-Za-zА-ШЃЅЈЉЊЌЏа-шѓѕјљњќџ]+)?)\s*\.?\s*$/gimu)]
  .map(m=>m[1].replace(/\s+/g,""));

const counts=new Map();
for (const n of articleHeaders) counts.set(n,(counts.get(n)||0)+1);
const duplicates=[...counts.entries()].filter(([,count])=>count>1).map(([article,count])=>({article,count}));

const suspiciousMarkers=[
  "Пречистениот текст на Законот за работните односи ги опфаќа",
  "Одлуката на Уставниот суд",
  "Исправката на Законот"
];
const suspicious=suspiciousMarkers
  .map(marker=>({marker,count:clean.split(marker).length-1}))
  .filter(x=>x.count>0);

const report={
  input_path:inputPath,
  output_path:outputPath,
  raw_line_count:lines.length,
  cleaned_line_count:clean.split("\n").length,
  removed_noise_line_count:removed.length,
  article_header_count:articleHeaders.length,
  duplicate_article_headers:duplicates,
  suspicious_markers:suspicious,
  status: duplicates.length ? "FAIL_DUPLICATE_ARTICLES" : "EXTRACTION_REVIEW_REQUIRED"
};

fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n","utf8");
console.error(JSON.stringify(report,null,2));
