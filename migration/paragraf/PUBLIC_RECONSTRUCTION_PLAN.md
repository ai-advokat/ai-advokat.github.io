# Paragraf public reconstruction plan

Status: STAGING-ONLY CLEAN-ROOM RECONSTRUCTION

## Objective
Recreate the verifiable public Paragraf experience inside the AI Advokat architecture without claiming recovery of inaccessible private/backend data.

## Public functionality to reconstruct
1. Legal AI landing/assistant entry point
2. Legal research / source-first search entry
3. Legal document generator shell
4. Outcome/risk analysis shell
5. File-upload entry point (locked until secure R2/auth controls exist)
6. Cases workspace entry point (locked until authentication/private-storage controls exist)
7. Web-search capability indicator (governed and source-cited only)
8. Pricing/plan presentation as historical Paragraf reference only; no billing migration
9. Use-cases pages
10. Security page
11. Blog/resources shell
12. FAQ
13. Documentation
14. About
15. Terms
16. Privacy
17. Careers
18. Separate chat surface mapping

## What will NOT be reconstructed from assumptions
- user accounts
- passwords/sessions
- payment subscriptions
- private case files
- chat history
- uploaded client documents
- private prompts
- hidden legal corpus
- embeddings/vector indexes
- admin records
- API keys/secrets
- audit logs

## Target implementation states
- PUBLIC LIVE: static public information and navigation
- GOVERNED PREVIEW: legal AI/research interfaces using only verified AI Advokat sources
- LOCKED: private documents, cases, uploads, billing and account migration
- FUTURE IMPORT: any authoritative Paragraf backup recovered later

## Data protection rule
No publicly crawled page may be treated as permission to recover or infer private data. Public content may be reconstructed only as public content.

## Cutover rule
paragraf.mk remains unchanged. No DNS redirect or domain cutover until the reconstructed staging surface passes route parity, security review and Human Gate approval.
