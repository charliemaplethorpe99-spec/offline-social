# Architecture

## Runtime

- React + TypeScript + Vite builds the responsive static UI to `dist/`.
- Cloudflare Workers Static Assets serves the UI. `worker/index.ts` handles `/api/*` in the same origin.
- Cloudflare KV (`APP_KV`) stores single-use OAuth state and encrypted session/token records with TTLs. No D1, R2, message archive, or public media storage is used.
- Instagram API with Instagram Login calls use the configured `IG_API_VERSION` on `graph.instagram.com`.

## OAuth and sessions

1. The user reads account eligibility and limitations, checks consent, and selects **Connect Instagram**.
2. `/api/instagram/login` redirects to Instagram’s official OAuth page with only `instagram_business_basic`, an exact callback URI, and random `state`. The state is stored in KV and correlated with a short-lived HttpOnly cookie.
3. `/api/instagram/callback` consumes the one-time state, exchanges the authorization code server-side, exchanges the short-lived token for a long-lived token, and validates the returned `/me` identity.
4. The Worker encrypts the token using AES-GCM under `TOKEN_ENCRYPTION_KEY`, writes a minimal record into KV, and returns an HMAC-signed opaque `HttpOnly; Secure; SameSite=Lax` cookie.
5. API requests resolve that session server-side. `/api/instagram/media` caps a request at 15 records (the UI requests 10) and exposes a cursor only for explicit “Load more”.
6. Disconnect deletes the KV session and expires the cookie.

Instagram Login’s current official instructions do not document PKCE parameters for this flow; this implementation uses one-time state and server-side code exchange. It does not add speculative OAuth parameters. Verify Meta’s current docs before changing the flow.

## Capability boundary

The only live API operation currently implemented is basic profile/account-owned media retrieval. The Inbox fixtures and publishing draft are demo-only. The integration intentionally does not request message, comments, insights, or publishing scopes. No general followed-account feed, arbitrary Stories, Reels discovery, or personal-account login is implemented.

## Session limits and private data

The media endpoint bounds page size and never automatically retrieves a next cursor. Media is not mirrored or cached by the server. API responses set `Cache-Control: no-store`. The browser receives only data required to render the current view; it never receives an access token or app secret.

## Security boundaries and known gaps

- Protect app ID/secret and encryption/session keys as Worker bindings; never use `VITE_*` names.
- OAuth callback origin and path are checked against the configured request host.
- Disconnect checks same-origin requests. The API has no public CORS access.
- No webhook, message send, publishing, Meta deauthorization callback, or Meta data-deletion callback is implemented yet.
- Cloudflare KV is eventually consistent. It is adequate for this single-account session use case, but do not use it as a message queue or cross-region lock.
- Production requires real test-account authorization, app review decisions, callback/domain configuration, a published privacy notice, and Meta-required deletion handling.
