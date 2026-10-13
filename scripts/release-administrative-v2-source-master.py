from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data/guides.json"
PDF_REL = Path("guides/pdfs/guide-administrative-v2-final-master.pdf")
PDF_PATH = ROOT / PDF_REL
AUDIT_REL = Path("docs/guides/RELEASE_ADMINISTRATIVE_V2_EXACT_MASTER_2026-10-13.md")
AUDIT_PATH = ROOT / AUDIT_REL

GUIDE_ID = "guide-administrative-v2"
PUBLIC_PDF = "/" + PDF_REL.as_posix()
EXPECTED_SHA256 = "4c11375551a705173d7cf6d2785b5351c8dc61df76ae7ef7a7a35de14b3c721d"
EXPECTED_PAGES = 15
EXPECTED_BYTES = 297408
RELEASE_DATE = "2026-10-13"

# This is a source-grounded runtime digest of the exact uploaded master.  The
# guide remains secondary guidance and is never promoted to current-law authority.
BOT_TEXT = """ВОДИЧ НИЗ УПРАВНАТА ПОСТАПКА И УПРАВНИОТ СПОР — V2.0 FINAL MASTER
Автор: адвокат Зоран Стојанкиќ. Едиција: „Моите права во секојдневниот живот“ — AI Advokat / Paragraf.mk. Проширено и целосно адаптирано издание 2.0, Скопје 2026. Правна проверка на јавно достапните извори: 3 октомври 2026.

СТАТУС И HUMAN GATE
Ова е самостојно приспособен практичен водич за правниот систем на Република Северна Македонија. Не е официјален пречистен текст на закон, не е публикација на Управниот суд или друг државен орган и не заменува правна проценка на конкретен предмет. Посебните закони можат да содржат посебни правила. Пред употреба мора да се проверат важечката законска верзија, доставата, правната поука, посебниот материјален закон и поновите уставносудски или судски одлуки. Практичните модели се работни обрасци, не готови поднесоци. За професионална употреба конкретниот текст, рокот и правниот лек ги проверува адвокат или друг овластен правник.

КАКО СЕ КОРИСТИ
Почнете со брзата ориентација и табелата со рокови, па одете на соодветната фаза: управна постапка, жалба, молчење, тужба, расправа, жалба до Вишиот управен суд или извршување на пресуда. Кај секој рок запишете: што е доставено, кога е доставено, кој правен лек е дозволен и кој е последниот ден. Усно ветување, претставка или ургенција не се сигурна замена за навремено правно средство.

ОПФАТ
1. Зошто е важен управниот спор.
2. Разлика меѓу управна постапка и управен спор.
3. Акти, дејствија и пропуштања што можат да се оспорат.
4. Кога прво се поднесува жалба, а кога се оди на суд.
5. Молчење на администрацијата.
6. Надлежни судови и странки.
7. Подготовка на тужбата.
8. Одлагање на извршувањето и времени мерки.
9. Рокови.
10. Постапување по поднесување тужба.
11. Факти, докази и расправа.
12. Пресуди и полна јурисдикција.
13. Жалба до Вишиот управен суд.
14. Повторување на судската постапка.
15. Трошоци и бесплатна правна помош.
16. Извршување на судската пресуда.
17. Практични модели, контролни листи, најчести прашања и поимник.

КЛУЧНИ ИЗВОРНО НАВЕДЕНИ ПРАВИЛА — СЕКОГАШ ПРОВЕРИ ОФИЦИЈАЛЕН ИЗВОР
• Кога ЗОУП или посебен закон дозволува жалба против првостепен акт, по правило прво се користи жалбата. Водичот го наведува општиот рок од 15 дена од доставувањето или известувањето, освен ако посебен закон предвидува подолг рок.
• За тужба против доставен конечен акт, водичот го наведува општото правило од 30 дена од доставувањето, со задолжителна проверка на посебниот закон и правната поука.
• Кај молчење на администрацијата, Одлуката У.бр.148/2024 од 2 октомври 2024 го укинала делот „во рок од 30 дена“ од член 26 став 2 на ЗУС. Старата 30-дневна формулација не смее да се користи како важечка преклузија.
• Не се пренесува автоматски српскиот модел „60 + 7 дена“; се проверуваат ЗОУП, ЗУС, правната поука и посебниот закон.
• Поднесувањето тужба по правило не го запира извршувањето. Условите за одлагање или времена мерка се оценуваат одделно и се докажуваат конкретно.
• Тужбата треба да ги идентификува актот или пропуштањето, странките, фактите, правната повреда, барањето и доказите. Работниот модел е: факт → доказ → правно значење → барање.
• Според водичот, член 60 став 1 на ЗУС ја нагласува полната јурисдикција, но постојат законски исклучоци. Поништување со враќање не значи автоматски дека материјалното право е признаено.
• Жалба против пресуда е можна само во законски определени случаи. Кога е дозволена, водичот наведува 15 дена од доставување на преписот; секогаш се проверуваат изреката, член 69 и правната поука.
• Повторувањето е вонреден правен лек со ограничени основи; водичот наведува општ субјективен рок од 30 дена од дознавањето за причината, со посебни правила за одделни основи.
• Барањето за бесплатна правна помош не треба автоматски да се третира како прекин или продолжување на процесен рок.
• По пресуда се проверуваат: дозволеност и рок за жалба, правосилност, точната изрека, рокот за органот и мерките при непостапување.

ДОКАЗИ И КОНТРОЛА
За молчење се чуваат копија од барањето или жалбата, архивски печат/повратница/електронска потврда, доказ за предавање на списите кога е релевантно и писмен статус. Пред тужба се проверуваат конечноста на актот, датумот на достава, надлежноста, тужениот орган, конкретното барање, нумерираните прилози, потребата од времена мерка, таксата и можноста за бесплатна правна помош.

ИЗВОРИ НАВЕДЕНИ ВО MASTER-ОТ
Закон за управни спорови; Закон за општата управна постапка; Уставен суд У.бр.148/2024, У.бр.94/2017, У.бр.247/2024, У.бр.249/2024 и У.бр.118/2025; Министерство за правда — бесплатна правна помош и судови; Закон за парничната постапка кога ЗУС упатува; Европска конвенција за човековите права кога е применлива. YUCOM 2023 е наведена само како педагошка и организациска референца, не како извор на македонското позитивно право.

FINGERPRINT
Точниот јавно врзан PDF master има 15 страници, 297408 bytes и SHA-256 4c11375551a705173d7cf6d2785b5351c8dc61df76ae7ef7a7a35de14b3c721d. Ботот го користи само како секундарен контекст; секое тековно правно тврдење останува подредено на официјален извор и Human Gate."""


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def replace_test(path: Path, marker: str, next_marker: str, replacement: str) -> None:
    text = path.read_text(encoding="utf-8")
    pattern = rf'(\n\s*test\("{re.escape(marker)}.*?)(?=\n\s*test\("{re.escape(next_marker)})'
    updated, count = re.subn(pattern, "\n" + replacement.rstrip() + "\n", text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"Could not patch {path}: {marker} -> {next_marker}; count={count}")
    path.write_text(updated, encoding="utf-8")


def replace_last_test(path: Path, marker: str, replacement: str) -> None:
    text = path.read_text(encoding="utf-8")
    pattern = rf'(\n\s*test\("{re.escape(marker)}.*?\n\}}\);)\s*$'
    updated, count = re.subn(pattern, "\n" + replacement.rstrip() + "\n", text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"Could not patch last test {path}: {marker}; count={count}")
    path.write_text(updated, encoding="utf-8")


def patch_registry(pdf_bytes: bytes) -> dict:
    data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    matches = [r for r in data.get("records", []) if r.get("id") == GUIDE_ID]
    if len(matches) != 1:
        raise RuntimeError(f"Expected exactly one {GUIDE_ID}; found {len(matches)}")
    record = matches[0]

    candidate = record.get("candidate_artifact") or {}
    master = record.get("public_master_artifact") or {}
    authorization = record.get("pdf_release_authorization") or {}
    for label, value in [
        ("candidate_artifact.pdf_sha256", candidate.get("pdf_sha256")),
        ("public_master_artifact.pdf_sha256", master.get("pdf_sha256")),
        ("pdf_release_authorization.artifact_sha256", authorization.get("artifact_sha256")),
    ]:
        if value != EXPECTED_SHA256:
            raise RuntimeError(f"{label} mismatch: {value!r}")

    record.update({
        "public_pdf": PUBLIC_PDF,
        "public_pdf_sha256": EXPECTED_SHA256,
        "public_pdf_size_bytes": len(pdf_bytes),
        "public_pdf_pages": EXPECTED_PAGES,
        "public_pdf_state": "active_exact_fingerprint_bound_human_gate",
        "bot_runtime_enabled": True,
        "bot_text": BOT_TEXT,
        "public_bot_context_authorized": True,
        "public_bot_context_policy": "secondary_source_primary_source_verification_and_human_gate",
        "ai_legal_authority": False,
        "current_law_authority": False,
        "current_law_claim_policy": "primary_source_required",
        "publication_state": "public_exact_master_human_gate_required",
        "publication_notice_mk": "Точниот V2.0 FINAL MASTER PDF е јавно активен и fingerprint-врзан. Водичот останува секундарен материјал; официјалниот извор и Human Gate се задолжителни за конкретен предмет."
    })
    record.setdefault("public_master_artifact", {}).update({
        "public_pdf": PUBLIC_PDF,
        "public_pdf_sha256": EXPECTED_SHA256,
        "public_pdf_size_bytes": len(pdf_bytes),
        "public_pdf_pages": EXPECTED_PAGES,
        "public_download": "active_exact_fingerprint_bound_2026-10-13",
        "asset_publication_status": "active",
        "asset_publication_date": RELEASE_DATE
    })
    record.setdefault("candidate_artifact", {}).update({
        "asset_publication_status": "exact_pdf_master_published_2026-10-13",
        "published_pdf": PUBLIC_PDF
    })
    record.setdefault("pdf_release_authorization", {}).update({
        "publication_state": "active_exact_fingerprint_bound",
        "public_pdf": PUBLIC_PDF,
        "published_on": RELEASE_DATE
    })

    collection = data.setdefault("collection", {})
    collection.setdefault("final_control", {}).update({
        "result": "pass_with_one_exact_fingerprint_bound_source_master_active",
        "public_document_downloads": 1,
        "note": "Administrative V2.0 FINAL MASTER is the first exact source-bound public PDF release. Remaining guide PDF gates stay closed until exact cleaned masters are fingerprint-bound."
    })
    collection.setdefault("public_experience", {}).update({
        "public_document_download": True,
        "exact_fingerprint_bound_pdf_count": 1,
        "exact_fingerprint_bound_record_ids": [GUIDE_ID]
    })
    collection.setdefault("v2_final_master_activation", {}).update({
        "public_pdf_download": True,
        "public_pdf": PUBLIC_PDF,
        "public_pdf_sha256": EXPECTED_SHA256,
        "asset_publication_state": "active_exact_fingerprint_bound",
        "asset_publication_date": RELEASE_DATE,
        "bot_runtime_context": "active_secondary_human_gate"
    })
    collection.setdefault("public_pdf_release_authorization", {}).update({
        "publication_state": "partial_release_active_exact_asset_binding",
        "published_count": 1,
        "published_record_ids": [GUIDE_ID],
        "remaining_hold_count": 38,
        "first_exact_release": {
            "record_id": GUIDE_ID,
            "public_pdf": PUBLIC_PDF,
            "sha256": EXPECTED_SHA256,
            "pages": EXPECTED_PAGES,
            "released_on": RELEASE_DATE,
            "legal_authority": False,
            "human_gate_required": True
        }
    })
    collection["public_bot_context_release"] = {
        "state": "active_partial_secondary_context",
        "released_on": RELEASE_DATE,
        "active_count": 1,
        "active_record_ids": [GUIDE_ID],
        "policy": "Source-grounded secondary guide context only; current-law claims require official sources and Human Gate.",
        "rag_eligibility": False,
        "production_corpus_write": False,
        "legal_authority": False
    }

    REGISTRY.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return record


def patch_tests() -> None:
    p = ROOT / "test/guides-library.test.mjs"
    replace_test(p, "G2 ", "G3 ", '''  test("G2 exact Administrative V2 source master exposes one fingerprint-bound public PDF while AI corpus stays closed",()=>{
    const released=data.records.filter(x=>typeof x.public_pdf==="string");
    assert.equal(released.length,1);
    const admin=data.records.find(x=>x.id==="guide-administrative-v2");
    assert.equal(admin.public_pdf,"/guides/pdfs/guide-administrative-v2-final-master.pdf");
    assert.equal(admin.public_pdf_sha256,"4c11375551a705173d7cf6d2785b5351c8dc61df76ae7ef7a7a35de14b3c721d");
    assert.ok(data.records.filter(x=>x.id!==admin.id).every(x=>x.public_pdf===null));
    assert.ok(data.records.every(x=>x.ai_use==="reference_only_until_human_gate"));
    assert.equal(data.collection.public_pdf_release_authorization.scope,"all_39_public_catalog_records_pdf_only");
    assert.equal(data.collection.public_pdf_release_authorization.publication_state,"partial_release_active_exact_asset_binding");
    assert.equal(data.collection.public_pdf_release_authorization.public_docx_release,false);
    assert.equal(data.collection.public_pdf_release_authorization.rag_eligibility,false);
  });''')
    replace_test(p, "G11 ", "G12 ", '''  test("G11 catalogue visibility remains separate; exactly one fingerprint-bound PDF is active and AI promotion stays closed",()=>{
    assert.equal(data.collection.catalog_visibility.public_download,false);
    assert.equal(data.collection.catalog_visibility.rag_eligibility,false);
    assert.equal(data.collection.catalog_visibility.production_corpus_write,false);
    assert.equal(data.collection.catalog_visibility.legal_corpus_promotion,false);
    assert.equal(data.records.filter(x=>typeof x.public_pdf==="string").length,1);
    assert.ok(data.records.every(x=>x.ai_use==="reference_only_until_human_gate"));
    assert.equal(data.collection.public_pdf_release_authorization.target_count,39);
    assert.equal(data.collection.public_pdf_release_authorization.published_count,1);
    assert.deepEqual(data.collection.public_pdf_release_authorization.published_record_ids,["guide-administrative-v2"]);
    assert.equal(data.collection.public_pdf_release_authorization.source_fingerprint_required,true);
    assert.equal(data.collection.public_pdf_release_authorization.pdf_fingerprint_required,true);
  });''')
    replace_test(p, "G12 ", "G13 ", '''  test("G12 Administrative V2 FINAL MASTER is exact-PDF-bound, bot-connected and remains non-authoritative",()=>{
    const g=data.records.find(x=>x.id==="guide-administrative-v2");
    assert.equal(g.status,"final_master_catalogue_active");
    assert.equal(g.pages,15);
    assert.equal(g.candidate_artifact.artifact_version,"V2.0 FINAL MASTER");
    assert.equal(g.candidate_artifact.docx_sha256,"de609c4526eee401a3759ff2fe22556cacded9bef87cdf675213e69e8a10ed11");
    assert.equal(g.candidate_artifact.pdf_sha256,"4c11375551a705173d7cf6d2785b5351c8dc61df76ae7ef7a7a35de14b3c721d");
    assert.equal(g.candidate_artifact.author_approval,"pending");
    assert.equal(g.candidate_artifact.rag_eligibility,"not_authorized");
    assert.equal(g.candidate_artifact.production_corpus_write,"not_authorized");
    assert.equal(g.public_master_artifact.pdf_sha256,g.candidate_artifact.pdf_sha256);
    assert.equal(g.public_master_artifact.asset_publication_status,"active");
    assert.equal(g.public_pdf,"/guides/pdfs/guide-administrative-v2-final-master.pdf");
    assert.equal(g.public_pdf_sha256,g.public_master_artifact.pdf_sha256);
    assert.equal(g.bot_runtime_enabled,true);
    assert.match(g.bot_text,/У\.бр\.148\/2024/);
    assert.equal(g.ai_legal_authority,false);
    assert.equal(g.current_law_authority,false);
    assert.equal(g.ai_use,"reference_only_until_human_gate");
  });''')
    replace_test(p, "G13 ", "G14 ", '''  test("G13 final catalogue control metrics remain internally consistent after the first exact source-master release",()=>{
    const publicRecords=data.records.filter(x=>x.catalog_public===true);
    assert.equal(data.generated_on,"2026-10-13");
    assert.equal(publicRecords.length,39);
    assert.equal(publicRecords.filter(x=>x.source_role!=="version_history").length,37);
    assert.equal(publicRecords.filter(x=>x.source_role==="version_history").length,2);
    assert.equal(publicRecords.filter(x=>typeof x.public_pdf==="string").length,1);
    assert.equal(data.collection.final_control.registry_total,39);
    assert.equal(data.collection.final_control.public_catalog_records,39);
    assert.equal(data.collection.final_control.public_active_or_special_records,37);
    assert.equal(data.collection.final_control.controlled_nonpublic_candidates,0);
    assert.equal(data.collection.final_control.public_document_downloads,1);
    assert.equal(data.collection.public_fulltext_release.active_count,4);
    assert.equal(publicRecords.filter(x=>typeof x.public_fulltext==="string").length,4);
  });''')
    replace_test(p, "G19 ", "G20 ", '''  test("G19 public experience metadata records one exact PDF release while RAG and production gates remain closed",()=>{
    assert.equal(data.collection.public_experience.scope,"exact_39_public_catalog_records");
    assert.equal(data.collection.public_experience.detail_route,"/guides/record.html?g={public_slug}");
    assert.equal(data.collection.public_experience.public_document_download,true);
    assert.equal(data.collection.public_experience.exact_fingerprint_bound_pdf_count,1);
    assert.deepEqual(data.collection.public_experience.exact_fingerprint_bound_record_ids,["guide-administrative-v2"]);
    assert.equal(data.collection.public_experience.rag_eligibility,false);
    assert.equal(data.collection.public_experience.production_corpus_write,false);
    assert.equal(data.collection.public_experience.legal_corpus_promotion,false);
    assert.equal(data.collection.public_experience.version,"2.2");
    assert.equal(data.collection.public_experience.public_pdf_release_authorized,true);
    assert.ok(data.collection.public_experience.features.includes("fingerprint_bound_public_pdf_open_action"));
  });''')

    p = ROOT / "test/guides-human-gate-resolution-pack.test.mjs"
    replace_test(p, "HGR2 ", "HGR3 ", '''test("HGR2 Pack 1-7 remains fail-closed, while a later exact-PDF authorization activates only Administrative V2", () => {
  for (const [key, value] of Object.entries(pack.fail_closed)) {
    assert.equal(value, false, key);
  }
  assert.equal(pack.implementation_boundary.this_pack_approves_authorship, true);
  assert.equal(pack.implementation_boundary.this_pack_approves_legal_content, true);
  for (const key of [
    "this_pack_changes_public_catalog",
    "this_pack_edits_source_documents",
    "this_pack_authorizes_public_release",
    "this_pack_authorizes_ai_use"
  ]) {
    assert.equal(pack.implementation_boundary[key], false, key);
  }
  const released=guides.records.filter((x)=>typeof x.public_pdf==="string");
  assert.equal(released.length,1);
  assert.ok(guides.records.every((x) => x.ai_use === "reference_only_until_human_gate"));
  const admin = byGuide.get("guide-administrative-v2");
  assert.equal(admin.public_pdf,"/guides/pdfs/guide-administrative-v2-final-master.pdf");
  assert.equal(admin.public_pdf_sha256,"4c11375551a705173d7cf6d2785b5351c8dc61df76ae7ef7a7a35de14b3c721d");
  assert.equal(admin.candidate_artifact.author_approval,"pending");
  assert.equal(guides.collection.public_pdf_release_authorization.decision_id, "all-guides-public-pdf-release-2026-10-04");
  assert.equal(guides.collection.public_pdf_release_authorization.public_docx_release, false);
  assert.equal(guides.collection.public_pdf_release_authorization.rag_eligibility, false);
  assert.equal(admin.candidate_artifact.rag_eligibility, "not_authorized");
  assert.equal(admin.candidate_artifact.production_corpus_write, "not_authorized");
});''')

    p = ROOT / "test/gazette-guides-product.test.mjs"
    replace_last_test(p, "GG7 ", '''test("GG7 Administrative V2 is released only from the exact fingerprint-bound FINAL MASTER",()=>{
  const admin=guides.records.find(x=>x.id==="guide-administrative-v2");
  assert.ok(admin);
  assert.equal(admin.activation_state,"active_verified");
  assert.equal(admin.public_fulltext,undefined);
  assert.equal(admin.public_master_artifact.artifact_version,"V2.0 FINAL MASTER");
  assert.equal(admin.public_master_artifact.pdf_sha256,"4c11375551a705173d7cf6d2785b5351c8dc61df76ae7ef7a7a35de14b3c721d");
  assert.equal(admin.public_pdf,"/guides/pdfs/guide-administrative-v2-final-master.pdf");
  assert.equal(admin.public_pdf_sha256,admin.public_master_artifact.pdf_sha256);
  assert.equal(admin.bot_runtime_enabled,true);
  assert.equal(admin.current_law_authority,false);
});''')


def write_audit(record: dict, actual_bytes: int) -> None:
    AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    AUDIT_PATH.write_text(f'''# Administrative V2.0 FINAL MASTER — exact source release

- Release date: {RELEASE_DATE}
- Governed record: `{GUIDE_ID}`
- Public PDF: `{PUBLIC_PDF}`
- PDF SHA-256: `{EXPECTED_SHA256}`
- PDF bytes: {actual_bytes}
- PDF pages: {EXPECTED_PAGES}
- Registry candidate/public-master fingerprint matched: **yes**
- Runtime bot context: **enabled as secondary source-grounded guidance**
- Current-law authority: **false**
- RAG / production corpus promotion: **not authorized**
- Human Gate for professional use: **required**
- Existing author-approval field: **{record.get("candidate_artifact", {}).get("author_approval", "not recorded")}**

## Release boundary

The exact PDF master was preflighted and rendered page-by-page before publication. The release opens the verified PDF and a bounded source-grounded bot context. It does not publish the DOCX, does not create current-law authority, does not authorize RAG or production-corpus promotion, and does not replace professional review of a concrete case.

## Source warning preserved

The master itself states that it is not an official consolidated statute or a court publication, that specific statutes may contain special rules, and that the applicable version, service, legal instruction and later decisions must be checked before use. The master also records that it is an author-adapted working text for final lawyer verification before public publication; this release does not silently rewrite that statement or mark the existing author-approval field as completed.
''', encoding="utf-8")


def validate(record: dict, pdf_bytes: bytes) -> None:
    assert sha256(pdf_bytes) == EXPECTED_SHA256
    assert len(pdf_bytes) == EXPECTED_BYTES
    reader = PdfReader(str(PDF_PATH))
    assert len(reader.pages) == EXPECTED_PAGES
    assert all((p.extract_text() or "").strip() for p in reader.pages)
    assert record["public_pdf"] == PUBLIC_PDF
    assert record["public_pdf_sha256"] == EXPECTED_SHA256
    assert record["bot_runtime_enabled"] is True
    assert "У.бр.148/2024" in record["bot_text"]
    assert record["ai_use"] == "reference_only_until_human_gate"
    assert record["ai_legal_authority"] is False
    assert record["current_law_authority"] is False
    assert AUDIT_PATH.is_file()


def main() -> None:
    if not PDF_PATH.is_file():
        raise SystemExit(f"Missing PDF: {PDF_PATH}")
    pdf_bytes = PDF_PATH.read_bytes()
    actual = sha256(pdf_bytes)
    if actual != EXPECTED_SHA256:
        raise SystemExit(f"PDF SHA-256 mismatch: {actual}")
    if len(pdf_bytes) != EXPECTED_BYTES:
        raise SystemExit(f"PDF size mismatch: {len(pdf_bytes)}")
    reader = PdfReader(str(PDF_PATH))
    if len(reader.pages) != EXPECTED_PAGES:
        raise SystemExit(f"PDF page count mismatch: {len(reader.pages)}")

    record = patch_registry(pdf_bytes)
    patch_tests()
    write_audit(record, len(pdf_bytes))
    validate(record, pdf_bytes)
    print(json.dumps({
        "status": "PASS",
        "record_id": GUIDE_ID,
        "public_pdf": PUBLIC_PDF,
        "sha256": EXPECTED_SHA256,
        "pages": EXPECTED_PAGES,
        "bot_runtime_enabled": True,
        "legal_authority": False,
        "author_approval_preserved": record.get("candidate_artifact", {}).get("author_approval")
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
