import test from "node:test";
import assert from "node:assert/strict";
import { discoverSqlSchema } from "../scripts/paragraf-sql-schema-discovery.mjs";

test("PSQLD1 recognizes legal and restricted tables without row values",()=>{
  const sql=`
-- PostgreSQL database dump
CREATE TABLE public.cases (
  id bigint,
  case_number text,
  court text,
  decision_date date,
  full_text text
);
CREATE TABLE public.laws (
  id bigint,
  title text,
  body text
);
CREATE TABLE public.users (
  id bigint,
  email text,
  password_hash text
);
INSERT INTO public.cases VALUES (1,'K-1/2025','Court','2025-01-01','secret case text');
INSERT INTO public.users VALUES (1,'user@example.com','HASH');
`;
  const out=discoverSqlSchema(sql);
  assert.equal(out.vendor_guess,"postgresql");
  assert.equal(out.table_count,3);
  const by=Object.fromEntries(out.tables.map(x=>[x.table,x]));
  assert.equal(by["public.cases"].classification,"case_law");
  assert.equal(by["public.laws"].classification,"primary_law");
  assert.equal(by["public.users"].classification,"restricted_operational");
  assert.equal(out.row_values_emitted,false);
  assert.ok(!JSON.stringify(out).includes("secret case text"));
  assert.ok(!JSON.stringify(out).includes("user@example.com"));
  assert.ok(!JSON.stringify(out).includes("HASH"));
});

test("PSQLD2 recognizes MySQL document tables",()=>{
  const sql=`
-- MySQL dump
CREATE TABLE \`documents\` (
  \`id\` bigint,
  \`title\` varchar(255),
  \`path\` text
) ENGINE=InnoDB;
LOCK TABLES \`documents\` WRITE;
INSERT INTO \`documents\` VALUES (1,'A','/x');
UNLOCK TABLES;
`;
  const out=discoverSqlSchema(sql);
  assert.equal(out.vendor_guess,"mysql_or_mariadb");
  assert.equal(out.tables[0].classification,"document");
});

test("PSQLD3 unknown operational tables stay manual review",()=>{
  const sql="CREATE TABLE settings (id integer, name text, value text);";
  const out=discoverSqlSchema(sql);
  assert.equal(out.tables[0].classification,"other");
  assert.equal(out.tables[0].route,"manual_schema_review");
});
