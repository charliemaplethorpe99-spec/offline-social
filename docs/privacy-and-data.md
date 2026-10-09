# Privacy and data

## Current demo

- No Instagram account data is requested or received. The fictional inbox fixtures are bundled in the frontend source.
- Draft image files are not uploaded or retained by this app; only the browser’s selected filename is shown. Draft caption, replies, settings and connection-demo state live only in component memory. Refreshing the page clears them.
- No analytics, advertising, model training, backend logging, database, cookies, local storage, or message synchronization is present.
- Demo “send,” “publish,” and “connect” actions never contact Instagram. The interface explicitly says so.
- “Clear local app data” resets local React state for this page session.

## Before a live launch

Publish a privacy notice and retention schedule on the production domain. Map every field, purpose, retention window, processor, and deletion path. Keep tokens server-side; encrypt persisted token data with a separate Cloudflare secret key; do not store DM bodies or media unless a feature needs them. Define token expiry/refresh, revocation, deauthorization callback, Meta-required data deletion callback, and user-visible disconnect/delete flows. Verify those operations delete all associated D1 rows, objects, sessions, and caches. Avoid third-party analytics that can capture private identifiers/content.

The current demo does not implement account disconnection, Meta revocation, deletion callbacks or OAuth; it has no connected-account data to revoke or delete. Do not present it as production-ready privacy compliance.
