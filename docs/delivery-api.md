# The delivery API (`/api/v1`)

What a site reads to build and serve itself. It is read-only, frozen at v1,
and only ever shows what's live — a draft never reaches a site, whatever
token asks. `/api` stays the admin's and the CLI's (writes, drafts,
management).

Authenticate with the site's service token (Settings › Service tokens, the
"Production site" role): `Authorization: Bearer <token>`.

## One answer shape

    {"data": …, "meta": {…}, "included": {"assets": {"<id>": {…}}}}

- `meta` on lists: `{page, per, total, next_page}` (`?page=`, `?per=` up to 100).
- `included.assets`: every asset the records point at, resolved — absolute
  URLs on the CMS host, `width`, `height`, `alt`, and `variants`
  (`w640`, `w1280`, `w1920`). Present when a media library is installed.
- `Cache-Tag` header: the tags a publish purges (below).

## Endpoints

| Endpoint | What |
|---|---|
| `GET /api/v1/site` | Name, public URL, `default_locale`, `locales` (every one but the default is a path prefix: `/fr/…`), contact details, enabled plugins, and `plugin_config` (Forms: its captcha; Commerce: where quote requests post). |
| `GET /api/v1/content[?since=<cursor>]` | Every live page (blocks expanded), entry and global — or, with a previous read's `meta.cursor`, only what changed, plus `data.removed` (what stopped being live). `meta.full: true` means replace what you have. A cursor older than 30 days gets a full answer. |
| `GET /api/v1/pages[?locale=]`, `/api/v1/pages/<path>` | Live pages, blocks expanded, with `translations: [{locale, path}]`. |
| `GET /api/v1/collections`, `/collections/<slug>` | Collections and their fields. |
| `GET /api/v1/collections/<slug>/entries[?locale=]`, `…/entries/<slug>` | Live entries, with translations. |
| `GET /api/v1/globals`, `/globals/<slug>` | Globals' data (secret-looking values masked). |
| `GET /api/v1/schema` | JSON Schema (2020-12) for each block type's data, each collection's fields, each global, pages with fields, and SEO. Each field carries `title` and `x-cms-type` (markdown, asset, link, blocks…) — what a build generates its types from. |
| `GET /api/v1/sitemap` | URLs on the public site, with `lastmod` and hreflang `alternates`. |
| `GET /api/v1/redirects`, `/api/v1/redirects.txt` | Active rules; the `.txt` is a Cloudflare `_redirects` file (exact rules first, wildcards longest first, `:splat`). |
| `GET /api/v1/site_health` | Site health's checks (`state`: passes, fails, yours_to_judge) for a build to hold the site to. |
| `GET /api/v1/forms`, `/forms/<slug>` (Forms) | Published forms: fields, `action` (where the browser posts, on the CMS), `honeypot`, `captcha: {provider, site_key}`. |

Forms and quote requests post straight from the browser to the CMS; CORS
allows the origins in Settings › General.

## Builds and publishing

A build reports itself to `POST /api/frontend/builds` with how it renders
(`render`: static, server or hybrid), its `webhook_url` and the
`content_cursor` it built from (docs/install.md, "Static or on demand").
Publishing then rebuilds a static site through the deploy provider (GitHub,
a build hook, or Cloudflare), and sends an on-demand site a signed purge
(`X-CMS-Signature: sha256=<HMAC>`) naming what changed.

Cache tags, the same in `Cache-Tag` headers and purges: `page:<path>`,
`entry:<collection>/<slug>`, `collection:<slug>`, `global:<slug>`, `pages`,
`sitemap`, `redirects`, and, from Forms, `form:<slug>`.
