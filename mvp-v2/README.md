# AI ADVOKAT 4 — MVP v2 isolated integration

Status: TEST ONLY / WORKING / NO PRODUCTION

This integration layer is intentionally stacked on Draft PR-C, which is itself stacked on Draft PR-B.

Pinned dependencies:
- PR-B HEAD: `f649672172e5b558f5f89084684949cc5590ca0b`
- PR-C HEAD: `f106b3da14671828d0b8eaa6b2a1308ccf5b0b66`

## What this v2 proves

- the MVP v1 dossier is mapped into the PR-B Legal Document AST;
- required fields fail closed;
- PR-B produces Court Report and Internal Review Annex structures;
- PR-C produces the WORKING Court DOCX and separate Review Annex DOCX;
- the client cannot approve Human Gate: server state is forced to `pending`;
- `PROFESSIONAL` export is expected to fail closed;
- one complete synthetic labour case can be exercised from input to Word.

## What it does not do

- no GPT/provider call;
- no current-law verification;
- no upload/content extraction from real documents;
- no production API;
- no database/migration/secrets;
- no filing/signature/transmission;
- no real client data;
- no merge/deployment.

## Local test

From a checkout of the MVP-v2 integration branch, double-click `mvp-v2/START_MVP_V2.bat` on Windows, or run:

`node mvp-v2/server.mjs`

Then open `http://127.0.0.1:4174/`.

Use **Вчитај пример → Анализирај предмет → WORKING Word**.

The **Тест PROFESSIONAL блокада** button must return a PASS message proving that the server-side Human Gate remains closed.
