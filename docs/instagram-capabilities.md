# Instagram capabilities and limits

**Checked:** 2026-10-09. This document records the official Instagram API with Instagram Login model. API behavior and app review requirements change; verify Meta’s current documentation and app dashboard before requesting access. The Meta developer reference pages rate-limited automated access during this check; the official Meta API collection and official Cloudflare docs below were consulted. No live API calls are configured in this code.

## Login model and API surface

- **Model:** Instagram API with Instagram Login (Meta’s professional account login model). It supports Instagram professional **Business and Creator** accounts. It does not support ordinary consumer/personal accounts. The Instagram Login setup does **not** require a linked Facebook Page.
- **OAuth scopes (permission names):** `instagram_business_basic` for basic professional account/profile and media access; `instagram_business_manage_messages` for eligible messaging features; `instagram_business_content_publish` for supported publishing. The product does not request scopes in this demo. Do not request messaging or publishing access until the corresponding live UX is implemented and explained. Meta’s official collection states that the newer `instagram_business_*` names replaced the older unprefixed `business_*` scopes, deprecated 2025-01-27.
- **API host/version:** Instagram Login API calls use `graph.instagram.com`; pin the Graph API version explicitly. The current Meta collection models the Send API as `POST https://graph.instagram.com/{api_version}/{ig_user_id}/messages`. Graph API **v26.0** is the latest version listed by the Graph API changelog checked on 2026-10-09; the corresponding messaging path is `POST https://graph.instagram.com/v26.0/{ig_user_id}/messages`. Reconfirm the version and endpoint-specific support in Meta’s developer reference before implementing live calls. This demo has no endpoint calls and therefore pins no request version in code.
- **Account access:** app-role/tester access can be used for development. Access for accounts outside app roles requires the relevant permission access level, review/Advanced Access and any applicable business verification. Approval is not assumed.

## Feature matrix

| Experience | Official API support | Account / permission | Product decision in this app |
|---|---|---|---|
| General followed-accounts home feed | Not provided by the Instagram Platform API | None | Unavailable; no simulated feed |
| Account profile and own media | Supported for eligible professional accounts | Professional account; `instagram_business_basic` | Conditional; demo shows an explanation only |
| Arbitrary friends’ Stories | No general viewer capability verified | No supported general permission | Unavailable |
| General Reels browsing / discovery | Not provided as a consumer discovery experience | None | Unavailable; no Reels route or autoplay |
| Read/respond to DMs | Conditional. Professional inbox integration is subject to supported conversation/message rules and permission/access review. The recipient must have messaged the professional account first; group messaging is unsupported. Inactive requests older than 30 days are not returned. | Professional account; `instagram_business_manage_messages`; app configuration and appropriate access level | Not connected. UI fixture is labelled demo; real API implementation remains external work |
| Reel/link shared in a DM | Message/share metadata may be returned; Meta’s Conversations API collection says a share may include only its image/video URL | Same messaging eligibility | Demo URL card says preview-only and provides an explicit Instagram link. Never proxy or claim playable media without API evidence |
| Publish photos/videos/carousels/Reels | Conditional on documented content-publishing flow, media requirements, professional account, permission and access | Professional account; `instagram_business_content_publish` | Local draft only; no upload/publish claim |
| Publish Stories | Limited/conditional and subject to the currently documented account and format rules | Professional account and publishing access; confirm exact current constraints before enabling | Disabled in demo |
| Remove Instagram’s own Reels tab | Not an API capability | None | Impossible; app has no discovery navigation of its own |
| Personal/consumer account connection | Not supported by this official login model | None | Explicitly unavailable; never ask for Instagram password or use browser cookies |

## Official sources

- [Meta: Instagram API with Instagram Login (official Postman collection)](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login) — professional eligibility, no linked Facebook Page, updated scope names and API collection.
- [Meta: Instagram API reference collection (Messaging Send API)](https://www.postman.com/meta/workspace/instagram/documentation/23987686-9386f468-7714-490f-9bfc-9442db5c8f00) — `graph.instagram.com` message endpoint, recipient-initiated conversation rule, group-message limitation, inactive request handling, and shared URL behavior.
- [Meta: Instagram API documentation](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/) — official developer overview; was rate-limited (HTTP 429) during this research pass.
- [Meta: Instagram messaging documentation](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/) — supported messaging model and requirements; direct documentation fetch was rate-limited during this check.
- [Meta: Content publishing documentation](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing/) — current content formats and publishing workflow; confirm eligibility/format limits before enabling.
- [Meta: Graph API changelog](https://developers.facebook.com/docs/graph-api/changelog/) — version lifecycle; latest listed version checked as v26.0 on 2026-10-09.
- [Meta: App Review](https://developers.facebook.com/docs/app-review/) — access review process.

The UI and fixtures in this repository are not evidence of account eligibility, current permission approval, API behavior, or successful publication. Live integration must be verified with Meta test users and mocked API tests before any production claim.
