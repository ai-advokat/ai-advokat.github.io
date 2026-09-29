#!/usr/bin/env node
import fs from "node:fs";

const [,,inputPath,outputPath,reportPath,gazetteEntryNumber] = process.argv;
if(!inputPath || !outputPath || !reportPath){
  console.error("Usage: node scripts/extract-zro-amendment-act.mjs <raw.txt> <act.txt> <report.json>");
  process.exit(2);
}

const raw=fs.readFileSync(inputPath,"utf8").normalize("NFKC").replace(/\r\n?/g,"\n");
const lines=raw.split("\n");

function normLine(s=""){
  return s.replace(/\f/g,"").replace(/[ \t]+/g," ").trim();
}
function compactWindow(start,count=6){
  return lines.slice(start,start+count).map(normLine).join(" ").replace(/\s+/g," ").trim();
}

let titleWindowStart=-1;
for(let i=0;i<lines.length;i++){
  const w=compactWindow(i,7).toLocaleUpperCase("mk");
  if(
    w.includes("ЗА ИЗМЕНУВАЊЕ") &&
    w.includes("ЗАКОНОТ ЗА РАБОТНИТЕ ОДНОСИ")
  ){
    titleWindowStart=i;
    break;
  }
}
if(titleWindowStart<0 && gazetteEntryNumber){
  const marker=new RegExp("^\\s*"+gazetteEntryNumber.replace(/[.*+?^$\\{}()|[\\]\\]/g,"\\if(titleWindowStart<0) throw new Error("ZRO amendment title not found");")+"\\.\\s*$");
  for(let i=0;i<lines.length;i++){
    if(marker.test(normLine(lines[i]))){
      titleWindowStart=i;
      break;
    }
  }
}
if(titleWindowStart<0) throw new Error("ZRO amendment title or Gazette entry anchor not found");

let articleStart=-1;
for(let i=titleWindowStart;i<lines.length;i++){
  if(/^Член\s+1\s*\.?$/iu.test(normLine(lines[i]))){
    articleStart=i;
    break;
  }
}
if(articleStart<0) throw new Error("Amendment Article 1 not found after title");

let end=lines.length;
for(let i=articleStart+1;i<lines.length;i++){
  const line=normLine(lines[i]);
  const window=compactWindow(i,3).toLocaleUpperCase("mk");
  if(
    /^L\s*I\s*G\s*J$/iu.test(line) ||
    window.startsWith("L I G J ") ||
    /^ВЛАДА НА РЕПУБЛИКА СЕВЕРНА/iu.test(window) ||
    /^МИНИСТЕРСТВО ЗА /iu.test(window)
  ){
    end=i;
    break;
  }
}

let act=lines.slice(articleStart,end)
  .map(x=>normLine(x))
  .join("\n")
  .replace(/\n{3,}/g,"\n\n")
  .trim()+"\n";

const headers=[...act.matchAll(/^Член\s+([0-9]+)\s*\.?$/gimu)].map(m=>Number(m[1]));
if(!headers.length || headers[0]!==1) throw new Error("Invalid amendment article sequence start");

fs.writeFileSync(outputPath,act,"utf8");
const report={
  input_path:inputPath,
  output_path:outputPath,
  title_window_start_line:titleWindowStart+1,
  gazette_entry_number:gazetteEntryNumber||null,
  article_start_line:articleStart+1,
  end_line:end<lines.length?end+1:null,
  amendment_article_headers:headers,
  amendment_article_count:headers.length,
  status:"SEGMENT_REVIEW_REQUIRED"
};
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n","utf8");
console.error(JSON.stringify(report,null,2));
