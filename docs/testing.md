# Testing

Run `pnpm test` and `pnpm build`. Tests use fake local fixtures only. They cover professional-account/permission capability gating, bounded page-size helpers, Instagram URL allowlisting, the absence of discovery navigation/autoplay, explicit earlier-message loading, local demo reply feedback, and the connection disclosure/consent gate.

No OAuth callback, Meta API client, database, webhook, token encryption, publishing state machine, real message send, or deletion flow exists in this build; therefore those live/security integration tests cannot honestly pass yet. Meta app review, test-account API calls, actual mobile browser/assistive-technology testing and Cloudflare deployment remain manual steps. No real messages or publishes are sent during automated tests.
