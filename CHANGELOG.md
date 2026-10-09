# Changelog

## 0.2.0 — 2026-10-09

- Added Cloudflare Worker routes for official Instagram Login, one-time OAuth state validation, server-side token exchange, encrypted token storage, signed HttpOnly sessions, disconnect, and bounded own-media retrieval.
- Added live account-owned media cards and explicit “Load 10 more posts” behavior; demo inbox/publishing remain clearly labeled as non-live.
- Added separate Cloudflare production and preview KV namespace bindings.
- Updated setup, capability, architecture, privacy, and testing docs for the implemented boundary and Meta account limitations.
- Added mocked Worker OAuth/API tests and Wrangler dry-run CI validation.
- Refreshed the responsive design with Instagram-inspired gradients and translucent glass surfaces while retaining distinct navigation and no discovery feed.

## 0.1.0 — 2026-10-09

- Created a responsive demo inbox and local-only create flow.
- Added plain-language Instagram API capability disclosures, bounded message history, no-discovery navigation, and strict static-host security headers.
