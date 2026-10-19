# ZKP Commentary v6 — portal integration

Date: 2026-10-19

## Purpose

Register the **Коментар на Законот за кривичната постапка · Верзија 6** by Attorney Zoran Stojankich as a governed secondary professional layer in AI Advokat.

## Boundary

1. The existing governed ZKP statutory corpus remains the controlling law layer.
2. The Commentary is **authorial analysis**, not a primary legal source.
3. AI retrieval order is: statutory article → attributed commentary → separately verified case law → labelled AI synthesis.
4. Professional reliance remains subject to Human Gate.
5. Canonical brand is **AI Advokat / АИ АДВОКАТ**. The generation suffix “4” is removed by the normalisation script.

## Delivered source identity

- DOCX SHA-256: `834e9d6fea81cd3c8b3f4fb30bb76186dc199680f60b464a3b9a82457560a3dd`
- JSONL SHA-256: `5a6a691cf616599c1648ab9749a34d388f7c4b5fea8b49ecfd3b4f409903c363`
- JSONL records: **570**

## Portal state in this change

- Registered in `data/professional-library.json`.
- Registered in publication governance and the professional legal corpus.
- Added a machine-readable manifest.
- Added central-prompt source-separation rules.
- Production RAG write remains fail-closed until a separate import Human Gate and read-back verification.
