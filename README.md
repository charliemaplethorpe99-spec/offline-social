# Offline Social

A calm, mobile-friendly companion concept for intentional social check-ins. It contains a clearly labeled local demo inbox, bounded conversation history, an account-owned updates explanation, a local-only create draft, privacy settings, and a plain-language capabilities page. There is no Explore, For You, Reels discovery, autoplay, auto-pagination, or live Instagram integration in this version.

> **Demo status:** conversation names and messages are fictional fixtures. Replies remain in React memory and disappear on refresh. No Instagram account is connected. Nothing is sent, published, uploaded, or retrieved from Meta.

## Capabilities and limitations

- Official Instagram Login is for Instagram professional Creator and Business accounts; ordinary personal accounts are not supported. Instagram Login does not require a linked Facebook Page.
- The official API does not provide the general followed-accounts home feed. This app will not invent one.
- This app cannot browse arbitrary people’s Stories or Reels, and cannot remove Instagram’s own Reels tab.
- Messaging is conditional on supported professional accounts, the messaging permission, eligible conversations, app configuration and Meta access review. Not every message type is exposed. Shared Reels can be URL-only and are not guaranteed playable.
- Content publishing is conditional on documented formats, account eligibility, permissions and Meta review. The draft screen here is local only; publishing is not connected.
- Demo data is visibly identified and is not evidence of an approved or live Meta integration.

See [the capability matrix](docs/instagram-capabilities.md) for the checked API model, requested permission names, limits, and official sources.

## Local development

Prerequisites: Node.js 20+ and pnpm (or npm).

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
```

No credentials are needed for the local demo. `.env.example` contains safe placeholders only. There is intentionally no live Meta OAuth route or token storage yet; do not add client-side Meta secrets. The live integration requires a real Meta developer app, public privacy/deletion URLs, verified redirect URI, suitable account, and app-role testing. Third-party permissions need applicable review/Advanced Access before broad use.

## Deploy to Cloudflare Workers

1. Connect the GitHub repository to Cloudflare Workers Builds, targeting the `offline-social` Worker configured in `wrangler.toml`.
2. Set build command `pnpm install --frozen-lockfile && pnpm build` and deploy command `pnpm exec wrangler deploy`.
3. Select the production branch and enable previews for pull requests/other branches. The Wrangler config serves the Vite `dist` output as a single-page app.
4. Add the Worker’s `workers.dev` or custom domain and confirm TLS. Add no Meta secrets: the present build has no live integration.
5. Review [Cloudflare deployment notes](docs/deployment-cloudflare.md) before adding any production integration.

Cloudflare says Free Workers allow 100,000 requests/day and 10 ms CPU per invocation; Pages Function requests share that allowance, while static asset requests are free/unlimited. These are the limits checked on 2026-10-09; confirm them again before launch.

## Project notes

- Architecture and current implementation boundary: [docs/architecture.md](docs/architecture.md)
- Privacy and data handling: [docs/privacy-and-data.md](docs/privacy-and-data.md)
- Deployment: [docs/deployment-cloudflare.md](docs/deployment-cloudflare.md)
- Tests: `pnpm test` (the suite covers the implemented demo and capability helpers; it does not prove a live Meta connection).
- Configuration placeholder: `.env.example`

This workspace was supplied without a Git checkout or connected GitHub project, so no remote, branch, GitHub integration, Cloudflare project, or deployment could be inspected or configured from this task.
