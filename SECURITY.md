# Security Policy

AI Advokat is a public legal-information and research portal. Please do not submit confidential client material, credentials, access tokens, private case files, or other sensitive data through public issue trackers or public forms.

## Reporting a vulnerability

Report suspected security vulnerabilities privately by email:

- aiadvokat16@gmail.com
- aiadvokat@outlook.com

Please include the affected URL, a concise description, reproducible steps where safe, and the potential impact. Do not include real client data or exploit third-party systems.

## Current public-safety posture

- Public APIs are read-only.
- Document upload and case workspaces remain locked until authentication, encrypted storage, retention controls, and access governance are implemented.
- Cross-origin access is restricted to approved origins.
- Static Worker responses are hardened with CSP, anti-framing, content-type, referrer, permissions, transport, and cross-origin headers.
- Publication links expose public Zenodo records only; private Zenodo draft/editor URLs are not permitted in the public portal.
