#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const SECRET_PATH_RE=/(^|\/)(\.env($|\.)|id_rsa$|id_ed25519$|authorized_keys$|known_hosts$|\.ssh($|\/)|credentials?($|\.)|secrets?($|\.)|tokens?($|\.)|cookies?($|\.)|sessions?($|\.)|\.htpasswd$|\.npmrc$|\.pypirc$|.*\.pem$|.*\.key$|.*\.p12$|.*\.pfx$)/i;
const DB_EXT=new Set([".sql",".dump",".bak",".sqlite",".sqlite3",".db",".psql"]);
const LEGAL_EXT=new Set([".pdf",".doc",".docx",".odt",".rtf"]);
const STRUCTURED_EXT=new Set([".json",".jsonl",".ndjson",".csv",".xml",".xls",".xlsx"]);
const ARCHIVE_EXT=new Set([".zip",".tar",".gz",".tgz",".bz2",".xz",".7z"]);
const SOURCE_EXT=new Set([".js",".mjs",".cjs",".ts",".tsx",".jsx",".php",".py",".rb",".go",".java",".cs",".html",".css",".scss",".vue",".svelte",".sh",".yml",".yaml",".toml",".ini",".conf"]);
const MEDIA_EXT=new Set([".png",".jpg",".jpeg",".gif",".webp",".svg",".mp3",".wav",".m4a",".mp4",".mov",".avi",".mkv"]);

function sha256File(file){
  const h=crypto.createHash("sha256");
  const fd=fs.openSync(file,"r");
  const buf=Buffer.allocUnsafe(1024*1024);
  try{
    let n;
    while((n=fs.readSync(fd,buf,0,buf.length,null))>0) h.update(buf.subarray(0,n));
  }finally{fs.closeSync(fd);}
  return h.digest("hex");
}
function classify(rel){
  const lower=rel.toLowerCase();
  const ext=path.extname(lower);
  if(SECRET_PATH_RE.test(lower)) return ["credential_or_secret","quarantine"];
  if(DB_EXT.has(ext)) return ["database_dump","preserve_and_schema_discover"];
  if(LEGAL_EXT.has(ext)) return ["legal_document","document_extraction_staging"];
  if(STRUCTURED_EXT.has(ext)) return ["structured_export","normalization_candidate"];
  if(ARCHIVE_EXT.has(ext)) return ["archive","unpack_offline_then_reinventory"];
  if(SOURCE_EXT.has(ext) || /(^|\/)(dockerfile|package\.json|package-lock\.json|composer\.json|requirements\.txt|nginx\.conf)$/i.test(lower)) return ["application_source","preserve_non_corpus"];
  if(MEDIA_EXT.has(ext)) return ["media","preserve_non_corpus"];
  return ["other","manual_review"];
}

export function inventoryBackup(root){
  const abs=path.resolve(root);
  const st=fs.statSync(abs);
  if(!st.isDirectory()) throw new Error("Backup root must be a directory");
  const files=[];
  function walk(dir){
    const entries=fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name));
    for(const e of entries){
      const full=path.join(dir,e.name);
      const rel=path.relative(abs,full).split(path.sep).join("/");
      if(e.isSymbolicLink()){
        files.push({relative_path:rel,type:"symlink",ingestion_action:"preserve_non_corpus"});
        continue;
      }
      if(e.isDirectory()){walk(full);continue;}
      if(!e.isFile()) continue;
      const s=fs.statSync(full);
      const [classification,action]=classify(rel);
      files.push({
        relative_path:rel,
        bytes:s.size,
        sha256:sha256File(full),
        classification,
        ingestion_action:action,
        sensitive:classification==="credential_or_secret"
      });
    }
  }
  walk(abs);
  const counts={};
  let total=0;
  for(const f of files){
    counts[f.classification]=(counts[f.classification]??0)+1;
    total+=f.bytes??0;
  }
  const treeHash=crypto.createHash("sha256")
    .update(files.map(f=>[f.relative_path,f.sha256??"",f.bytes??0,f.type??"file"].join("\0")).join("\n"))
    .digest("hex");
  return {
    type:"paragraf_hetzner_backup_inventory",
    schema_version:"1.0",
    root_name:path.basename(abs),
    file_count:files.filter(f=>f.type!=="symlink").length,
    symlink_count:files.filter(f=>f.type==="symlink").length,
    total_bytes:total,
    classification_counts:counts,
    tree_sha256:treeHash,
    contains_quarantined_material:files.some(f=>f.ingestion_action==="quarantine"),
    files
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [,,root,outPath]=process.argv;
  if(!root){
    console.error("Usage: node scripts/paragraf-hetzner-backup-inventory.mjs <backup-dir> [inventory.json]");
    process.exit(2);
  }
  const result=inventoryBackup(root);
  const json=JSON.stringify(result,null,2)+"\n";
  if(outPath) fs.writeFileSync(outPath,json,"utf8"); else process.stdout.write(json);
}
