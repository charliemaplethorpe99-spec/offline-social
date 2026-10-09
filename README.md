# Offline Social

A calm, mobile-friendly companion for intentional Instagram check-ins. The app has an official Instagram Login flow for eligible professional accounts, a bounded view of the connected account’s own media, and a clearly labeled local demo inbox. The interface uses translucent “liquid glass” panels with Instagram-inspired gradients, without copying Instagram’s discovery/feed loops.

## Capabilities and limitations

- Official Instagram Login supports **Business and Creator** accounts. It does not support an ordinary personal/consumer account. Instagram Login does not require a linked Facebook Page. Instagram professional accounts are public; keeping an account private means it cannot be connected through this API.
- The official API does not provide a general feed of posts from accounts the user follows. My updates shows only media the connected professional account owns and the API returns.
- The app cannot browse arbitrary people’s Stories or Reels, and cannot remove Instagram’s own Reels tab.
- The Inbox remains demo data in this release. Reading/sending live messages needs a separate permission, supported conversation rules, app configuration, and Meta review. No demo message is sent to Instagram.
- Publishing remains a local draft. Live publishing requires additional permissions and documented upload/container workflows; no draft is reported as published.
- Shared Reels may be returned as a URL only. They are not guaranteed playable in this app.
- Demo mode is visibly labeled and does not claim that a real Instagram connection exists.

See [the capability matrix](docs/instagram-capabilities.md) for the API model, scopes, account limits, and official sources.

## Local development

Prerequisites: Node.js 20+ and pnpm.

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
```

The Vite dev server serves the UI. To exercise Worker routes locally, configure the Cloudflare KV binding and Worker secrets in `.dev.vars` (copy safe names from `.env.example`) and run `pnpm exec wrangler dev`; do not commit `.dev.vars`.

## Configure Meta and Cloudflare

Follow [docs/deployment-cloudflare.md](docs/deployment-cloudflare.md). In short:

1. Create a Meta developer app and enable the Instagram API with Instagram Login.
2. Configure the exact callback URL `https://YOUR_WORKER_HOST/api/instagram/callback` in Meta.
3. Create production and preview KV namespaces and put their IDs in `wrangler.toml`.
4. Set `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `APP_SESSION_SECRET`, and `TOKEN_ENCRYPTION_KEY` as Cloudflare Worker secrets/bindings.
5. Test using a professional account assigned to the Meta app. For users outside app roles, request the relevant Meta permissions/review.
6. Deploy the `main` branch through the connected Cloudflare Worker build.

The worker requests only `instagram_business_basic` in this release. It keeps the long-lived token encrypted server-side, exposes an opaque signed HttpOnly session cookie, and displays account-owned media in manually loaded batches of up to 10 items. It does not request message or publishing permissions.

## Privacy and security

- Instagram passwords are entered only on Instagram/Meta pages.
- OAuth state is random, short-lived, one-time, and checked against an HttpOnly cookie.
- Meta code exchange occurs in the Worker. Access tokens are AES-256-GCM encrypted before storage in KV and never returned to browser JavaScript.
- Sessions are signed, HttpOnly, Secure, SameSite=Lax cookies. Disconnect removes the Worker session record.
- API responses use no-store caching. The app does not persist messages, user media, or draft uploads.
- Read [docs/privacy-and-data.md](docs/privacy-and-data.md) before production use. Meta app review requires a public privacy/data deletion URL; add and publish those pages before requesting broad access.

## Build and tests

```sh
pnpm test
pnpm build
```

Tests use mocked Meta responses and fake tokens only. They do not send real messages or publish real content. A mocked OAuth test is not proof of Meta app approval; a real test-account authorization is still required.

## Project notes

- [Architecture](docs/architecture.md)
- [Instagram capabilities](docs/instagram-capabilities.md)
- [Cloudflare deployment](docs/deployment-cloudflare.md)
- [Privacy and data](docs/privacy-and-data.md)
- [Testing](docs/testing.md)

## Current external setup needed

The repository now contains the OAuth and profile-media integration, but it cannot sign a real user in until the owner supplies their own Meta app ID/secret, configures Instagram Login and the callback URL, and binds Cloudflare KV. Meta may require app-role testing or App Review/Advanced Access. The app remains in demo mode until those settings exist.
