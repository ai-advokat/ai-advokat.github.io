import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const registry = JSON.parse(fs.readFileSync("data/open-legal-sources-registry-2026.json","utf8"));
const policy = fs.readFileSync("architecture/OPEN_LEGAL_SOURCES_POLICY.md","utf8");
const migration = fs.readFileSync("migrations/0037_open_legal_sources_registry.sql","utf8");

const byId = new Map(registry.sources.map((source) => [source.id, source]));

test("OLS1 registry ids and canonical URLs are unique and governance fields are complete", () => {
  assert.equal(byId.size, registry.sources.length);
  assert.equal(new Set(registry.sources.map((source) => source.canonical_url)).size, registry.sources.length);
  assert.ok(registry.sources.length >= 15);

  for (const source of registry.sources) {
    for (const key of [
      "id","jurisdiction","name","canonical_url","authority_status",
      "public_access_status","reuse_status","ingest_status",
      "automated_bulk_ingest","human_review_status","rights_checked_on"
    ]) {
      assert.notEqual(source[key], undefined, `${source.id} missing ${key}`);
    }
  }
});

test("OLS2 public access never implies automated bulk reuse", () => {
  for (const source of registry.sources) {
    if (source.automated_bulk_ingest) {
      assert.ok(
        ["verified_reuse_allowed","metadata_reuse_verified"].includes(source.reuse_status),
        `${source.id} automated ingest without verified reuse basis`
      );
    }
    if (source.reuse_status === "terms_review_required") {
      assert.equal(source.automated_bulk_ingest, false, `${source.id} must fail closed`);
    }
  }
  assert.ok(registry.doctrine.includes("public_does_not_mean_reusable"));
  assert.ok(registry.doctrine.includes("bulk_ingest_fails_closed_when_terms_are_unclear"));
});

test("OLS3 North Macedonian LDBIS and ENER remain official but bulk-reuse fail closed", () => {
  const ldbis = byId.get("mk-ldbis");
  const ener = byId.get("mk-ener");
  assert.equal(ldbis.authority_status, "primary_official");
  assert.equal(ldbis.reuse_status, "terms_review_required");
  assert.equal(ldbis.automated_bulk_ingest, false);
  assert.match(ldbis.terms_evidence_url, /ldbis\.pravda\.gov\.mk/);

  assert.equal(ener.authority_status, "official_supporting");
  assert.equal(ener.reuse_status, "terms_review_required");
  assert.equal(ener.automated_bulk_ingest, false);
  assert.ok(ener.blocked_until_review.includes("republication_of_third_party_material"));
  assert.match(ener.terms_evidence_note, /intellectual-property|proprietary rights/i);
});

test("OLS4 EUR-Lex is the verified full-text reuse lane while Crossref and Zenodo stay scoped", () => {
  const eurlex = byId.get("eu-eurlex");
  assert.equal(eurlex.reuse_status, "verified_reuse_allowed");
  assert.equal(eurlex.ingest_status, "fulltext_and_metadata_allowed_with_conditions");
  assert.equal(eurlex.automated_bulk_ingest, true);
  assert.ok(eurlex.allowed_now.includes("eurlex_metadata_cc0"));

  const crossref = byId.get("crossref");
  assert.equal(crossref.reuse_status, "metadata_reuse_verified");
  assert.equal(crossref.ingest_status, "metadata_only");
  assert.ok(crossref.blocked_until_review.includes("abstract_fulltext_reuse_without_record_or_publisher_rights"));

  const zenodo = byId.get("zenodo");
  assert.equal(zenodo.reuse_status, "record_level_license_required");
  assert.equal(zenodo.automated_bulk_ingest, false);
  assert.ok(zenodo.allowed_now.includes("fulltext_only_when_record_license_allows_reuse"));
});

test("OLS5 HUDOC keeps official case authority separate from translation rights", () => {
  const hudoc = byId.get("echr-hudoc");
  assert.equal(hudoc.authority_status, "international_court_official");
  assert.equal(hudoc.reuse_status, "mixed_rights");
  assert.equal(hudoc.automated_bulk_ingest, false);
  assert.ok(hudoc.blocked_until_review.includes("bulk_republication_of_non_official_translations"));
  assert.match(hudoc.rights_evidence_note, /copyright-protected|permission/i);
});

test("OLS6 comparative foreign sources are visible but cannot become MK controlling authority", () => {
  for (const id of ["rs-pravno-informacioni-sistem","si-pisrs"]) {
    const source = byId.get(id);
    assert.equal(source.authority_status, "official_foreign_comparative");
    assert.equal(source.automated_bulk_ingest, false);
    assert.ok(source.blocked_until_review.some((x) => /mk_controlling_authority/.test(x)));
  }
});

test("OLS7 migration creates a rights overlay rather than a second legal corpus", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS open_legal_source_rights/);
  assert.doesNotMatch(migration, /CREATE TABLE IF NOT EXISTS sources\b/);
  assert.match(migration, /public accessibility is not treated as blanket permission/i);
  assert.match(migration, /eu-eurlex/);
  assert.match(migration, /record_level_license_required/);
  assert.match(migration, /VALUES \('37', 'Add rights-aware Open Legal Sources registry overlay'\)/);
});

test("OLS8 policy preserves existing authority, current-law and Human Gate systems", () => {
  assert.match(policy, /Public access is not the same as permission/i);
  assert.match(policy, /rights-and-ingest overlay/i);
  assert.match(policy, /current-law readiness gates/i);
  assert.match(policy, /Human Gate/i);
  assert.match(policy, /No subscription bypass/i);
  assert.match(policy, /Privacy minimisation/i);
});

test("OLS9 target ingest record preserves provenance and rights state", () => {
  const required = new Set(registry.target_ingest_record.required);
  for (const key of [
    "source_id","source_url","jurisdiction","authority_status","captured_at",
    "reuse_status","ingest_status","source_hash","human_review_status"
  ]) {
    assert.ok(required.has(key), key);
  }
  const recommended = new Set(registry.target_ingest_record.recommended);
  for (const key of [
    "terms_or_license_url","document_identifier","effective_from","effective_to",
    "official_binding_verified","record_level_license","personal_data_review"
  ]) {
    assert.ok(recommended.has(key), key);
  }
});
