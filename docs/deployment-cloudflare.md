# Cloudflare + Meta setup

Checked 2026-10-09 against [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/), [Workers KV](https://developers.cloudflare.com/kv/get-started/), [Wrangler KV commands](https://developers.cloudflare.com/workers/wrangler/commands/kv/), and [Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

## What is configured in this repository

- Worker name: `offline-social`.
- Entrypoint: `worker/index.ts`.
- Static Vite build: `dist/`, SPA fallback enabled.
- API routes run in the Worker before static asset fallback.
- `APP_KV` binding uses separate namespaces for production and preview.
- Graph API version is `v26.0` in `wrangler.toml`; recheck Meta’s API lifecycle before upgrading.
- App secrets are intentionally absent from the repository.

The connected Cloudflare account now has empty namespaces:

- Production `offline-social-production`: `912952e853ef4bbc83f67fb8660925a6`
- Preview `offline-social-preview`: `8906ba938607477d8800c6d2c85721df`

The IDs are bindings, not credentials. Production and preview must use different namespaces and secrets.

## Configure a Meta developer app

1. In [Meta for Developers](https://developers.facebook.com/), create a Business app and add the Instagram API with Instagram Login.
2. Register your app’s production OAuth callback exactly as `https://YOUR_WORKER_HOST/api/instagram/callback`. For local Worker testing, use `http://localhost:8787/api/instagram/callback` only if Meta accepts the redirect and the browser can retain the secure cookie; HTTPS preview is the reliable test setup. The Worker validates same-origin callback host and exact `/api/instagram/callback` path.
3. Add the production host to the Meta app’s allowed domains. Publish a privacy notice and user-data deletion instructions/URL before review. Supply your own legal text and domain; this repository does not invent a public privacy URL.
4. Add your Instagram **professional** account as an app tester/role in Meta and accept the invitation from that account. Meta dashboard labels can change; use the current app-role/test-user documentation.
5. This release requests `instagram_business_basic` only. Test the profile and own-media calls in Development mode. To let people outside app roles connect, complete Meta’s applicable App Review/Advanced Access. Messaging and publishing permissions are not requested or enabled by this release.

Meta’s official [Instagram Login collection](https://www.postman.com/meta/instagram/folder/1z5vxzu/instagram-api-with-instagram-login) says the flow is for Business and Creator accounts and does not require a linked Facebook Page. Private consumer accounts cannot be connected. A switch from personal/private to professional may require making the profile public; keep it private if that is important, and do not connect it through an unofficial method.

## Configure Cloudflare

1. Confirm the Workers project is connected to `charliemaplethorpe99-spec/offline-social`, branch `main`. Use `pnpm install --frozen-lockfile && pnpm build` as the build command and `pnpm deploy` as the deploy command. Keep pull-request/branch builds in preview and `main` as production.
2. If binding the namespaces manually in the dashboard, add KV binding `APP_KV` and select the production namespace for production and preview namespace for previews. The repository already declares both in `wrangler.toml`.
3. Configure these Worker variables/secrets separately for production and preview. Use Cloudflare’s secret interface (values are hidden after setting):

   - `META_APP_ID`: Meta app ID.
   - `META_APP_SECRET`: Meta app secret (secret).
   - `META_REDIRECT_URI`: exact callback URL for that environment, e.g. `https://YOUR_WORKER_HOST/api/instagram/callback`.
   - `APP_SESSION_SECRET`: random, unique signing key.
   - `TOKEN_ENCRYPTION_KEY`: base64 encoding of 32 cryptographically random bytes; store separately from the Meta app secret.
   - `APP_BASE_URL`: optional same-origin base URL used for callback messages.

   Generate keys locally with Node.js, then enter the printed values directly into Cloudflare Secrets. Do not commit the outputs:

   ```sh
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))" # APP_SESSION_SECRET
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" # TOKEN_ENCRYPTION_KEY
   ```

   Cloudflare documents `pnpm wrangler secret put KEY` and dashboard-managed secrets. Setting a secret can deploy a Worker version immediately; coordinate this with the production branch.

4. Add the Worker’s `workers.dev` hostname or a custom domain. Set the same exact host in Meta’s OAuth callback and `APP_BASE_URL`. HTTPS is required for production secure cookies.
5. Verify the deployed `GET /api/health` response reports `instagramLoginConfigured: true`. Then sign in using a Meta app-role professional test account and verify `GET /api/instagram/status` is connected and My updates displays that account’s own media.
6. For production, merge/push to `main`, wait for the Worker build, then check the deployed site and OAuth callback. Do not treat a successful static deployment as proof that Meta has approved the app.

## Local Worker testing

Create a local KV namespace or use Wrangler’s local KV persistence, then create `.dev.vars` (never commit it) with safe test/development credentials:

```text
META_APP_ID=...
META_APP_SECRET=...
META_REDIRECT_URI=http://localhost:8787/api/instagram/callback
APP_SESSION_SECRET=...
TOKEN_ENCRYPTION_KEY=...
APP_BASE_URL=http://localhost:8787
```

Run `pnpm exec wrangler dev`. If OAuth cookies are rejected on the local HTTP origin, test on the HTTPS preview deployment instead. Do not weaken production cookie settings to work around local browser behavior.

## Embedding

The app uses a restrictive `frame-ancestors 'none'` header by default. Use a direct link or same-site subdomain for reliable sign-in. If embedding becomes a real requirement, change the allowlist to the exact parent domain(s), then test OAuth as a top-level redirect in the actual browser. Do not use wildcard framing or depend on third-party cookies.

## Disconnect, revoke, rotate, and delete

- In Settings, **Disconnect Instagram** deletes the app’s KV token/session and expires its cookie.
- The user can revoke the app in Instagram’s connected-app permissions. This release does not implement Meta’s deauthorization webhook or data-deletion callback; production review must not claim those are present.
- To rotate secrets, set new Worker secrets, redeploy, and disconnect/reconnect accounts if token encryption key changed. Changing `TOKEN_ENCRYPTION_KEY` makes existing ciphertext unreadable; remove affected KV session records before/after rotation.
- The Worker stores no messages or media. If more data types are added, implement a complete delete-data flow before shipping them.

## Quotas

Cloudflare’s [Workers static-assets billing docs](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) say static asset requests are free/unlimited while requests that invoke Worker code count against Workers quotas; confirm current Free-plan request/CPU limits in Cloudflare’s [limits docs](https://developers.cloudflare.com/workers/platform/limits/). This app does not poll; each explicit profile/media action invokes a bounded API call.
