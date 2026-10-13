# Article-by-article chunking for every Gazette issue

## Core doctrine
Every legal act is decomposed as **Issue → Act → Article → Paragraph → Item → Chunk**.

The article is the primary semantic/legal boundary. Paragraphs and items remain addressable. A chunk may overlap only for retrieval continuity; it may never erase or blur the legal locator.

## Chunking rules
- Prefer one whole article when it fits the target size.
- If an article is long, split on paragraph boundaries first.
- If a paragraph is long, split on item/sentence boundaries.
- Keep article/paragraph/item numbering on every chunk.
- Store official issue number, issue date, source URL, source page, SHA-256 and instrument/version metadata with every chunk.
- Do not stitch text from different legal versions into one chunk.
- Do not mark a chunk current-law eligible unless version reconciliation and Human Gate have passed.

## Bot doctrine
The AI Advokat Bot may retrieve only chunks with runtime_eligible=1 and reviewed/approved Human Gate status. A historical Gazette chunk can be used as historical evidence, but not silently represented as current law. Current-law claims require current_law_eligible=1 plus the normal primary-source and version gates.

## Desired answer shape
For a legal question, the bot should be able to return exact Gazette issue/date; exact act and article/paragraph/item; source-faithful context; what changed; effective date versus application date; practical consequence; official source link; and Human Gate/current-law status.

## Completion
The bot is not considered fully loaded merely because the schema exists. Full readiness requires actual issue ingestion, chunk reconciliation, review status, production migration, runtime smoke tests and retrieval QA across the whole historical range.
