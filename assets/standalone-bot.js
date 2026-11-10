let localGuideDocuments = async () => [];
let privacyRuntimeReady = false;
let detectConfidentialCasePrompt = () => ({confidential:true});
let redactConfidentialCasePrompt = () => ({changed:false,safeToSend:false,text:''});
let readDeviceAccess = () => '';
let saveDeviceAccess = () => false;
let forgetDeviceAccess = () => {};
window.AIAdvokatCoreDependencies = Object.freeze({materials:'loading',privacy:'loading',access:'loading'});

function privacyRuntimeSelfTest(mod){
  if(
    typeof mod?.detectConfidentialCasePrompt !== 'function'
    || typeof mod?.redactConfidentialCasePrompt !== 'function'
  ) return false;
  try {
    const publicProbe=mod.detectConfidentialCasePrompt('Општо правно прашање за работен однос.');
    const privateProbe=mod.detectConfidentialCasePrompt('ЕМБГ 0101999450012');
    const redactProbe=mod.redactConfidentialCasePrompt('ЕМБГ 0101999450012');
    return publicProbe?.confidential===false
      && privateProbe?.confidential===true
      && redactProbe?.safeToSend===true
      && !String(redactProbe?.text||'').includes('0101999450012');
  } catch {
    return false;
  }
}

async function loadPrivacyRuntime(){
  try {
    const primary=await import('./chat-privacy-browser.js?v=20261101-privacy-r12');
    if(!privacyRuntimeSelfTest(primary)) throw new Error('primary_privacy_runtime_self_test_failed');
    window.AIAdvokatPrivacyRuntimeSource='primary';
    return primary;
  } catch (primaryError) {
    try {
      const legacy = await import('/src/chat-privacy.js?v=20261101-privacy-compat-r1');
      if(!privacyRuntimeSelfTest(legacy)) throw new Error('legacy_privacy_runtime_self_test_failed');
      window.AIAdvokatPrivacyRuntimeSource='legacy-compat';
      try { console.warn('ai_advokat_privacy_runtime_fallback','legacy_bridge_used'); } catch {}
      return legacy;
    } catch (legacyError) {
      window.AIAdvokatPrivacyRuntimeSource='unavailable';
      const error = new Error('privacy_runtime_unavailable');
      error.cause = { primaryError, legacyError };
      throw error;
    }
  }
}

const dependenciesReady = Promise.allSettled([
  import('./bot-materials.mjs'),
  loadPrivacyRuntime(),
  import('./bot-device-access.mjs'),
]).then(results => {
  const materialsModule = results[0].status === 'fulfilled' ? results[0].value : {};
  const privacyModule = results[1].status === 'fulfilled' ? results[1].value : {};
  const accessModule = results[2].status === 'fulfilled' ? results[2].value : {};

  if (typeof materialsModule.localGuideDocuments === 'function') {
    localGuideDocuments = materialsModule.localGuideDocuments;
  }
  privacyRuntimeReady =
    typeof privacyModule.detectConfidentialCasePrompt === 'function'
    && typeof privacyModule.redactConfidentialCasePrompt === 'function';
  if (privacyRuntimeReady) {
    detectConfidentialCasePrompt = privacyModule.detectConfidentialCasePrompt;
    redactConfidentialCasePrompt = privacyModule.redactConfidentialCasePrompt;
  }
  if (typeof accessModule.readDeviceAccess === 'function') readDeviceAccess = accessModule.readDeviceAccess;
  if (typeof accessModule.saveDeviceAccess === 'function') saveDeviceAccess = accessModule.saveDeviceAccess;
  if (typeof accessModule.forgetDeviceAccess === 'function') forgetDeviceAccess = accessModule.forgetDeviceAccess;

  window.AIAdvokatCoreDependencies = Object.freeze({
    materials: results[0].status,
    privacy: results[1].status,
    access: results[2].status,
  });
  if (results[2].status === 'fulfilled') restoreAccess();
  return results;
}).catch(error => {
  window.AIAdvokatFrontendGuard?.report?.('external','core-dependencies',error);
  return [];
});

// Accessing localStorage itself can throw when browser storage is disabled.
let deviceStorage;
try { deviceStorage = window.localStorage; } catch {}

const $ = id => document.getElementById(id);
const base = location.hostname.endsWith('workers.dev') ? location.origin : 'https://ai-advokat-github-io.aiadvokat16.workers.dev';
let key = '', history = [], pending = null, generation = 0;
let sessionId = crypto.randomUUID();
const welcome = $('welcome').cloneNode(true);

const AI_ADVOCAT_LANGUAGES=Object.freeze([
  {code:"sq",name:"Albanian",locale:"sq-AL"},{code:"ar",name:"Arabic",locale:"ar-SA"},
  {code:"bn",name:"Bengali",locale:"bn-BD"},{code:"bs",name:"Bosnian",locale:"bs-BA"},
  {code:"bg",name:"Bulgarian",locale:"bg-BG"},{code:"zh",name:"Chinese",locale:"zh-CN"},
  {code:"hr",name:"Croatian",locale:"hr-HR"},{code:"en",name:"English",locale:"en-US"},
  {code:"eo",name:"Esperanto",locale:"eo"},{code:"fr",name:"French",locale:"fr-FR"},
  {code:"de",name:"German",locale:"de-DE"},{code:"el",name:"Greek",locale:"el-GR"},
  {code:"ha",name:"Hausa",locale:"ha-NG"},{code:"he",name:"Hebrew",locale:"he-IL"},
  {code:"hi",name:"Hindi",locale:"hi-IN"},{code:"hu",name:"Hungarian",locale:"hu-HU"},
  {code:"id",name:"Indonesian",locale:"id-ID"},{code:"it",name:"Italian",locale:"it-IT"},
  {code:"ja",name:"Japanese",locale:"ja-JP"},{code:"ko",name:"Korean",locale:"ko-KR"},
  {code:"la",name:"Latin",locale:"la"},{code:"mk",name:"Macedonian",locale:"mk-MK"},
  {code:"fa",name:"Persian",locale:"fa-IR"},{code:"pt",name:"Portuguese",locale:"pt-PT"},
  {code:"pa",name:"Punjabi",locale:"pa-IN"},{code:"ru",name:"Russian",locale:"ru-RU"},
  {code:"sr",name:"Serbian",locale:"sr-RS"},{code:"sl",name:"Slovenian",locale:"sl-SI"},
  {code:"es",name:"Spanish",locale:"es-ES"},{code:"sw",name:"Swahili",locale:"sw-KE"},
  {code:"tr",name:"Turkish",locale:"tr-TR"},{code:"ur",name:"Urdu",locale:"ur-PK"},
  {code:"vi",name:"Vietnamese",locale:"vi-VN"}
]);
const LANGUAGE_KEY="aiadvokat-language";
function languageMeta(code){
  return AI_ADVOCAT_LANGUAGES.find(x=>x.code===String(code||"").toLowerCase())||AI_ADVOCAT_LANGUAGES.find(x=>x.code==="mk");
}
function readPreferredLanguage(){
  try{
    const saved=localStorage.getItem(LANGUAGE_KEY);
    return languageMeta(saved).code;
  }catch{return "mk";}
}
function writePreferredLanguage(code){
  const lang=languageMeta(code);
  try{localStorage.setItem(LANGUAGE_KEY,lang.code);}catch{}
  document.documentElement.lang=lang.code;
  document.documentElement.dir=["ar","he","fa","ur"].includes(lang.code)?"rtl":"ltr";
  const select=$("botLanguage");
  if(select&&select.value!==lang.code) select.value=lang.code;
  return lang;
}
function selectedLanguageMeta(){return languageMeta($("botLanguage")?.value||readPreferredLanguage());}
function selectedSpeechLocale(){return selectedLanguageMeta().locale;}

const BOT_UI_TRANSLATION_CACHE_PREFIX="aiadvokat-bot-ui-translations-v1:";
const botUiNodeState=new WeakMap();
const botUiAttrState=new WeakMap();
let botUiTranslationRunning=false;
let botUiTranslationTimer=0;

function botUiCache(code){
  try{return JSON.parse(localStorage.getItem(BOT_UI_TRANSLATION_CACHE_PREFIX+code)||"{}")||{};}catch{return {};}
}
function saveBotUiCache(code,cache){
  try{localStorage.setItem(BOT_UI_TRANSLATION_CACHE_PREFIX+code,JSON.stringify(cache));}catch{}
}
function botUiTranslatable(value){
  const text=String(value||"").replace(/\s+/g," ").trim();
  if(!text||text.length<2||text.length>1200) return false;
  if(/^(?:https?:\/\/|mailto:|tel:|10\.\d{4,9}\/|[\d\s.,:/+%()#-]+)$/i.test(text)) return false;
  return /[\p{L}]/u.test(text);
}
function botUiExcluded(el){
  return !el || !!el.closest("script,style,noscript,code,pre,svg,[data-no-translate],#botLanguage,.message .text,.sources,.vnext-source-card,.vnext-context-card,.vnext-artifact-card");
}
function collectBotUiUnits(){
  const units=[];
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node,index=0;
  while((node=walker.nextNode())){
    const parent=node.parentElement;
    if(botUiExcluded(parent)) continue;
    const current=String(node.nodeValue||"");
    if(!botUiTranslatable(current)) continue;
    let state=botUiNodeState.get(node);
    if(!state||current!==state.last){
      state={source:current,last:current};
      botUiNodeState.set(node,state);
    }
    units.push({id:"t"+(index++),kind:"text",node,source:state.source});
  }
  for(const el of document.querySelectorAll("[placeholder],[title],[aria-label]")){
    if(botUiExcluded(el)) continue;
    let attrs=botUiAttrState.get(el);
    if(!attrs){attrs={};botUiAttrState.set(el,attrs);}
    for(const attr of ["placeholder","title","aria-label"]){
      if(!el.hasAttribute(attr)) continue;
      const current=el.getAttribute(attr)||"";
      if(!botUiTranslatable(current)) continue;
      if(!attrs[attr]||current!==attrs[attr].last) attrs[attr]={source:current,last:current};
      units.push({id:"a"+(index++),kind:"attr",el,attr,source:attrs[attr].source});
    }
  }
  return units;
}
async function translateProfessionalUi(){
  const code=readPreferredLanguage();
  if(code==="mk"||botUiTranslationRunning) return;
  botUiTranslationRunning=true;
  try{
    const units=collectBotUiUnits();
    const cache=botUiCache(code);
    const pending=[...new Set(units.map(x=>x.source).filter(x=>!cache[x]))];
    const batches=[];
    let batch=[],chars=0;
    for(const text of pending){
      if(batch.length&&(batch.length>=72||chars+text.length>9000)){
        batches.push(batch);batch=[];chars=0;
      }
      batch.push(text);chars+=text.length;
    }
    if(batch.length)batches.push(batch);
    for(const texts of batches){
      try{
        const response=await fetch(base+"/api/ui-translate",{
          method:"POST",
          headers:{"content-type":"application/json"},
          body:JSON.stringify({targetLanguage:code,items:texts.map((text,i)=>({id:String(i),text}))})
        });
        const data=await response.json();
        if(!response.ok||data?.ok!==true||!Array.isArray(data.translations)){
          console.warn("bot_ui_translation_failed",response.status,data?.error||"unknown");
          continue;
        }
        data.translations.forEach((row,i)=>{
          const translated=String(row?.text||"").trim();
          if(translated) cache[texts[i]]=translated;
        });
        saveBotUiCache(code,cache);
      }catch(error){
        console.warn("bot_ui_translation_network_error",String(error?.message||error).slice(0,120));
      }
    }
    for(const unit of units){
      const translated=cache[unit.source];
      if(!translated) continue;
      if(unit.kind==="text"){
        unit.node.nodeValue=translated;
        const state=botUiNodeState.get(unit.node); if(state) state.last=translated;
      }else{
        unit.el.setAttribute(unit.attr,translated);
        const attrs=botUiAttrState.get(unit.el); if(attrs?.[unit.attr]) attrs[unit.attr].last=translated;
      }
    }
  }finally{botUiTranslationRunning=false;}
}
function scheduleProfessionalUiTranslation(){
  if(readPreferredLanguage()==="mk") return;
  clearTimeout(botUiTranslationTimer);
  botUiTranslationTimer=setTimeout(()=>translateProfessionalUi(),180);
}

function conversationalCapabilityRoute(text){
  const q=String(text||"").trim().toLowerCase();
  if(!q) return "";
  if(/(?:приватен\s+предмет|доверлив|casepilot|secure\s+case|оригинален\s+документ)/iu.test(q)) return "SECURE_CASE";
  if(/(?:echr|есчп|hudoc|crosswalk)/iu.test(q)) return "ECHR_CROSSWALK";
  if(/(?:судск[аи].*(?:пракс|одлук|пресуд)|case\s*law|judgment|преседан)/iu.test(q)) return "CASE_LAW_RESEARCH";
  if(/(?:консолид|пречистен\s+текст|измен[аи].*допол|amendment|consolidat)/iu.test(q)) return "CONSOLIDATOR";
  if(/(?:smart\s+(?:legal\s+)?document|тужба\s+за\s+развод|одговор\s+на\s+тужба|опомена\s+пред\s+тужба|полномошно)/iu.test(q)) return "SMART_DOCUMENTS";
  if(/(?:ai\s*contract|договор|анекс|спогодб|закуп|contract|agreement|clause)/iu.test(q)) return "AI_CONTRACT_PRO";
  if(/(?:предиктор|predict|сценари|ризик.*исход|исход.*ризик)/iu.test(q)) return "GOVERNED_PREDICTOR";
  if(/(?:јавн[ио]\s+доказ|public\s+evidence|open\s+data\s+evidence)/iu.test(q)) return "PUBLIC_EVIDENCE";
  if(/(?:justice\s+daily|правосуден\s+бриф|дневен\s+правосуд)/iu.test(q)) return "JUSTICE_DAILY";
  if(/(?:living\s+law|важечк[ао]\s+право|временск[аи]\s+верзи|historical\s+law|регулаторна\s+лини)/iu.test(q)) return "LIVING_LAW";
  if(/(?:legal\s+watch|следи\s+(?:службен|енер|собрание|уставен|врховен)|што\s+е\s+ново.*(?:прав|закон))/iu.test(q)) return "LEGAL_WATCH";
  if(/(?:professional\s+ecosystem|pro\s+ecosystem|калкулатор|пресметај.*(?:камата|процент|рок))/iu.test(q)) return "PROFESSIONAL_ECOSYSTEM";
  if(/(?:hybrid\s+legal|hybrid\s*10|time\s+machine|law\s*[↔-]\s*bylaw)/iu.test(q)) return "HYBRID_LEGAL_INTELLIGENCE";
  if(/(?:legal\s+command\s+center|command\s+center)/iu.test(q)) return "LEGAL_COMMAND_CENTER";
  if(/(?:proactive\s+runtime)/iu.test(q)) return "PROACTIVE_RUNTIME";
  if(/(?:proactive\s+agents?|проактивн[ио]\s+агент)/iu.test(q)) return "PROACTIVE_AGENTS";
  if(/(?:fact\s*(?:&|and)\s*evidence\s+graph|граф.*(?:факт|доказ))/iu.test(q)) return "FACT_EVIDENCE_GRAPH";
  if(/(?:connector\s+library|конектор)/iu.test(q)) return "CONNECTOR_LIBRARY";
  if(/(?:review\s+(?:tables|vault)|batch\s+review|review\s+vault)/iu.test(q)) return "REVIEW_VAULT";
  if(/(?:правн[ио]\s+извор|legal\s+source|службен\s+извор)/iu.test(q)) return "LEGAL_SOURCES";
  if(/(?:документи|documents|извоз|export)/iu.test(q)) return "DOCUMENTS";
  if(/(?:библиотек|library)/iu.test(q)) return "LIBRARY";
  if(/(?:workflow|работен\s+тек|процесен\s+тек)/iu.test(q)) return "WORKFLOWS";
  if(/(?:human\s+gate|човечк[аи]\s+(?:контрола|порта)|проверка\s+од\s+адвокат)/iu.test(q)) return "HUMAN_GATE";
  if(/(?:анализ|analy[sz]|правн[ао]\s+оцен|review\s+this)/iu.test(q)) return "LEGAL_ANALYZER";
  return "";
}

const BOT_LANGUAGE_ALIASES=Object.freeze({
  sq:["albanian","албански","shqip"],ar:["arabic","арапски","العربية"],bn:["bengali","бенгалски","বাংলা"],
  bs:["bosnian","босански","bosanski"],bg:["bulgarian","бугарски","български"],zh:["chinese","кинески","中文"],
  hr:["croatian","хрватски","hrvatski"],en:["english","англиски"],eo:["esperanto","есперанто"],fr:["french","француски","français"],
  de:["german","германски","deutsch"],el:["greek","грчки","ελληνικά"],ha:["hausa","хауса"],he:["hebrew","хебрејски","עברית"],
  hi:["hindi","хинди","हिन्दी"],hu:["hungarian","унгарски","magyar"],id:["indonesian","индонезиски","bahasa indonesia"],
  it:["italian","италијански","italiano"],ja:["japanese","јапонски","日本語"],ko:["korean","корејски","한국어"],la:["latin","латински","latina"],
  mk:["macedonian","македонски"],fa:["persian","персиски","فارسی"],pt:["portuguese","португалски","português"],
  pa:["punjabi","пенџапски","ਪੰਜਾਬੀ"],ru:["russian","руски","русский"],sr:["serbian","српски","српски"],
  sl:["slovenian","словенечки","slovenščina"],es:["spanish","шпански","español"],sw:["swahili","свахили","kiswahili"],
  tr:["turkish","турски","türkçe"],ur:["urdu","урду","اردو"],vi:["vietnamese","виетнамски","tiếng việt"]
});

function conversationalLanguageSwitch(text){
  const q=String(text||"").trim().toLowerCase();
  // A language mention is not a command. Reload only for an explicit imperative
  // such as "switch language to German" or "смени го интерфејсот на германски".
  const explicitSwitch=/(?:\b(?:switch|change|set)\s+(?:(?:the\s+)?(?:interface\s+)?language|interface)(?:\s+to)?\b|(?:смени|постави|префрли)(?:\s+го)?\s+(?:јазикот|јазик|интерфејсот|интерфејс)(?:\s+на)?)/iu.test(q);
  if(!explicitSwitch) return "";
  // Match full language names/aliases first. Two-letter codes are accepted only
  // as complete ASCII tokens so "la" can never match the word "language".
  for(const lang of AI_ADVOCAT_LANGUAGES){
    const aliases=[lang.name.toLowerCase(),...(BOT_LANGUAGE_ALIASES[lang.code]||[])].filter(alias=>String(alias).toLowerCase()!==lang.code);
    if(aliases.some(alias=>q.includes(String(alias).toLowerCase()))) return lang.code;
  }
  for(const lang of AI_ADVOCAT_LANGUAGES){
    const code=String(lang.code).toLowerCase();
    const bounded=new RegExp("(?:^|[^a-z])"+code+"(?:$|[^a-z])","i");
    if(bounded.test(q)) return lang.code;
  }
  return "";
}

function conversationalLocalAction(text){
  const q=String(text||"").trim().toLowerCase();
  const explicit=/(?:^|\s)(?:отвори|покажи|прикажи|оди\s+во|open|show|launch)(?:\s|$)/iu.test(q);
  const exactToolName=/^(?:ai\s*contract(?:\s*pro)?|contract\s*pro|professional\s+ecosystem|pro\s+ecosystem|калкулатори?|justice\s+daily|public\s+evidence|јавни\s+докази?|echr(?:\s+crosswalk)?|есчп|hybrid(?:\s+legal)?(?:\s*10)?|судска\s+пракса|case\s*law|casepilot|secure\s+case|legal\s+command\s+center|proactive\s+runtime|proactive\s+agents?|fact\s*(?:&|and)\s*evidence\s+graph|connector\s+library|review\s+(?:tables|vault)|правни\s+извори|legal\s+sources?|документи|documents|библиотека|library|workflows?|human\s+gate|анализатор|analyzer|консолидатор|consolidator|предиктор|predictor)$/iu.test(q);
  if(!explicit&&!exactToolName) return "";
  const table=[
    ["contract-intelligence",/(?:ai\s*contract|contract\s+pro|договори?)/iu],
    ["professional-ecosystem",/(?:professional\s+ecosystem|pro\s+ecosystem|калкулатор|living\s+law|smart\s+documents?|legal\s+watch)/iu],
    ["justice-daily",/(?:justice\s+daily|правосуден\s+бриф)/iu],
    ["public-evidence",/(?:public\s+evidence|јавни\s+докази?)/iu],
    ["echr-crosswalk",/(?:echr|есчп|hudoc|crosswalk)/iu],
    ["hybrid-intelligence",/(?:hybrid\s+legal|hybrid\s*10)/iu],
    ["cases",/(?:судска\s+пракса|case\s*law)/iu],
    ["case-law-radar",/(?:case[- ]law\s+radar|corpus\s+radar)/iu],
    ["casepilot",/(?:casepilot|secure\s+case|приватен\s+предмет)/iu],
    ["legal-command-center",/(?:legal\s+command\s+center|command\s+center)/iu],
    ["proactive-runtime",/(?:proactive\s+runtime)/iu],
    ["proactive-agents",/(?:proactive\s+agents?|проактивни\s+агенти)/iu],
    ["fact-evidence-graph",/(?:fact\s*(?:&|and)\s*evidence\s+graph|граф.*(?:факт|доказ))/iu],
    ["connector-library",/(?:connector\s+library|конектор)/iu],
    ["review-vault",/(?:review\s+(?:tables|vault)|batch\s+review)/iu],
    ["sources",/(?:правни\s+извори|legal\s+sources?)/iu],
    ["documents",/(?:документи|documents|извоз|export)/iu],
    ["library",/(?:библиотек|library)/iu],
    ["workflows",/(?:workflows?|работни\s+текови?)/iu],
    ["review",/(?:human\s+gate|човечка\s+(?:контрола|порта))/iu],
    ["analyzer",/(?:анализатор|analyzer)/iu],
    ["consolidator",/(?:консолидатор|consolidator)/iu],
    ["predictor",/(?:предиктор|predictor)/iu]
  ];
  return table.find(([,re])=>re.test(q))?.[0]||"";
}

function withOutputLanguageDirective(text){
  // Keep the actual user request byte-for-byte within the 4,000-character
  // composer boundary. Output-language and hidden capability routing travel as
  // separate bounded metadata and are applied by the governed Worker.
  return String(text||"");
}

function installCompactExternalChrome(){
  document.documentElement.dataset.externalExperience="conversation";
  const nav=document.querySelector("#menu nav");
  const languageControl=document.querySelector("header > .bot-language-control");
  if(nav&&languageControl){
    languageControl.classList.add("bot-language-menu-control");
    nav.insertBefore(languageControl,nav.firstChild);
  }
  const recordRow=document.querySelector(".voice-record-row");
  if(nav&&recordRow){
    recordRow.classList.add("voice-record-menu-row");
    nav.append(recordRow);
  }
}

function bindLanguageSelector(){
  const select=$("botLanguage");
  if(!select)return;
  writePreferredLanguage(readPreferredLanguage());
  scheduleProfessionalUiTranslation();
  if(readPreferredLanguage()!=="mk"){
    const observer=new MutationObserver(mutations=>{
      if(botUiTranslationRunning) return;
      if(mutations.some(m=>m.type==="childList"||m.type==="characterData"||m.type==="attributes")) scheduleProfessionalUiTranslation();
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["placeholder","title","aria-label"]});
  }
  select.addEventListener("change",()=>{
    const lang=writePreferredLanguage(select.value);
    status("Јазик за AI објаснување, интерфејс и глас: "+lang.name+". Официјалните извори и цитати остануваат source-faithful.");
    location.reload();
  });
}

function status(text) { $('status').textContent = text; }
let voiceRuntime=null;
const EXTERNAL_VOICE_CONVERSATION_VERSION="AI_ADVOCAT_EXTERNAL_VOICE_CONVERSATION_R1";
let voiceConversationPending=false;
window.AIAdvokatExternalVoiceConversation=Object.freeze({
  version:EXTERNAL_VOICE_CONVERSATION_VERSION,
  mode:"half_duplex_auto_send_auto_speak",
  language:"mk-MK"
});
const voiceRuntimeReady=import("./ai-advokat-voice.mjs?v=20261109-voice-r4")
  .then(mod=>{
    voiceRuntime=mod.createAIAdvokatVoiceRuntime(window,{lang:selectedSpeechLocale()});
    return voiceRuntime;
  })
  .catch(error=>{
    console.error("ai_advokat_external_voice_runtime_failed",error);
    if($('mic')){$('mic').disabled=true;$('mic').title='Гласовниот модул не е достапен.';}
    status('Гласовниот модул не се вчита. Пишувањето останува достапно.');
    return null;
  });
function busy(value) {
  const hasQuestion = String($('question')?.value || '').trim().length >= 2;
  $('send').disabled = value || !hasQuestion;
  $('stop').hidden = !value;
  $('send').hidden = value;
  $('question').disabled = value;
  $('newChat').disabled = value;
  $('access').disabled = value;
}
function message(role, text, model = '') {
  $('welcome')?.remove();
  const normalizedText=String(text||'').trim();
  if(role==='user'){
    const last=$('messages')?.lastElementChild;
    const lastText=last?.classList?.contains('user') ? String(last.querySelector('.text')?.textContent||'').trim() : '';
    if(lastText && lastText===normalizedText) return last;
  }
  const article = document.createElement('article');
  article.className = 'message ' + role;
  const body = document.createElement('div'); body.className = 'text'; body.textContent = normalizedText;
  article.append(body);
  if (model) { const meta = document.createElement('small'); meta.textContent = model; article.append(meta); }
  if(role==='assistant' && normalizedText){
    const voiceTools=document.createElement('div');
    voiceTools.className='message-voice-tools';

    const language=document.createElement('select');
    language.className='message-voice-lang';
    language.setAttribute('aria-label','Јазик за гласно читање и аудио');
    language.title='Јазик за гласно читање и зачувување';
    for(const item of AI_ADVOCAT_LANGUAGES){
      const option=document.createElement('option');
      option.value=item.locale;
      option.textContent=item.code.toUpperCase();
      if(item.code===selectedLanguageMeta().code) option.selected=true;
      language.append(option);
    }

    const speak=document.createElement('button');
    speak.type='button';
    speak.className='message-speak';

    const saveAudio=document.createElement('button');
    saveAudio.type='button';
    saveAudio.className='message-save-audio';
    saveAudio.textContent='💾 Аудио';

    voiceTools.append(language,speak,saveAudio);
    article.append(voiceTools);
    voiceRuntimeReady.then(voice=>{
      voice?.bindSpeakButton({
        button:speak,
        text:()=>normalizedText,
        status,
        language:()=>language.value
      });
      voice?.bindSaveAudioButton?.({
        button:saveAudio,
        text:()=>normalizedText,
        status,
        language:()=>language.value,
        filename:()=> 'AI-Advokat-voice-'+languageMeta(String(language.value).split("-")[0]).code.toUpperCase()+'.webm'
      });
    });
  }
  $('messages').append(article);
  article.scrollIntoView({block:'end'});
  return article;
}
function ensureLegalPulseStyles() {
  if (document.getElementById('legalPulseRuntimeStyle')) return;
  const style = document.createElement('style');
  style.id = 'legalPulseRuntimeStyle';
  style.textContent = `
    .message.response-pending{margin-bottom:18px}
    .legal-pulse{--pulse-gold:#d8b56a;--pulse-goldhot:#ffd88b;--pulse-lilachot:#b16cff;position:relative;display:inline-flex;align-items:center;gap:6px;width:auto;max-width:100%;min-height:36px;padding:3px 8px 3px 5px;border:1px solid rgba(216,181,106,.34);border-radius:999px;background:linear-gradient(135deg,rgba(7,24,44,.96),rgba(18,36,62,.96));box-shadow:0 5px 14px rgba(4,15,29,.12);color:#fff}
    .legal-pulse-mark{position:relative;flex:none;width:36px;height:28px;display:grid;place-items:center}
    .legal-pulse-ring{position:absolute;inset:2px 1px;border:1px solid rgba(216,181,106,.58);border-radius:50%;transform:rotate(12deg);box-shadow:0 0 6px rgba(127,69,217,.18);animation:legalPulseOrbit 3.8s linear infinite}
    .legal-pulse-ring:before,.legal-pulse-ring:after{content:"";position:absolute;width:4px;height:4px;top:50%;border-radius:50%;transform:translateY(-50%)}
    .legal-pulse-ring:before{left:-2px;background:var(--pulse-lilachot);box-shadow:0 0 5px rgba(177,108,255,.8)}
    .legal-pulse-ring:after{right:-2px;background:var(--pulse-goldhot);box-shadow:0 0 5px rgba(255,216,139,.8)}
    .legal-pulse-pair{position:relative;z-index:2;display:flex;align-items:center}
    .legal-pulse-sec{display:inline-block;font-family:Georgia,"Times New Roman",serif;font-size:20px;line-height:.86;font-weight:700;transform-origin:50% 52%}
    .legal-pulse-left{color:var(--pulse-goldhot);text-shadow:0 0 5px rgba(255,216,139,.48);animation:legalPulseLeft 2.5s ease-in-out infinite}
    .legal-pulse-right{color:#d9b2ff;text-shadow:0 0 5px rgba(177,108,255,.48);animation:legalPulseRight 2.5s ease-in-out infinite}
    .legal-pulse-copy{min-width:0;color:#e8edf4;font-size:.68rem;line-height:1.2;font-weight:650;white-space:nowrap}
    .legal-pulse-dots{display:flex;gap:3px}.legal-pulse-dots i{width:4px;height:4px;border-radius:50%;background:#66788c;animation:legalPulseDot 1.35s ease-in-out infinite}
    .legal-pulse-dots i:nth-child(2){animation-delay:.18s}.legal-pulse-dots i:nth-child(3){animation-delay:.36s}
    @keyframes legalPulseOrbit{to{transform:rotate(372deg)}}@keyframes legalPulseLeft{0%,100%{transform:rotateY(0) rotateZ(-2deg)}50%{transform:rotateY(180deg) rotateZ(2deg)}}@keyframes legalPulseRight{0%,100%{transform:rotateY(0) rotateZ(2deg)}50%{transform:rotateY(-180deg) rotateZ(-2deg)}}@keyframes legalPulseDot{0%,100%{background:#66788c;transform:scale(.8);opacity:.55}45%{background:var(--pulse-lilachot);transform:scale(1.18);opacity:1}70%{background:var(--pulse-goldhot);transform:scale(1);opacity:.9}}
    @media(max-width:520px){.legal-pulse{gap:5px;min-height:34px;padding:3px 7px 3px 4px}.legal-pulse-mark{width:33px;height:25px}.legal-pulse-sec{font-size:18px}.legal-pulse-copy{font-size:.64rem}}
    @media(prefers-reduced-motion:reduce){.legal-pulse-ring,.legal-pulse-sec,.legal-pulse-dots i{animation:none!important}}
  `;
  document.head.append(style);
}

function responsePulse() {
  ensureLegalPulseStyles();
  $('welcome')?.remove();
  const article = document.createElement('article');
  article.className = 'message assistant response-pending';
  article.setAttribute('role','status');
  article.setAttribute('aria-live','polite');
  article.setAttribute('aria-label','AI Advokat го подготвува одговорот');
  const pulse = document.createElement('div');
  pulse.className = 'legal-pulse';
  pulse.innerHTML = '<span class="legal-pulse-mark" aria-hidden="true"><span class="legal-pulse-ring"></span><span class="legal-pulse-pair"><span class="legal-pulse-sec legal-pulse-left">§</span><span class="legal-pulse-sec legal-pulse-right">§</span></span></span><span class="legal-pulse-copy">AI Advokat подготвува одговор…</span><span class="legal-pulse-dots" aria-hidden="true"><i></i><i></i><i></i></span>';
  article.append(pulse);
  $('messages').append(article);
  article.scrollIntoView({block:'end'});
  return article;
}
function sourceDisplayLabel(row) {
  const explicit = String(row?.title || row?.label || row?.name || row?.citation || '').trim();
  if (explicit) return explicit;
  const instrument = String(row?.instrumentTitle || row?.instrument || row?.sourceIdentity || '').trim();
  const articleNumber = String(row?.articleNumber || '').trim();
  if (instrument && articleNumber) return instrument + ' · член ' + articleNumber;
  if (instrument) return instrument;
  if (articleNumber) return 'Правен извор · член ' + articleNumber;
  return 'Правен извор';
}
function sourceDisplayMeta(row) {
  const parts = [];
  if (row?.version) parts.push('верзија ' + String(row.version));
  if (row?.humanReviewStatus) parts.push('член: ' + String(row.humanReviewStatus));
  if (row?.versionHumanReviewStatus) parts.push('верзија: ' + String(row.versionHumanReviewStatus));
  return parts.join(' · ');
}
function responseRuntimeLabel(data) {
  if (String(data?.model || '').trim()) return String(data.model).trim();
  if (data?.provider === 'canonical_corpus_no_model') return 'Governed corpus · без модел';
  if (data?.displayMode === 'professional_exact_article_source_gap') return 'Source/Version Gate';
  if (String(data?.provider || '').trim()) return String(data.provider).trim();
  return 'AI Advokat';
}
function sources(article, data) {
  // Display only source rows returned by the governed backend. Browser-side guide
  // matches are routing hints, not proof that the final answer relied on a guide.
  const rows = ['sources','legalSources','caseLawSources','guideSources','publicationSources'].flatMap(k => Array.isArray(data[k]) ? data[k] : []);
  const details = document.createElement('details'); details.className = 'sources';
  const summary = document.createElement('summary'); details.append(summary);
  const seen = new Set();
  for (const row of rows) {
    const label = sourceDisplayLabel(row);
    const meta = sourceDisplayMeta(row);
    const raw = row.url || row.sourceUrl || row.source_url;
    const articleNumber = String(row?.articleNumber || '').trim();
    const version = String(row?.version || '').trim();
    let url = null; try { url = new URL(raw); } catch {}
    const signature = [url?.href || '', articleNumber, label, version].join('|').toLowerCase();
    if (seen.has(signature)) continue;
    if (url && url.protocol === 'https:') {
      seen.add(signature);
      const a = document.createElement('a'); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = label || url.hostname;
      if (meta) a.title = meta;
      details.append(a);
    } else if (label) {
      seen.add(signature || ('label:' + label.toLowerCase()));
      const span = document.createElement('span'); span.className = 'source-text'; span.textContent = label + (meta ? ' · ' + meta : '');
      span.style.cssText = 'display:block;padding:5px 0;color:var(--muted)';
      details.append(span);
    }
  }
  if (seen.size) {
    summary.textContent = (seen.size === 1 ? 'Извор' : 'Извори') + ' · ' + seen.size;
    article.append(details);
  }
}
async function request(path, {token=key, body, signal} = {}) {
  const headers={accept:'application/json',...(body ? {'content-type':'application/json'} : {})};
  if(String(token||'').trim()) headers.authorization='Bearer '+String(token).trim();
  const response = await fetch(base + path, {
    method:body ? 'POST' : 'GET', signal, cache:'no-store',
    headers,
    ...(body ? {body:JSON.stringify(body)} : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    const error = new Error(data.message || data.error || 'Услугата не е достапна (' + response.status + ').');
    error.code = data.error; error.status = response.status; throw error;
  }
  return data;
}
async function guideMatches(q, signal) {
  try {
    const responses = await Promise.all(['/data/guides.json','/data/public-practical-guides-38-73.json'].map(url => fetch(url,{signal})));
    const data = await Promise.all(responses.map(r => r.ok ? r.json() : {}));
    const records = new Map((data[0].records || []).map(r => [String(r.id),r]));
    for (const row of data[1].guides || []) records.set(String(row.id),{...records.get(String(row.id)),...row});
    return window.AIAdvokatGuideRouter?.routeGuides(q,[...records.values()],{limit:3,minScore:10}) || [];
  } catch { return []; }
}
function reset() {
  generation++; pending?.abort(); pending = null; history = []; sessionId = crypto.randomUUID();
  $('useLocalGuides').checked = false;
  $('messages').replaceChildren(welcome.cloneNode(true)); $('question').value = ''; $('question').style.height = '';
  $('menu').open = false; busy(false);
}
$('access').onclick = () => { $('menu').open = false; $('loginStatus').textContent = ''; $('login').showModal(); };
$('closeLogin').onclick = () => $('login').close();
$('login').addEventListener('close', () => { $('key').value = ''; });
$('loginForm').onsubmit = async event => {
  event.preventDefault();
  const candidate = $('key').value.trim();
  if (!candidate || candidate.startsWith('sk-')) { $('loginStatus').textContent = 'Потребен е AI Advokat членски клуч, не OpenAI API клуч.'; return; }
  $('loginSubmit').disabled = true; $('loginStatus').textContent = 'Го проверувам пристапот…';
  const epoch = generation;
  try {
    const data = await request('/api/membership/status',{token:candidate,signal:AbortSignal.timeout(20000)});
    if (epoch !== generation || !$('login').open) return;
    reset(); key = candidate;
    forgetDeviceAccess(deviceStorage);
    const remembered = $('rememberAccess').checked && saveDeviceAccess(deviceStorage,candidate);
    busy(false); $('login').close();
    status('Професионален пристап · ' + data.membership.planCode + ' · OpenAI се проверува при секое барање.');
    if ($('question').value.trim().length >= 2) $('send').disabled = false;
    if ($('rememberAccess').checked && !remembered) status('Пристапот е активен, но прелистувачот не дозволува да се запомни.');
    $('question').focus();
  } catch { $('loginStatus').textContent = 'Клучот не е активен или услугата не е достапна. Обидете се повторно.'; }
  finally { $('loginSubmit').disabled = false; }
};
$('newChat').onclick = () => { voiceRuntime?.stopSpeaking(); voiceRuntime?.stopRecognition(); reset(); status(key ? 'Нов разговор · професионален пристап.' : 'Нов разговор · TRAINING режим без шифра.'); };
$('logout').onclick = () => { $('useLocalGuides').checked = false; key = ''; forgetDeviceAccess(deviceStorage); reset(); $('login').close(); status('Професионалниот клуч е отстранет. TRAINING режимот без шифра останува достапен.'); };
$('stop').onclick = () => pending?.abort();
$('question').oninput = () => {
  $('question').style.height = 'auto';
  $('question').style.height = Math.min($('question').scrollHeight,180) + 'px';
  if (!pending) $('send').disabled = $('question').value.trim().length < 2;
};
$('question').onkeydown = event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('composer').requestSubmit(); } };
$('mic').addEventListener('click',()=>voiceRuntimeReady.then(voice=>voice?.stopSpeaking?.()),{capture:true});
voiceRuntimeReady.then(voice=>{
  if(!voice) return;
  const binding=voice.bindMicrophone({
    button:$('mic'),
    input:$('question'),
    status,
    language:()=>selectedSpeechLocale(),
    onTranscript:()=>{
      if(pending){
        status('Тековниот одговор сè уште се обработува. Запрете го или почекајте, па зборувајте повторно.');
        return;
      }
      voiceConversationPending=true;
      status('✓ Говорот е препознаен. Го испраќам прашањето…');
      queueMicrotask(()=>$('composer')?.requestSubmit());
    }
  });
  if(binding?.supported){
    $('mic').title='Гласовен разговор: зборувај → испрати → слушни одговор';
    $('mic').setAttribute('aria-label','Гласовен разговор со AI Advokat');
    $('mic').dataset.voiceConversation=EXTERNAL_VOICE_CONVERSATION_VERSION;
  }
});
$('question').addEventListener('paste', event => { if (event.clipboardData?.files?.length) { event.preventDefault(); $('plus').open = true; status('Прикачете ги документите во приватниот простор преку „+“.'); } });
$('composer').addEventListener('dragover', event => event.preventDefault());
$('composer').addEventListener('drop', event => { event.preventDefault(); $('plus').open = true; status('Документите се прикачуваат во приватниот простор преку „+“.'); });
$('composer').onsubmit = async event => {
  event.preventDefault(); const q = $('question').value.trim();
  if (pending) return;
  if (q.length < 2) return;

  const languageSwitch=conversationalLanguageSwitch(q);
  if(languageSwitch){
    writePreferredLanguage(languageSwitch);
    status("Го менувам интерфејсот, AI одговорот и гласот на "+languageMeta(languageSwitch).name+"…");
    location.reload();
    return;
  }

  const localAction=conversationalLocalAction(q);
  if(localAction && typeof window.AIAdvokatVNext?.runAction==="function"){
    message("user",q);
    $('question').value="";
    $('question').style.height="";
    window.AIAdvokatVNext.runAction(localAction);
    status("✓ Отворена е бараната скриена функција: "+localAction+".");
    return;
  }

  if (!privacyRuntimeReady) {
    status('Го вчитувам заштитниот privacy модул…');
    await Promise.race([
      dependenciesReady,
      new Promise(resolve => setTimeout(resolve,3000)),
    ]);
    if (!privacyRuntimeReady) {
      voiceConversationPending=false;
      status('Заштитниот privacy модул не се вчита. Ништо не е испратено. Освежете ја страницата и обидете се повторно.');
      window.AIAdvokatFrontendGuard?.report?.('external','privacy-runtime',new Error('privacy_dependency_unavailable'));
      return;
    }
  }

  let outboundQ=q, privacyRedacted=false;
  const privacy=detectConfidentialCasePrompt(q);
  if (privacy.confidential) {
    const redacted=redactConfidentialCasePrompt(q);
    if (redacted.changed && redacted.safeToSend) {
      outboundQ=redacted.text;
      privacyRedacted=true;
    } else {
      voiceConversationPending=false;
      status('Овој текст содржи доверливи детали што не можам сигурно да ги маскирам автоматски. Ништо не е испратено. Можете да ги отстраните идентификаторите и повторно да испратите, или да го користите „+“ само ако точните податоци се неопходни за документот.');
      return;
    }
  }

  const epoch = generation, controller = new AbortController(); pending = controller; busy(true);
  const timeout = setTimeout(() => controller.abort(),180000);
  message('user',outboundQ); $('question').value = ''; $('question').style.height = '';
  const pulse = responsePulse();
  status(privacyRedacted
    ? 'Чувствителните идентификатори се маскирани локално и оригиналните вредности не се испратени. Го подготвувам одговорот…'
    : 'Ги проверувам материјалите и го подготвувам одговорот…');
  try {
    const guides = await guideMatches(outboundQ,controller.signal), ids = guides.map(g => g.id);
    const guideDocuments = await localGuideDocuments(window.AIAdvokatGuideVault,ids,$('useLocalGuides').checked);
    const data = await request('/api/bot',{signal:controller.signal,body:{q:withOutputLanguageDirective(outboundQ),visibleQ:outboundQ,capabilityRoute:conversationalCapabilityRoute(outboundQ),outputLanguage:selectedLanguageMeta().code,sessionId,mode:$('researchMode').value,webDomainPreset:$('webDomainPreset')?.value||'all',guideIds:ids,guideDocuments,history:history.slice(-8),attachments:[]}});
    if (epoch !== generation) return;
    pulse.remove();
    const article = message('assistant',data.answer || 'Нема одговор.',responseRuntimeLabel(data)); sources(article,data);
    history.push({role:'user',text:outboundQ},{role:'assistant',text:String(data.answer || '').slice(0,6000)}); history = history.slice(-24);
    if(voiceConversationPending){
      voiceConversationPending=false;
      const spokenAnswer=String(data.answer||'').trim();
      if(spokenAnswer){
        queueMicrotask(()=>voiceRuntimeReady.then(voice=>{
          const ok=voice?.speak?.(spokenAnswer,{status,langOverride:selectedSpeechLocale()});
          if(ok===false) status('Одговорот е подготвен, но гласното читање не е достапно во овој прелистувач.');
        }));
      }
    }
    status(privacyRedacted
      ? 'Одговорот е работен материјал. Личните идентификатори беа маскирани локално и не беа испратени.'
      : 'Одговорот е работен материјал. Проверете ги наведените извори.');
  } catch (error) {
    voiceConversationPending=false;
    pulse.remove();
    if (epoch !== generation) return;
    if (error.status === 401) {
      key = '';
      forgetDeviceAccess(deviceStorage);
      status('Професионалниот клуч не е активен. Продолжувам во TRAINING режим без шифра — обидете се повторно.');
    }
    else if (error.name === 'AbortError') status('Барањето е запрено или истече времето за одговор. Можете да се обидете повторно.');
    else status(error.status === 404 ? 'Новата верзија на серверот сè уште не е објавена.' : error.message);
    $('question').value = q;
  } finally {
    pulse.remove();
    clearTimeout(timeout);
    if (epoch === generation) { pending = null; busy(false); $('question').focus(); }
  }
};
async function restoreAccess() {
  const saved = readDeviceAccess(deviceStorage);
  if (!saved) {
    status('TRAINING режим · без шифра · приватни предмети остануваат во Secure Case.');
    return;
  }
  const epoch = generation;
  status('Го проверувам зачуваниот професионален пристап…');
  try {
    await request('/api/membership/status',{token:saved,signal:AbortSignal.timeout(20000)});
    if (epoch !== generation) return;
    key = saved; busy(false); status('Професионален пристап е активен. Подготвено за разговор.');
  } catch(error) {
    if (epoch !== generation) return;
    if (error.status === 401) forgetDeviceAccess(deviceStorage);
    key='';
    busy(false);
    status('Зачуваниот клуч не е активен. TRAINING режимот без шифра е достапен.');
  }
}
// Fresh devices may chat immediately in bounded TRAINING mode; a membership key
// remains optional for professional entitlements and mandatory for Secure Case.
installCompactExternalChrome();
bindLanguageSelector();
voiceRuntimeReady.then(voice=>{
  voice?.bindMicrophoneRecorder?.({
    startButton:$("recordStart"),
    stopButton:$("recordStop"),
    downloadButton:$("recordDownload"),
    status,
    filename:()=> "AI-Advokat-recording-"+selectedLanguageMeta().code.toUpperCase()+"-"+new Date().toISOString().replace(/[:.]/g,"-")+".webm"
  });
});
busy(false);
window.AIAdvokatCoreReady = true;
document.documentElement.dataset.botCoreRuntime = 'ready';
window.dispatchEvent(new CustomEvent('aiadvokat:core-ready'));
async function exportLatestAssistant(format) {
  const latest=[...history].reverse().find(item=>item.role==='assistant' && String(item.text||'').trim());
  if(!latest){ status('Сè уште нема AI одговор за извоз.'); return; }
  if(['txt','md'].includes(format)){
    const ext=format;
    const body=format==='md' ? '# AI Advokat — работен одговор\n\n'+latest.text : 'AI Advokat — работен одговор\n\n'+latest.text;
    const url=URL.createObjectURL(new Blob([body],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a'); a.href=url; a.download='AI-Advokat-working-draft.'+ext; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000); return;
  }
  try{
    const mod=await import('/assets/casepilot-export.js');
    const core=await import('/src/case-export.js');
    const report=core.normalizeCaseExportReport({
      title:'AI Advokat — работен одговор',
      summary:latest.text,
      sections:[{title:'AI Advokat',content:latest.text}],
      humanGate:'Потребна е професионална човечка проверка пред последична употреба.'
    });
    await mod.downloadCasePilotExport(report,format,{filename:'AI-Advokat-working-draft.'+format});
  }catch{
    status('Извозот во '+format.toUpperCase()+' не успеа. Обидете се со TXT или MD.');
  }
}
for(const button of document.querySelectorAll('[data-export]')){
  button.addEventListener('click',()=>exportLatestAssistant(String(button.dataset.export||'txt')));
}

async function refreshRuntimeStatus(){
  const node=$('runtimeStatus'); if(!node) return;
  try{
    const response=await fetch(base+'/api/orchestrator',{headers:{accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw new Error('runtime_'+response.status);
    const data=await response.json(); const runtime=data?.runtime||{};
    const paid=String(runtime.paidProviderModel||'OpenAI').trim();
    const ready=runtime.providerExecution==='configured_for_api_chat_execution';
    node.textContent=ready ? 'AI runtime: '+paid+' · активен' : 'AI runtime: делумно активен — проверете provider/runtime поставки.';
  }catch{ node.textContent='AI runtime: моментално недостапен за проверка.'; }
}
refreshRuntimeStatus();

$('exportChat').onclick = () => {
  if (!history.length) { status('Сè уште нема завршен разговор за преземање.'); return; }
  const text = 'AI Advokat — работен разговор\nПотребна е професионална проверка.\n\n' + history.map(m => (m.role === 'user' ? 'Вие' : 'AI Advokat') + ':\n' + m.text).join('\n\n');
  const url = URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = 'AI-Advokat-razgovor.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  $('menu').open = false;
};

async function vaultStatus() {
  try {
    const state = await window.AIAdvokatGuideVault?.summary();
    $('vaultStatus').textContent = state?.available ? state.count + ' проверени водичи на овој прелистувач.' : 'Локалното чување не е достапно.';
  } catch { $('vaultStatus').textContent = 'Локалната збирка не може да се прочита.'; }
}
function openMaterials() { $('menu').open = false; $('plus').open = false; $('materialsDialog').showModal(); vaultStatus(); }
$('materials').onclick = openMaterials;
$('plusMaterials').onclick = openMaterials;
$('closeMaterials').onclick = () => $('materialsDialog').close();
$('importGuides').onclick = () => $('guideFiles').click();
const HYBRID_CONTROL_R3_VERSION='AI_ADVOCAT_HYBRID_CONTROL_R3';
function consumeHybridControlR3Handoff(){
  let payload=null;
  try{
    const raw=sessionStorage.getItem('aiAdvokatHybridControlR3Handoff');
    if(!raw) return;
    sessionStorage.removeItem('aiAdvokatHybridControlR3Handoff');
    payload=JSON.parse(raw);
  }catch{
    try{sessionStorage.removeItem('aiAdvokatHybridControlR3Handoff')}catch{}
    return;
  }
  if(!payload || payload.version!==HYBRID_CONTROL_R3_VERSION) return;
  const createdAt=Number(payload.createdAt||0);
  if(!createdAt || Date.now()-createdAt>15*60*1000) return;
  const preset=String(payload.webDomainPreset||'all');
  if($('webDomainPreset')) $('webDomainPreset').value=['all','mk_official','eu_echr_official'].includes(preset)?preset:'all';
  const prompt=String(payload.prompt||'').trim().slice(0,20000);
  if(!prompt) return;
  $('question').value=prompt;
  $('question').dispatchEvent(new Event('input',{bubbles:true}));
  status('Hybrid Control R3 handoff е вчитан. Проверете го prompt-от и испратете кога сте подготвени.');
  $('question').focus();
}
consumeHybridControlR3Handoff();

$('guideFiles').onchange = async () => {
  const files = [...$('guideFiles').files]; $('guideFiles').value = '';
  if (!files.length) return;
  $('importGuides').disabled = true;
  $('vaultStatus').textContent = 'Ги проверувам оригиналните датотеки…';
  try {
    const response = await fetch('/data/guides.json',{cache:'no-store'});
    if (!response.ok) throw new Error('Регистарот не е достапен.');
    const result = await window.AIAdvokatGuideVault.importFiles(files,await response.json());
    $('vaultStatus').textContent = 'Вчитани: ' + result.imported + ' · одбиени: ' + result.rejected + ' · прескокнати: ' + result.skipped + '.';
  } catch { $('vaultStatus').textContent = 'Вчитувањето не успеа. Проверете ги датотеките и пристапот до регистарот.'; }
  finally { $('importGuides').disabled = false; }
};
