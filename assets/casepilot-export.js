import {
  CASE_EXPORT_FORMATS,
  normalizeCaseExportReport,
  caseExportFilename,
  caseExportMime,
  caseExportBlocks,
  renderCaseExportMarkdown,
  renderCaseExportDocxBytes,
  buildPdfFromJpegPages
} from "../src/case-export.js";

export const CASEPILOT_EXPORT_CLIENT_VERSION="1.0.0";
export const DEFAULT_CASE_EXPORT_API="https://ai-advokat-github-io.aiadvokat16.workers.dev";

function blobDownload(blob,filename){
  const url=URL.createObjectURL(blob);
  try{
    const a=document.createElement("a");
    a.href=url;
    a.download=filename;
    a.rel="noopener";
    a.style.display="none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }finally{
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
}

function fontSpec(kind){
  const family='"Segoe UI", Arial, "Noto Sans", sans-serif';
  if(kind==="title") return {font:`700 40px ${family}`,line:52,space:22};
  if(kind==="heading1") return {font:`700 31px ${family}`,line:42,space:20};
  if(kind==="heading2") return {font:`700 27px ${family}`,line:38,space:14};
  if(kind==="warning") return {font:`700 23px ${family}`,line:34,space:12};
  if(kind==="meta"||kind==="source") return {font:`400 20px ${family}`,line:30,space:7};
  return {font:`400 24px ${family}`,line:36,space:10};
}

function wrapParagraph(ctx,text,maxWidth){
  const raw=String(text||"");
  const lines=[];
  for(const paragraph of raw.split(/\r?\n/)){
    if(!paragraph.trim()){lines.push("");continue;}
    const words=paragraph.split(/\s+/).filter(Boolean);
    let line="";
    for(const word of words){
      const candidate=line?line+" "+word:word;
      if(ctx.measureText(candidate).width<=maxWidth || !line){
        line=candidate;
      }else{
        lines.push(line);
        line=word;
      }
    }
    if(line) lines.push(line);
  }
  return lines.length?lines:[""];
}

function layoutPdf(report){
  if(typeof document==="undefined") throw new Error("case_export_pdf_browser_required");
  const width=1240;
  const height=1754;
  const marginX=92;
  const top=96;
  const bottom=1625;
  const footerY=1692;
  const maxWidth=width-marginX*2;
  const measure=document.createElement("canvas");
  measure.width=width;
  measure.height=height;
  const ctx=measure.getContext("2d");
  if(!ctx) throw new Error("case_export_canvas_unavailable");

  const pages=[[]];
  let pageIndex=0;
  let y=top;
  const nextPage=()=>{pages.push([]);pageIndex+=1;y=top;};

  for(const block of caseExportBlocks(report)){
    const spec=fontSpec(block.kind);
    ctx.font=spec.font;
    const lines=wrapParagraph(ctx,block.text,maxWidth);
    if(y+spec.space+spec.line>bottom) nextPage();
    y+=spec.space;
    for(const line of lines){
      if(y+spec.line>bottom) nextPage();
      pages[pageIndex].push({text:line,kind:block.kind,x:marginX,y});
      y+=spec.line;
    }
  }

  return {pages,width,height,marginX,footerY};
}

function canvasToJpegBytes(canvas){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(async blob=>{
      if(!blob) return reject(new Error("case_export_pdf_canvas_encode_failed"));
      resolve(new Uint8Array(await blob.arrayBuffer()));
    },"image/jpeg",0.93);
  });
}

export async function renderCaseExportPdfBytes(reportInput){
  const report=reportInput?.exportVersion ? reportInput : normalizeCaseExportReport(reportInput);
  const layout=layoutPdf(report);
  const pageImages=[];
  for(let i=0;i<layout.pages.length;i++){
    const canvas=document.createElement("canvas");
    canvas.width=layout.width;
    canvas.height=layout.height;
    const ctx=canvas.getContext("2d");
    if(!ctx) throw new Error("case_export_canvas_unavailable");
    ctx.fillStyle="#ffffff";
    ctx.fillRect(0,0,layout.width,layout.height);
    ctx.textBaseline="top";
    ctx.direction="ltr";
    for(const row of layout.pages[i]){
      const spec=fontSpec(row.kind);
      ctx.font=spec.font;
      ctx.fillStyle="#111111";
      ctx.fillText(row.text,row.x,row.y);
    }
    ctx.font='400 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle="#333333";
    ctx.fillText(
      `${report.caseId} · ${report.caseVersion} · ${i+1}/${layout.pages.length}`,
      layout.marginX,
      layout.footerY
    );
    const bytes=await canvasToJpegBytes(canvas);
    pageImages.push({bytes,width:canvas.width,height:canvas.height});
  }
  return buildPdfFromJpegPages(pageImages);
}

export async function caseExportBlob(reportInput,format){
  if(!CASE_EXPORT_FORMATS.includes(format)) throw new Error("case_export_format_invalid");
  const report=reportInput?.exportVersion ? reportInput : normalizeCaseExportReport(reportInput);
  if(format==="md"){
    return new Blob([renderCaseExportMarkdown(report)],{type:caseExportMime("md")});
  }
  if(format==="docx"){
    return new Blob([renderCaseExportDocxBytes(report)],{type:caseExportMime("docx")});
  }
  const pdf=await renderCaseExportPdfBytes(report);
  return new Blob([pdf],{type:caseExportMime("pdf")});
}

export async function downloadCasePilotExport(reportInput,format,{filename=null}={}){
  const report=reportInput?.exportVersion ? reportInput : normalizeCaseExportReport(reportInput);
  const blob=await caseExportBlob(report,format);
  blobDownload(blob,filename||caseExportFilename(report,format));
  return {ok:true,format,filename:filename||caseExportFilename(report,format),size:blob.size};
}

function dispositionFilename(header){
  const match=String(header||"").match(/filename="([^"]+)"/i);
  return match?match[1]:null;
}

export async function downloadCasePilotExportFromApi({
  caseId,
  format,
  report,
  membershipKey="",
  apiBase=DEFAULT_CASE_EXPORT_API
}={}){
  if(!caseId || !CASE_EXPORT_FORMATS.includes(format)) throw new Error("case_export_request_invalid");
  const response=await fetch(`${apiBase}/api/cases/${encodeURIComponent(caseId)}/exports`,{
    method:"POST",
    headers:{
      "content-type":"application/json",
      ...(membershipKey?{"authorization":"Bearer "+membershipKey}:{})
    },
    body:JSON.stringify({format,report})
  });
  if(format==="pdf"){
    const payload=await response.json().catch(()=>null);
    if(!response.ok || !payload?.ok || !payload?.exportModel){
      throw new Error(payload?.error||("case_export_http_"+response.status));
    }
    return downloadCasePilotExport(payload.exportModel,"pdf",{filename:payload.filename||null});
  }
  if(!response.ok){
    const payload=await response.json().catch(()=>null);
    throw new Error(payload?.error||("case_export_http_"+response.status));
  }
  const blob=await response.blob();
  const fallback=caseExportFilename(normalizeCaseExportReport(report),"working"===report?.mode?format:format);
  const filename=dispositionFilename(response.headers.get("content-disposition"))||fallback;
  blobDownload(blob,filename);
  return {ok:true,format,filename,size:blob.size};
}
