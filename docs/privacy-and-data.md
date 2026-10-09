# Privacy and data

## Data currently handled

When Instagram Login is configured and a user authorizes it, the Worker receives a short-lived authorization code and exchanges it with Instagram. It then stores only a minimal account record and an AES-256-GCM encrypted long-lived access token in the bound Cloudflare KV namespace. The browser receives username/account type and an opaque signed `HttpOnly; Secure; SameSite=Lax` session cookie; it never receives the Instagram access token.

KV stores one-time OAuth state for at most 10 minutes and a session/token record for at most 60 days (the token’s expiry). On disconnect, the session record is deleted. The app does not persist Instagram media, captions, conversations, uploaded media, or local drafts. The user’s media is returned to the browser only for the requested page and is not cached by the Worker (`Cache-Control: no-store`).

The demo inbox is fictional fixture data bundled in the frontend. A demo reply exists only in React memory and clears on refresh. It is not sent to Meta.

## Security boundary

- OAuth state is random, stored server-side, one-time and compared with an HttpOnly cookie.
- The OAuth callback URI is fixed by the server binding and must be same-origin `/api/instagram/callback`.
- The authorization-code exchange and long-lived-token exchange occur in the Worker.
- Tokens are encrypted with AES-GCM using `TOKEN_ENCRYPTION_KEY`, stored separately from the app secret, and never logged or sent in API responses.
- Session IDs are random and HMAC-signed with `APP_SESSION_SECRET`.
- API endpoints are same-origin; state-changing disconnect checks the `Origin` header.
- Never add private message bodies, IDs, tokens, or authorization codes to logs, analytics, URLs, browser storage, or error-reporting tools.

## User controls and outstanding production obligations

Disconnect deletes this app’s encrypted token record and expires the browser session cookie. It does not itself revoke the grant inside Instagram; users can also revoke access in Instagram’s settings.

Before public launch, publish a plain-language privacy notice and Meta-compliant data-deletion instructions/callback. This release does **not** implement Meta deauthorization webhooks or data-deletion callback endpoints. Do not claim those obligations are complete. Implement, verify and document the current callback formats before requesting production App Review.

There is no separate “delete app data” path beyond disconnect yet because the app stores no other user-linked records. If future features persist DMs/media or add databases/object storage, define retention and deletion before enabling them.
