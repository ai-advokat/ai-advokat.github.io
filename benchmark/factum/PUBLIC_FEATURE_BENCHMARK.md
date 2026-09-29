# Factum public-feature benchmark for AI Advokat

Date: 2026-09-29
Mode: CLEAN-ROOM PRODUCT BENCHMARK
Source boundary: public marketing/product pages only

## Hard boundary
Factum's public Terms prohibit automated mass extraction/indexing and reverse engineering without permission. Therefore:
- do not crawl or copy its proprietary legal corpus;
- do not attempt to discover private prompts, algorithms, source code, embeddings or customer data;
- do not bypass subscriptions or authenticated application surfaces;
- use public feature descriptions only as competitive product requirements;
- implement independent equivalents from primary legal sources.

## Publicly described capabilities

### 1. Consolidated national legislation
- consolidated law across 28 European jurisdictions
- national legislation + EU law
- bylaws
- article-level citation
- current/in-force version focus
- source attached to each legal proposition

AI Advokat clean-room target:
- MK-first official consolidated/current-text corpus
- article-level chunks
- version/effective-date awareness
- exact official Gazette/LDBIS provenance
- explicit fail-closed on uncertain current version

### 2. Court decision search
- contextual search across judgments
- selected decisions by legal issue
- key decision elements in structured/table view

AI Advokat target:
- Supreme/Constitutional/ordinary court source ingestion where public
- court, case number, date, legal area, provisions, outcome
- contextual retrieval + evidence matrix
- original-decision citation

### 3. Legal document generation
- natural-language document drafting
- clause editing
- legal explanation of selected text
- clause-to-current-law validation

AI Advokat target:
- governed document composer
- clause-by-clause source validation
- Human Gate before export/use
- no confidential uploads until auth + R2 + retention controls

### 4. Projects / private document grounding
- PDF, Word, Excel, scanned docs, images
- summarization and relationship mapping
- multimodal processing

AI Advokat target:
- authenticated private workspaces only
- segregated R2/private D1 metadata
- per-workspace authorization
- no mixing private material into public corpus

### 5. Web research
- live web search
- combines web results with consolidated law
- source citations
- manual/hybrid/automatic modes

AI Advokat target:
- source-first web research
- official-source boost
- public-web provenance
- separate web evidence from binding law

### 6. Hybrid mode
Public site describes Manual, Hybrid and Automatic working modes.

AI Advokat target:
- Manual: user-selected sources
- Hybrid: corpus retrieval + governed web research
- Automatic: future only after evaluation and Human Gate controls

### 7. Table / advanced analysis
- tabular analysis of decisions/data

AI Advokat target:
- case-law matrix
- evidence matrix
- chronology
- obligation/deadline table
- article-version diff

### 8. Microsoft Word integration
- research from selected paragraph
- article/source returned in Word
- citation insertion at cursor
- clause checks against current law

AI Advokat target:
- later Office add-in / document export integration
- no dependency on proprietary Factum implementation

### 9. MCP server
- connections to Claude, ChatGPT, Gemini, Copilot
- OAuth 2.1 or personal API key
- three public-described tools: legislation search, court decision search, smart decision search
- subscription-scoped jurisdiction access

AI Advokat target:
- future governed MCP server
- tools: legislation.search, case_law.search, source.verify, article.get_current
- OAuth/API token with revocation
- jurisdiction and corpus policy enforcement

### 10. MCP client
Public product page advertises connection to Gmail, Drive, Outlook or other MCP servers.

AI Advokat target:
- connector/plugin layer only with explicit authorization
- never merge private connected-app data into public legal corpus

### 11. Security posture
Public claims include:
- ISO/IEC 27001:2022
- EU hosting
- Row Level Security
- incident notification
- DPO contact
- GDPR posture

AI Advokat target:
- separate tenant/private data
- least privilege
- audit trail
- access-control review
- retention policy
- no security certification claim unless independently obtained

## Priority implementation order for AI Advokat
1. Current consolidated MK law corpus
2. Article-level retrieval with exact source
3. Court decision search
4. Version/amendment comparison
5. Citation audit
6. Legal document composer
7. Private projects/workspaces
8. Live web research
9. Table/evidence analysis
10. Word integration
11. MCP server
12. MCP client

## Competitive principle
AI Advokat should not clone Factum. It should independently implement equivalent problem-solving capabilities using authoritative source provenance, Human Gate governance and transparent version history.


## Additional public signals captured on 2026-09-29

Factum publicly describes the following additional product principles:

### Primary-source answer rule
- when a controlling legal article exists, the answer should come from the primary legal text rather than general model memory;
- each legal proposition should resolve to the supporting article;
- legislation, case law and web evidence should remain distinguishable source classes.

**AI Advokat acceptance criterion:**  
If a verified current article exists for a proposition, the system must ground the answer in that article and must not rely on uncited model memory for the controlling rule.

### Current consolidated text as starting point
- current consolidated text is presented as the starting point for research;
- amendments are incorporated into the version in force;
- the user can inspect the amendment history.

**AI Advokat acceptance criterion:**  
Research starts from the verified current article version, with full amendment lineage available separately. Historical versions remain accessible by date.

### Visible amendment history
- public product text emphasizes visible amendment history.

**AI Advokat acceptance criterion:**  
Every current article should expose:
- source enactment;
- amendment events;
- effective/application dates;
- Constitutional Court effects;
- predecessor/successor version links;
- current verification status.

### Multi-jurisdiction comparison
- one or multiple jurisdictions can be selected;
- multiple jurisdictions can be compared in one answer;
- EU law can be read alongside national law.

**AI Advokat acceptance criterion:**  
Comparative answers must return parallel jurisdiction blocks, each with:
- jurisdiction;
- controlling instrument;
- article;
- effective version/date;
- official source;
- short comparison note.

No cross-jurisdiction rule may be silently transplanted into North Macedonian law.

### User-language interface
- users can ask in their own language while the cited article remains traceable to the enacted text.

**AI Advokat acceptance criterion:**  
The explanation may be translated/localized, but the authoritative source text and language must remain identifiable.

### Jurisdiction scale benchmark
Factum publicly states coverage of 28 jurisdictions.

This is a **coverage benchmark**, not a corpus source. AI Advokat should expand in phases:
1. North Macedonia;
2. Balkans / former Yugoslav jurisdictions;
3. EU + ECHR;
4. common-law jurisdictions;
5. wider international/comparative law.

## Retrieval acceptance tests inspired by the public benchmark

The legislation engine should fail evaluation if:
- a current answer cites only a historical version when a verified current version exists;
- an article citation does not open to the supporting article;
- amendment history is unavailable for a changed article;
- national law and EU law are merged without source labels;
- a comparative answer omits jurisdiction-specific sources;
- a controlling rule is produced from general model memory despite an available verified primary source.
