// AI Advokat · Zoki source laws · static read-only, page-anchored corpus.
// The Gazette PDFs (not this machine transcription) remain the legal source of truth.
// No client data, auth tokens, AI calls, DB writes, or automatic current-law promotion.
"use strict";
const root="/data/official-law-texts/";
const el=id=>document.getElementById(id);
const state={manifest:null,source:null,pages:[],index:null,results:[],selectedPage:null,article:null,loading:0};
const routeRe=/^[a-z0-9][a-z0-9._-]*\.json$/;
const shaRe=/^[a-f0-9]{64}$/;
const control=(id,disabled)=>{el(id).disabled=disabled};
function status(message,kind=""){const n=el("status");n.textContent=message;n.className="status "+kind}
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function safeName(file){if(!routeRe.test(String(file)))throw new Error("Невалидна патека на изворниот документ.");return file}
async function fetchJson(file){const response=await fetch(root+safeName(file),{cache:"no-store",credentials:"same-origin",headers:{accept:"application/json"}});if(!response.ok)throw new Error("Изворот не е достапен: "+file+" · HTTP "+response.status);return response.json()}
function legalReference(source,page,article){const articleText=article?" · член "+article:"";return source.title+" · „Службен весник“ бр. "+source.issue+articleText+" · оригинален PDF стр. "+page+" · SHA-256 "+source.original_sha256+". [Машински извлечен текст: провери го оригиналниот PDF; не е правно одобрена консолидација.]"}
function pagesAreComplete(pages,source){const [first,last]=source.source_pdf_page_range;return pages.length===last-first+1&&pages.every((p,i)=>p.pdf_page===first+i&&typeof p.text==="string"&&p.text.trim().length>0)}
async function loadLaw(id){
  const ticket=++state.loading;
  const source=state.manifest.sources.find(x=>x.id===id);
  if(!source){status("Непознат законски извор.","error");return}
  state.source=source;state.pages=[];state.index=null;state.results=[];state.selectedPage=null;state.article=null;
  control("search",true);control("page",true);control("copyReference",true);control("copyExcerpt",true);
  el("results").replaceChildren();el("pageText").textContent="Се вчитува оригиналната машинска транскрипција…";
  el("sourceNote").textContent=source.notice;
  el("ldbis").href=source.ldbis;
  el("fingerprint").textContent="Оригинален PDF SHA-256: "+source.original_sha256;
  status("Вчитување "+source.chunks.length+" дел(ови) со проверка на изворот…");
  try {
    if(!shaRe.test(source.original_sha256))throw new Error("Недостига валиден отпечаток на изворот.");
    const data=await Promise.all(source.chunks.map(fetchJson));
    if(ticket!==state.loading)return;
    const pages=[];
    for(const chunk of data){
      if(chunk.schema_version!=="1.0"||chunk.law_id!==source.id||chunk.publication!==source.issue||chunk.pdf_source_sha256!==source.original_sha256)throw new Error("Изворната идентификација не е усогласена.");
      if(!Array.isArray(chunk.pages))throw new Error("Недостасуваат изворни страници.");
      pages.push(...chunk.pages);
    }
    pages.sort((a,b)=>a.pdf_page-b.pdf_page);
    if(!pagesAreComplete(pages,source))throw new Error("Недостасува или се повторува PDF-страница. Текстот нема да се прикаже како целосен.");
    let index=null;
    if(source.article_index){
      index=await fetchJson(source.article_index);
      if(ticket!==state.loading)return;
      if(index.law_id!==source.id||index.source_sha256!==source.original_sha256||!Array.isArray(index.articles)||index.articles.length!==source.expected_article_count||!index.articles.every((a,i)=>a.article===i+1&&pages.some(p=>p.pdf_page===a.pdf_page)))throw new Error("Индексот на членовите не е целосен или не е усогласен.");
    }
    state.pages=pages;state.index=index;
    const pageControl=el("page");pageControl.replaceChildren();
    for(const pg of pages){const o=node("option",String(pg.pdf_page));o.value=String(pg.pdf_page);pageControl.append(o)}
    control("search",false);control("page",false);
    status("Вчитани сите "+pages.length+" PDF-страници од "+source.issue+". "+(index?"Проверен индекс: "+index.articles.length+" членови. ":"")+"Текстот е машински извлечен, не е пречистен закон.","ok");
    renderPage(pages[0].pdf_page);runSearch();
  } catch(error){
    if(ticket!==state.loading)return;
    state.pages=[];state.index=null;
    el("pageText").textContent="ДОКУМЕНТОТ Е БЛОКИРАН: "+String(error.message||error);
    status("Увозот е прекинат заради нецелосен извор: "+String(error.message||error),"error");
  }
}
function renderPage(number,article=null){
  const pg=state.pages.find(x=>x.pdf_page===Number(number));if(!pg)return;
  state.selectedPage=pg.pdf_page;state.article=article;el("page").value=String(pg.pdf_page);
  el("pageText").textContent=pg.text;
  const citation=legalReference(state.source,pg.pdf_page,article);
  el("pageMeta").textContent=citation;
  control("copyReference",false);control("copyExcerpt",false);
  for(const b of el("results").querySelectorAll("button"))b.classList.toggle("selected",b.dataset.page===String(pg.pdf_page));
}
function runSearch(){
  const s=state.source;if(!s||!state.pages.length)return;
  const query=el("query").value.trim().toLocaleLowerCase("mk");
  const exact=query.match(/^(?:член\s*)?(\d{1,3})\s*$/i);
  const articleNumber=exact?Number(exact[1]):null;
  let results=[];
  if(articleNumber&&state.index){
    const a=state.index.articles.find(x=>x.article===articleNumber);
    if(a)results=[{pdf_page:a.pdf_page,article:a.article}];
  }else if(query){
    const needle=query.replace(/\s+/g," ");
    results=state.pages.filter(p=>p.text.toLocaleLowerCase("mk").replace(/\s+/g," ").includes(needle)).map(x=>({pdf_page:x.pdf_page,article:null}));
  }else{
    results=state.pages.map(x=>({pdf_page:x.pdf_page,article:null}));
  }
  state.results=results;
  const host=el("results");host.replaceChildren();
  if(!results.length){host.append(node("p",articleNumber?"Членот не е пронајден во овој извор. Не користи член од друг закон.":"Нема совпаѓање. Провери го поимот и оригиналната PDF-страница."));return}
  if(query)host.append(node("p","Резултати: "+results.length+" PDF-страници. Изворните PDF-страници се меродавни.","source-note"));
  for(const result of results.slice(0,60)){
    const b=node("button",result.article?"Член "+result.article+" · PDF стр. "+result.pdf_page:"PDF стр. "+result.pdf_page);b.type="button";b.dataset.page=String(result.pdf_page);b.addEventListener("click",()=>renderPage(result.pdf_page,result.article));host.append(b);
  }
  if(results.length>60)host.append(node("p","Прикажани се првите 60 совпаѓања; стесни го пребарувањето.","source-note"));
  if(query&&results.length===1)renderPage(results[0].pdf_page,results[0].article);
}
async function copyText(text){
  if(!navigator.clipboard||typeof navigator.clipboard.writeText!=="function"){status("Прелистувачот не дозволува копирање. Означи го текстот и копирај рачно.","error");return}
  try{await navigator.clipboard.writeText(text);status("Копиран е текстот со изворната референца. Провери го во оригиналниот PDF.","ok")}
  catch{status("Копирањето е одбиено од прелистувачот; текстот останува видлив за рачно копирање.","error")}
}
async function init(){
 try{
  const manifest=await fetchJson("manifest.json");
  if(manifest.schema_version!=="1.0"||manifest.status!=="SOURCE_TEXT_LIBRARY_ONLY_NOT_LEGAL_CONSOLIDATION"||!Array.isArray(manifest.sources)||manifest.sources.length!==3)throw new Error("Неправилна структура на изворниот регистар.");
  state.manifest=manifest;
  const picker=el("law");picker.replaceChildren();
  for(const s of manifest.sources){const o=node("option",s.label);o.value=s.id;picker.append(o)}
  picker.disabled=false;
  picker.addEventListener("change",()=>loadLaw(picker.value));
  el("search").addEventListener("click",runSearch);
  el("query").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();runSearch()}});
  el("page").addEventListener("change",()=>renderPage(el("page").value));
  el("copyReference").addEventListener("click",()=>copyText(legalReference(state.source,state.selectedPage,state.article)));
  el("copyExcerpt").addEventListener("click",()=>copyText(legalReference(state.source,state.selectedPage,state.article)+"\n\n"+el("pageText").textContent));
  await loadLaw(manifest.sources[0].id);
 }catch(error){status("Изворната библиотека не е достапна: "+String(error.message||error),"error");el("pageText").textContent="Нема проверен извор."}
}
void init();
