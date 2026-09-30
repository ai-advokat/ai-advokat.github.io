#!/usr/bin/env node
import fs from "node:fs";

const [,,inputPath,outPath] = process.argv;
if (!inputPath || !outPath) {
  console.error("Usage: node scripts/normalize-zro-2023-text.mjs <pdftotext.txt> <clean.txt>");
  process.exit(2);
}

const raw=fs.readFileSync(inputPath,"utf8")
  .normalize("NFKC")
  .replace(/\r\n?/g,"\n");

const pages=raw.split("\f");
const cleaned=[];

for (let pageIndex=0; pageIndex<pages.length; pageIndex++) {
  let lines=pages[pageIndex].split("\n");

  lines=lines.filter((line)=>{
    const t=line.trim();
    if (!t) return true;
    if (/^Службен весник на Република Северна Македонија\s+Редакциски пречистени текстови$/u.test(t)) return false;
    if (/^\d+\s+од\s+108$/u.test(t)) return false;
    return true;
  });

  if (pageIndex===0) {
    const footnoteStart=lines.findIndex((line)=>/^1\s+Пречистениот текст на Законот за работните односи/u.test(line.trim()));
    if (footnoteStart>=0) lines=lines.slice(0,footnoteStart);
  }

  cleaned.push(lines.join("\n").trim());
}

const text=cleaned.filter(Boolean).join("\n\n").replace(/\n{3,}/g,"\n\n").trim()+"\n";
fs.writeFileSync(outPath,text,"utf8");

const articleHeaders=(text.match(/^\s*Член\s+[0-9]+(?:\s*[-–—]\s*[A-Za-zА-ШЃЅЈЉЊЌЏа-шѓѕјљњќџ]+)?\s*\.?\s*$/gimu)||[]).length;
console.error(`Normalized ZRO 2023 source: pages=${pages.filter(p=>p.trim()).length}; article_headers=${articleHeaders}`);
