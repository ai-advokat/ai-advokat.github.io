// AI Advokat Matter Memory v1.
// Bounded, reviewable memory. Stores workflow preferences and non-sensitive matter state,
// never raw client documents, secrets, privileged narrative, or autonomous legal conclusions.

export const MATTER_MEMORY_VERSION="1.0.0";
export const MATTER_MEMORY_ALLOWED_KEYS=Object.freeze([
  "outputLanguage","citationStyle","draftingTone","preferredStructure",
  "matterPhase","legalArea","reviewChecklist","lastReviewedAt","workspaceRef"
]);
export const MATTER_MEMORY_FORBIDDEN_KEYS=Object.freeze([
  "clientName","personalId","address","email","phone","healthData","password",
  "documentText","privilegedNarrative","witnessStatement","secret","apiKey"
]);

function clean(v,max=500){
  if(typeof v!=="string") throw new TypeError("matter_memory_text_required");
  const x=v.normalize("NFKC").trim();
  if(!x||x.length>max) throw new TypeError("matter_memory_invalid_text");
  return x;
}
function cleanList(v){
  if(!Array.isArray(v)||v.length>20) throw new TypeError("matter_memory_invalid_list");
  return Object.freeze(v.map(x=>clean(String(x),120)));
}
export function sanitizeMatterMemory(input={}){
  if(!input||typeof input!=="object"||Array.isArray(input)) throw new TypeError("matter_memory_object_required");
  const out={};
  for(const key of MATTER_MEMORY_ALLOWED_KEYS){
    if(input[key]===undefined||input[key]===null||input[key]==="") continue;
    if(key==="preferredStructure"||key==="reviewChecklist") out[key]=cleanList(input[key]);
    else out[key]=clean(String(input[key]),key==="workspaceRef"?180:120);
  }
  return Object.freeze(out);
}
export function matterMemoryAudit(input={}){
  const keys=Object.keys(input||{});
  const forbidden=keys.filter(k=>MATTER_MEMORY_FORBIDDEN_KEYS.includes(k));
  const unknown=keys.filter(k=>!MATTER_MEMORY_ALLOWED_KEYS.includes(k)&&!MATTER_MEMORY_FORBIDDEN_KEYS.includes(k));
  return Object.freeze({safe:forbidden.length===0,forbidden:Object.freeze(forbidden),ignored:Object.freeze(unknown)});
}
export function mergeMatterMemory(current={},patch={}){
  const audit=matterMemoryAudit(patch);
  if(!audit.safe) throw new TypeError("matter_memory_forbidden_field");
  return sanitizeMatterMemory({...sanitizeMatterMemory(current),...sanitizeMatterMemory(patch)});
}
export function memoryPromptContext(memory={}){
  const m=sanitizeMatterMemory(memory);
  const lines=Object.entries(m).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(" | "):v}`);
  return Object.freeze({
    version:MATTER_MEMORY_VERSION,
    bounded:true,
    lines:Object.freeze(lines),
    rule:"Preferences may shape format and workflow only; they do not establish facts, law, authority or client consent."
  });
}
