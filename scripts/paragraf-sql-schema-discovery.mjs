#!/usr/bin/env node
// Read-only SQL dump schema discovery for recovered Paragraf/Lex/Nova data.
// Extracts structural metadata only; never emits row values.

import fs from "node:fs";

const TABLE_RE=/(?:CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|INSERT\s+INTO)\s+(?:ONLY\s+)?(?:["`]?([A-Za-z0-9_]+)["`]?\.)?["`]?([A-Za-z0-9_]+)["`]?/gi;
const CREATE_RE=/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:["`]?([A-Za-z0-9_]+)["`]?\.)?["`]?([A-Za-z0-9_]+)["`]?\s*\(([^;]*?)\)\s*;/gis;
const COLUMN_RE=/^[\s]*["`]?([A-Za-z0-9_]+)["`]?\s+([A-Za-z][A-Za-z0-9_]*(?:\s*\([^)]*\))?)/i;

const LEGAL_HINTS={
  case_law:/(case|cases|judg|judgment|decision|presud|odluka|sudska|court)/i,
  primary_law:/(law|laws|statute|regulation|zakon|propisi|legislation|article|clan)/i,
  document:/(document|documents|upload|file|attachment|template|obrazec|podnesok)/i,
  commentary:/(comment|commentary|analysis|annotation|mislenje|stav)/i
};
const RESTRICTED_HINTS=/(user|users|account|auth|login|password|credential|token|session|billing|payment|invoice|subscription|card|customer|profile)/i;

function cleanName(schema,table){
  return schema ? `${schema}.${table}` : table;
}
function vendor(text){
  if(/PostgreSQL database dump|SET statement_timeout|COPY\s+.+\s+FROM\s+stdin/i.test(text)) return "postgresql";
  if(/MySQL dump|LOCK TABLES|ENGINE=InnoDB|UNLOCK TABLES/i.test(text)) return "mysql_or_mariadb";
  if(/SQLite format 3|PRAGMA foreign_keys|AUTOINCREMENT/i.test(text)) return "sqlite_sql_dump";
  return "unknown_sql";
}
function routeFor(name){
  if(RESTRICTED_HINTS.test(name)) return {classification:"restricted_operational",route:"exclude_from_legal_corpus"};
  for(const [classification,re] of Object.entries(LEGAL_HINTS)){
    if(re.test(name)) return {classification,route:"legal_schema_candidate"};
  }
  return {classification:"other",route:"manual_schema_review"};
}
function safeColumns(body){
  const cols=[];
  for(const raw of String(body).split(/\r?\n|,/)){
    const line=raw.trim();
    if(!line || /^(PRIMARY|UNIQUE|FOREIGN|CONSTRAINT|CHECK|KEY)\b/i.test(line)) continue;
    const m=line.match(COLUMN_RE);
    if(!m) continue;
    const name=m[1];
    const type=m[2].replace(/\s+/g," ").trim();
    cols.push({name,type});
  }
  return cols;
}

export function discoverSqlSchema(sqlText){
  const text=String(sqlText??"");
  if(!text.trim()) throw new Error("Empty SQL dump.");

  const tableMap=new Map();
  let m;
  while((m=TABLE_RE.exec(text))){
    const full=cleanName(m[1]||null,m[2]);
    if(!tableMap.has(full)) tableMap.set(full,{
      table:full,
      insert_statements:0,
      create_table_seen:false,
      columns:[],
      ...routeFor(full)
    });
    if(/^INSERT/i.test(m[0])) tableMap.get(full).insert_statements++;
  }

  while((m=CREATE_RE.exec(text))){
    const full=cleanName(m[1]||null,m[2]);
    const item=tableMap.get(full)??{
      table:full,
      insert_statements:0,
      create_table_seen:false,
      columns:[],
      ...routeFor(full)
    };
    item.create_table_seen=true;
    item.columns=safeColumns(m[3]);
    tableMap.set(full,item);
  }

  const tables=[...tableMap.values()].sort((a,b)=>a.table.localeCompare(b.table));
  const counts={};
  for(const t of tables) counts[t.classification]=(counts[t.classification]??0)+1;

  return {
    type:"paragraf_sql_schema_discovery",
    schema_version:"1.0",
    vendor_guess:vendor(text),
    table_count:tables.length,
    classification_counts:counts,
    contains_restricted_operational_tables:tables.some(t=>t.classification==="restricted_operational"),
    tables,
    row_values_emitted:false
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [,,inputPath,outPath]=process.argv;
  if(!inputPath){
    console.error("Usage: node scripts/paragraf-sql-schema-discovery.mjs <dump.sql> [schema-report.json]");
    process.exit(2);
  }
  const result=discoverSqlSchema(fs.readFileSync(inputPath,"utf8"));
  const json=JSON.stringify(result,null,2)+"\n";
  if(outPath) fs.writeFileSync(outPath,json,"utf8"); else process.stdout.write(json);
}
