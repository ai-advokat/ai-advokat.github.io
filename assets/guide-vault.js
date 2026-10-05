(function(root,factory){
  const api=factory(root);
  if(typeof module==="object" && module.exports) module.exports=api;
  if(root) root.AIAdvokatGuideVault=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(root){
  "use strict";

  const DB_NAME="ai-advokat-private-guide-vault";
  const DB_VERSION=1;
  const STORE="guide_files";
  const DOCX_MIME="application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const MAX_GUIDE_FILE_BYTES=2_500_000;
  const PACKAGE_NAME_RE=/^Pravni_vodichi_38_63_FULL_WORD_ALL(?:\(\d+\))?\.zip$/i;

  function hasIndexedDb(){
    return !!root?.indexedDB;
  }

  function openDb(){
    if(!hasIndexedDb()) return Promise.reject(new Error("indexeddb_unavailable"));
    return new Promise((resolve,reject)=>{
      const req=root.indexedDB.open(DB_NAME,DB_VERSION);
      req.onerror=()=>reject(req.error||new Error("vault_open_failed"));
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE)){
          const store=db.createObjectStore(STORE,{keyPath:"guideId"});
          store.createIndex("sha256","sha256",{unique:false});
          store.createIndex("name","name",{unique:false});
        }
      };
      req.onsuccess=()=>resolve(req.result);
    });
  }

  function txDone(tx){
    return new Promise((resolve,reject)=>{
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error||new Error("vault_transaction_failed"));
      tx.onabort=()=>reject(tx.error||new Error("vault_transaction_aborted"));
    });
  }

  async function put(record){
    const db=await openDb();
    try{
      const tx=db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).put(record);
      await txDone(tx);
    }finally{db.close();}
  }

  async function get(guideId){
    const db=await openDb();
    try{
      return await new Promise((resolve,reject)=>{
        const req=db.transaction(STORE,"readonly").objectStore(STORE).get(String(guideId||""));
        req.onerror=()=>reject(req.error||new Error("vault_read_failed"));
        req.onsuccess=()=>resolve(req.result||null);
      });
    }finally{db.close();}
  }

  async function count(){
    const db=await openDb();
    try{
      return await new Promise((resolve,reject)=>{
        const req=db.transaction(STORE,"readonly").objectStore(STORE).count();
        req.onerror=()=>reject(req.error||new Error("vault_count_failed"));
        req.onsuccess=()=>resolve(Number(req.result||0));
      });
    }finally{db.close();}
  }

  async function clear(){
    const db=await openDb();
    try{
      const tx=db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).clear();
      await txDone(tx);
    }finally{db.close();}
  }

  function hex(bytes){
    return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");
  }

  async function sha256Hex(bytes){
    const view=bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const digest=await root.crypto.subtle.digest("SHA-256",view);
    return hex(new Uint8Array(digest));
  }

  function basename(value){
    return String(value||"").replace(/\\/g,"/").split("/").pop()||"";
  }

  function expectedNames(record){
    return new Set([
      record?.source_file,
      record?.candidate_artifact?.docx_file,
      record?.public_master_artifact?.docx_file
    ].filter(Boolean).map(basename));
  }

  function expectedHashes(record){
    return new Set([
      record?.sha256,
      record?.candidate_artifact?.docx_sha256,
      record?.public_master_artifact?.docx_sha256
    ].filter(v=>/^[0-9a-f]{64}$/i.test(String(v||""))).map(v=>String(v).toLowerCase()));
  }

  function isAiReadable(record){
    return record?.catalog_public===true
      && record?.public_record_enabled===true
      && record?.source_role!=="version_history"
      && record?.ai_reading==="authorized_private_vault_secondary_context";
  }

  function matchRecordForFile(name,records){
    const base=basename(name);
    return (Array.isArray(records)?records:[]).find(r=>isAiReadable(r) && expectedNames(r).has(base)) || null;
  }

  function u16(view,offset){return view.getUint16(offset,true);}
  function u32(view,offset){return view.getUint32(offset,true);}

  function findEocd(bytes){
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    const start=Math.max(0,bytes.length-65557);
    for(let i=bytes.length-22;i>=start;i--){
      if(u32(view,i)===0x06054b50) return i;
    }
    return -1;
  }

  async function inflateRaw(bytes){
    if(typeof root.DecompressionStream!=="function") throw new Error("zip_decompression_unavailable");
    let stream;
    try{stream=new root.DecompressionStream("deflate-raw");}
    catch{throw new Error("zip_decompression_unavailable");}
    const writer=stream.writable.getWriter();
    writer.write(bytes);
    writer.close();
    return new Uint8Array(await new Response(stream.readable).arrayBuffer());
  }

  async function unzip(bytes){
    const src=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
    const view=new DataView(src.buffer,src.byteOffset,src.byteLength);
    const eocd=findEocd(src);
    if(eocd<0) throw new Error("invalid_zip");
    const total=u16(view,eocd+10);
    const centralOffset=u32(view,eocd+16);
    const decoder=new TextDecoder("utf-8");
    const out=[];
    let p=centralOffset;
    for(let n=0;n<total;n++){
      if(p+46>src.length || u32(view,p)!==0x02014b50) throw new Error("invalid_zip_central_directory");
      const flags=u16(view,p+8);
      const method=u16(view,p+10);
      const compSize=u32(view,p+20);
      const uncompSize=u32(view,p+24);
      const nameLen=u16(view,p+28);
      const extraLen=u16(view,p+30);
      const commentLen=u16(view,p+32);
      const localOffset=u32(view,p+42);
      const name=decoder.decode(src.slice(p+46,p+46+nameLen));
      p+=46+nameLen+extraLen+commentLen;
      if(!name || name.endsWith("/")) continue;
      if(flags&1) throw new Error("encrypted_zip_not_supported");
      if(localOffset+30>src.length || u32(view,localOffset)!==0x04034b50) throw new Error("invalid_zip_local_header");
      const localNameLen=u16(view,localOffset+26);
      const localExtraLen=u16(view,localOffset+28);
      const dataStart=localOffset+30+localNameLen+localExtraLen;
      const compressed=src.slice(dataStart,dataStart+compSize);
      let data;
      if(method===0) data=compressed;
      else if(method===8) data=await inflateRaw(compressed);
      else throw new Error("zip_method_not_supported_"+method);
      if(uncompSize && data.length!==uncompSize) throw new Error("zip_size_mismatch");
      out.push({name,bytes:data});
    }
    return out;
  }

  function bytesToBase64(bytes){
    const view=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
    let out="";
    const chunk=0x8000;
    for(let i=0;i<view.length;i+=chunk){
      out+=String.fromCharCode(...view.subarray(i,Math.min(view.length,i+chunk)));
    }
    return btoa(out);
  }

  async function importDocxBytes(name,bytes,records){
    const base=basename(name);
    if(!/\.docx$/i.test(base)) return {status:"skipped",name:base,reason:"not_docx"};
    if(bytes.length<=0 || bytes.length>MAX_GUIDE_FILE_BYTES) return {status:"rejected",name:base,reason:"file_size"};
    const record=matchRecordForFile(base,records);
    if(!record) return {status:"skipped",name:base,reason:"not_authorized_or_unregistered"};
    const actual=await sha256Hex(bytes);
    if(!expectedHashes(record).has(actual)){
      return {status:"rejected",name:base,guideId:record.id,reason:"fingerprint_mismatch",sha256:actual};
    }
    await put({
      guideId:record.id,
      name:base,
      mime:DOCX_MIME,
      sha256:actual,
      bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),
      importedAt:new Date().toISOString(),
      verificationLabel:String(record.verification_label||""),
      status:String(record.status||"")
    });
    return {status:"imported",name:base,guideId:record.id,sha256:actual};
  }

  async function importFiles(fileList,registry){
    const records=Array.isArray(registry?.records)?registry.records:[];
    const results=[];
    for(const file of Array.from(fileList||[])){
      const name=basename(file?.name);
      if(!name) continue;
      const bytes=new Uint8Array(await file.arrayBuffer());
      if(PACKAGE_NAME_RE.test(name)){
        const expected=String(registry?.collection?.source_package_38_63?.sha256||"").toLowerCase();
        const actual=await sha256Hex(bytes);
        if(!expected || actual!==expected){
          results.push({status:"rejected",name,reason:"package_fingerprint_mismatch",sha256:actual});
          continue;
        }
        const entries=await unzip(bytes);
        for(const entry of entries){
          if(/\.docx$/i.test(entry.name) && !/^00_INDEX_/i.test(basename(entry.name))){
            results.push(await importDocxBytes(entry.name,entry.bytes,records));
          }
        }
      }else if(/\.docx$/i.test(name)){
        results.push(await importDocxBytes(name,bytes,records));
      }else{
        results.push({status:"skipped",name,reason:"unsupported_type"});
      }
    }
    try{await root.navigator?.storage?.persist?.();}catch{}
    return {
      imported:results.filter(x=>x.status==="imported").length,
      rejected:results.filter(x=>x.status==="rejected").length,
      skipped:results.filter(x=>x.status==="skipped").length,
      results
    };
  }

  async function documentsForGuides(guides,{max=2}={}){
    const out=[];
    for(const guide of (Array.isArray(guides)?guides:[])){
      if(out.length>=Math.max(1,Math.min(3,Number(max)||2))) break;
      const row=await get(guide?.id);
      if(!row?.bytes) continue;
      const bytes=new Uint8Array(row.bytes);
      const actual=await sha256Hex(bytes);
      if(actual!==row.sha256) continue;
      out.push({
        guideId:row.guideId,
        name:row.name,
        mime:row.mime||DOCX_MIME,
        sha256:row.sha256,
        base64:bytesToBase64(bytes)
      });
    }
    return out;
  }

  async function summary(){
    return {available:hasIndexedDb(),count:hasIndexedDb()?await count():0};
  }

  return Object.freeze({
    importFiles,
    documentsForGuides,
    summary,
    clear,
    sha256Hex,
    expectedHashes,
    matchRecordForFile,
    isAiReadable
  });
});
