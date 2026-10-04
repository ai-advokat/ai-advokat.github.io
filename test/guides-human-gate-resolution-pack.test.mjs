import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));

const pack = readJson("data/guides-human-gate-resolution-pack-2026-10-04.json");
const queue = readJson("data/guides-human-review-queue.json");
const guides = readJson("data/guides.json");
const require = createRequire(import.meta.url);
const { ZPP_TIMELINE } = require(path.join(root, "assets/zpp-timeline.js"));

const byIssue = new Map(pack.resolutions.map((x) => [x.issue_id, x]));
const byGuide = new Map(guides.records.map((x) => [x.id, x]));

test("HGR1 pack is a seven-item draft and never final approval", () => {
  assert.equal(pack.status, "draft_for_author_human_gate");
  assert.equal(pack.resolutions.length, 7);
  assert.equal(new Set(pack.resolutions.map((x) => x.issue_id)).size, 7);
  assert.equal(pack.mandate.instruction_to_prepare_confirmed, true);
  assert.equal(pack.mandate.author_final_approval_inferred, false);
});

test("HGR2 every activation and publication gate remains fail-closed", () => {
  for (const [key, value] of Object.entries(pack.fail_closed)) {
    assert.equal(value, false, key);
  }
  for (const value of Object.values(pack.implementation_boundary)) {
    assert.equal(value, false);
  }
  assert.ok(guides.records.every((x) => x.public_pdf === null));
  assert.ok(guides.records.every((x) => x.ai_use === "reference_only_until_human_gate"));
  const admin = byGuide.get("guide-administrative-v2");
  assert.equal(admin.candidate_artifact.public_release, "not_authorized");
  assert.equal(admin.candidate_artifact.rag_eligibility, "not_authorized");
  assert.equal(admin.candidate_artifact.production_corpus_write, "not_authorized");
});

test("HGR3 review queue links one-to-one to the resolution pack", () => {
  assert.equal(queue.resolution_pack.pack_id, pack.pack_id);
  assert.equal(queue.resolution_pack.status, "draft_for_author_human_gate");
  assert.equal(queue.resolution_pack.changes_public_catalog, false);
  assert.equal(queue.resolution_pack.author_final_approval_inferred, false);
  assert.equal(queue.items.length, 7);
  for (const item of queue.items) {
    assert.ok(byIssue.has(item.issue_id), item.issue_id);
    assert.equal(item.resolution_draft.pack_id, pack.pack_id);
    assert.equal(item.resolution_draft.issue_id, item.issue_id);
  }
});

test("HGR4 silence-of-administration resolution is limited to the abolished 30-day phrase", () => {
  const r = byIssue.get("silence-of-administration-consistency");
  assert.deepEqual(r.targets, [
    "guide-54-full-word-2026",
    "guide-26-administrative-short",
    "guide-administrative-v1"
  ]);
  assert.match(r.proposed_public_warning_mk, /У\.бр\.148\/2024/);
  assert.match(r.proposed_public_warning_mk, /член 26 став 2/);
  assert.match(r.proposed_public_warning_mk, /фиксен дополнителен рок од 30 дена/);
});

test("HGR5 ZPP transition dates match the governed public timeline", () => {
  const r = byIssue.get("zpp-2027-transition-crosscheck");
  const item = ZPP_TIMELINE.items.find((x) => x.id === "zpp-151-2026");
  assert.ok(item);
  assert.equal(r.official_timeline.gazette_issue, item.gazette);
  assert.equal(r.official_timeline.published, item.published);
  assert.equal(r.official_timeline.entry_into_force, item.entryIntoForce);
  assert.equal(r.official_timeline.application_from, item.applicationFrom);
  assert.deepEqual(new Set(r.targets), new Set([
    "guide-10-traffic",
    "guide-40-full-word-2026",
    "guide-59-full-word-2026",
    "guide-05-workplace",
    "guide-09-family"
  ]));
  assert.match(r.limitation, /does not infer the treatment of already-pending cases/i);
});

test("HGR6 Guide 05 names the exact statute but does not pretend the interpretation is settled", () => {
  const r = byIssue.get("guide-05-statute-identification");
  const g = byGuide.get("guide-05-workplace");
  assert.equal(r.resolved_statute, "Закон за заштита од вознемирување на работно место");
  assert.deepEqual(r.cited_articles, ["18", "22(4)"]);
  assert.equal(pack.sources.guide_05.sha256, g.sha256);
  assert.match(r.proposed_catalog_note_mk, /чл\. 18/);
  assert.match(r.proposed_catalog_note_mk, /чл\. 22 ст\. 4/);
  assert.match(r.interpretation_policy, /Do not resolve the conflict as settled/i);
});

test("HGR7 free-legal-aid check is exact-file-bound but still awaits personal author confirmation", () => {
  const r = byIssue.get("free-legal-aid-review-fingerprint-binding");
  const g = byGuide.get("guide-free-legal-aid");
  assert.equal(r.file, g.source_file);
  assert.equal(r.sha256, g.sha256);
  assert.equal(r.resolution_state, "technical_binding_ready_author_confirmation_required");
  assert.equal(r.final_gate, "explicit_author_legal_confirmation");
  assert.match(r.author_confirmation_text_mk, new RegExp(g.sha256));
});

test("HGR8 controlled attribution separates authorship from delivery, AI support and legacy branding", () => {
  const r = byIssue.get("authorship-editorial-role-normalization");
  const roles = new Set(r.controlled_roles);
  for (const role of [
    "author",
    "source_provider",
    "editor_or_adaptor",
    "ai_assisted_editorial_support",
    "conceptual_or_organizational_reference",
    "legacy_branding",
    "human_gate_approval"
  ]) {
    assert.ok(roles.has(role), role);
  }
  assert.match(r.public_template_when_only_source_delivery_is_confirmed_mk, /не се претпоставуваат/);
  assert.match(r.public_template_when_authorship_confirmed_mk, /AI-поддршката не е правен авторитет/);
});

test("HGR9 YUCOM provenance is visible without turning YUCOM into a source of Macedonian positive law", () => {
  const r = byIssue.get("yucom-provenance-v1-v2");
  assert.deepEqual(pack.sources.yucom_2023.authors, [
    "Теодора Томиќ Лазаревиќ",
    "Драгиша Ќалиќ",
    "Катарина Голубовиќ"
  ]);
  assert.equal(pack.sources.yucom_2023.isbn, "978-86-82222-18-7");
  assert.match(r.proposed_public_provenance_mk, /не извор на македонското позитивно право/);
  assert.match(r.authorship_caution, /must not imply/i);
});

test("HGR10 Lex AI remains provenance-only until its historical meaning is confirmed", () => {
  const r = byIssue.get("paragraf-lex-ai-branding-decision");
  assert.match(r.lex_ai_policy, /Do not equate Lex AI with AI-generated text/);
  assert.equal(r.final_gate, "author_confirmation_of_lex_ai_meaning_and_brand_policy");
  assert.match(r.proposed_public_wording_mk, /не означува сама по себе дека текстот е AI-генериран/);
});


test("HGR11 consolidated approval is a single author gate and does not open deployment gates", () => {
  const a = pack.consolidated_author_approval;
  assert.equal(a.mode, "single_group_human_gate_confirmation");
  assert.equal(a.status, "awaiting_author_response");
  assert.equal(a.approval_is_not_inferred, true);
  assert.equal(a.implementation_authority_after_exact_approval, true);
  assert.match(a.approval_text_mk, /Human Gate Resolution Pack 1–7/);
  assert.match(a.approval_text_mk, /1ca100dca77169b851f02567924203ef00ed64b27d22dbe5c5e9823c8d89be0e/);
  assert.match(a.short_reply_mk, /ОДОБРУВАМ/);
  for (const gate of [
    "public_pdf_release",
    "public_docx_release",
    "ai_corpus_eligibility",
    "rag_eligibility",
    "production_corpus_write",
    "legal_corpus_promotion",
    "provider_activation"
  ]) {
    assert.ok(a.still_separate_gates.includes(gate), gate);
    assert.equal(pack.fail_closed[gate], false, gate);
  }
});
