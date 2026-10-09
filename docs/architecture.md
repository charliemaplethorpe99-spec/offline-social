# Architecture

## Current implementation

- Vite + React + TypeScript static frontend, built to `dist` and suitable for Cloudflare Pages.
- `src/domain.ts` contains small deterministic helpers for account/permission capability checks, strict Instagram URL validation, and bounded page sizes.
- The Inbox and shared-Reel card use explicitly fictional demo fixtures from `src/domain.ts`. User replies are held only in component memory, never sent to a server, and reset on refresh.
- My updates explains that a general followed-accounts feed and arbitrary third-party Stories/Reels are unavailable.
- Create only previews a local filename/caption and explicitly states no upload or publication takes place.
- There is no backend, OAuth callback, API token, database, webhook, session cookie, or external analytics in this version.

## Intended live boundary

The browser must never receive a Meta app secret or long-lived Instagram token. A future Pages Function/Worker should own the OAuth callback, validate one-time state (and PKCE where supported by the selected flow), exchange authorization codes server-side, map account identity, authorize every operation against the server session, and call only documented Meta endpoints. Permission requests should be feature-gated and minimal. Callback origins/redirect URIs must be allowlisted; state-changing routes need CSRF defenses and throttling. Never log tokens, auth headers, message bodies, or private media.

If token persistence becomes necessary, use D1 only for minimal account/session metadata and encrypted token ciphertext, with a separately managed encryption key in a Cloudflare secret. Add migrations, expiry/cleanup, data deletion, deauthorization and Meta data-deletion callbacks before enabling any real account data. Do not store DM bodies or downloaded media by default. This architecture is a future integration boundary, not code that is present today.

## Bounded interaction

No feed is implemented. Conversation list search filters the finite fixture set. Message history initially displays a finite batch and requires the explicit “Load earlier messages” control. There is no scroll observer that fetches more content, no auto-play media element, and no automatic next-item transition. `boundPageSize` caps future API page sizes at 50. Autoplay is always disabled.

## Trust boundaries

All demo text is local fixture/user text and is rendered through React text nodes. Any future external URL must pass an HTTPS Instagram-host check (the current `safeInstagramUrl` helper does this for the demo). Production API response schemas, HTML, IDs, cursor values, file uploads and webhook signatures still need server-side validation; they are not covered by the current static demo.

## Hosting and embedding

Use Cloudflare Pages Git integration for static assets. There is no need for D1/KV/R2 or a Worker today. `_headers` denies framing by default. A production embed requires a known explicit parent-origin allowlist, a separate OAuth top-level flow, and testing in the real host-page context; do not use wildcard `frame-ancestors` or depend on third-party cookies.
