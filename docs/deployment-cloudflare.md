# Cloudflare Workers deployment

**Docs checked:** 2026-10-09. This repository uses the existing Cloudflare Workers Static Assets deployment path. The Vite build is served from `dist` using SPA fallback in `wrangler.toml`. No Worker API, OAuth callback, database, webhook, Meta secrets, or Cloudflare account is configured.

## GitHub → Workers Builds

1. Connect the GitHub repository to Cloudflare Workers Builds and select the repository/root directory.
2. Use build command `pnpm install --frozen-lockfile && pnpm build` and deploy command `pnpm exec wrangler deploy`. Keep `pnpm-lock.yaml` committed.
3. `wrangler.toml` sets the Worker name to `offline-social`, compatibility date to `2026-10-09`, asset directory `./dist`, and SPA fallback. Configure the production branch as desired and enable preview builds for non-production branches / pull requests.
4. Check the build status in GitHub and the deployment URL in Cloudflare. Add a `workers.dev` or custom domain to the Worker and complete DNS/TLS setup. Supply your own domain values; none were available in this task.

## Free plan and bindings

Official Cloudflare docs checked 2026-10-09 list Workers Free at **100,000 requests/day** and **10 ms CPU time per invocation**. Pages Function invocations share the Workers request allowance; static asset requests are unlimited/free. D1 is available on Free but is not used here. Recheck current quotas before adding API calls, polling, storage or webhooks. Static asset hosting alone avoids Worker invocation quotas.

There are currently no required bindings or secrets. Do not enter Meta credentials in Vite variables (`VITE_*` is client-visible). When a backend is added, configure test/preview and production secrets separately in Cloudflare’s server-side environment bindings. Document each secret’s purpose and rotation before use.

## Meta configuration (future live integration)

1. Create a Meta developer app and configure the Instagram API with Instagram Login for Business/Creator accounts.
2. Add the exact HTTPS callback URL that the future server implementation uses, plus a local callback for development. This project does not yet implement or define that callback, so do not register a guessed URL.
3. Add required app domains, privacy policy, terms if requested, and user data deletion instructions/callback before review. Publish these at the final domain first.
4. Add only the needed Instagram permission(s). Verify scopes, app roles/test accounts, and permission access level in the Meta dashboard; obtain App Review/Advanced Access as Meta requires before onboarding outside test roles.
5. If message webhooks are implemented, add the documented webhook callback/verify token and subscribe only the needed fields. Callback signature validation and deletion/deauthorization behavior must ship before production use.
6. Test with an eligible professional test account. Never use a personal account password, cookie export, scraping, or private endpoint.
7. Merge/push to the configured production branch, confirm the Cloudflare build and deployed URL, then test the public site and OAuth top-level redirect.

## Embed and domain

The reliable integration is a clear link or same-site subdomain (for example `social.example.com`). The current `_headers` policy blocks iframe framing by default. If a future owner needs iframe embedding, change `frame-ancestors` to the exact supplied parent origins, test the actual OAuth flow as a top-level redirect/popup, and verify cookies/session behavior in target browsers. No wildcard origin and no third-party-cookie workaround.

## Rotation, disconnect, rollback

No current credentials can be rotated. For a future integration, rotate Meta app secrets in Meta and Cloudflare server-side bindings, redeploy, revoke old tokens, invalidate sessions, and review logs. Disconnect must revoke/delete app-held tokens and metadata; Delete my app data must remove all account-linked records and cease calls. Rollback by selecting a prior successful Pages deployment; investigate and rotate credentials before restoring a compromised build.

### Official Cloudflare sources

- [Workers Builds GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)
- [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
