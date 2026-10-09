# Testing

Run:

```sh
pnpm test
pnpm build
pnpm run worker:typecheck
pnpm run deploy:check
```

`src/domain.test.ts` covers capability gating, safe Instagram URLs, and bounded pagination. `src/App.test.tsx` covers no discovery navigation, demo labeling, explicit earlier-message loading, no autoplay, local-only demo replies, account disclosure, and publishing remaining a local draft. `worker/index.test.ts` uses mocked Instagram token/profile/media responses to verify state validation, server-side token exchange, encrypted-at-rest token data, token redaction from browser responses, media retrieval, configuration gating, and same-origin disconnect protection.

All automated credentials are fake; no real Instagram messages or posts are sent. A mocked successful authorization is not evidence of Meta approval or live API availability.

Manual checks still required: configure a Meta app and eligible test account; test OAuth in an HTTPS browser; verify the current Meta permission access level; check mobile/keyboard/screen-reader behavior; and verify GitHub-to-Cloudflare deployment. Messaging, publishing, webhook deletion/deauthorization callbacks, and App Review are not covered because those live capabilities are not implemented.
