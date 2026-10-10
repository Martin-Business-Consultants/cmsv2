# LibrePublish

A WordPress-style CMS and website in one app: the public site renders at `/`, the admin lives at
`/admin`, and a read-only delivery API serves headless frontends at `/api/v1`.

Built with AdonisJS 7, Inertia, React, Tailwind CSS and shadcn/ui. One container, one SQLite
database, uploads on local disk.

## Run it locally

```sh
pnpm install
cp .env.example .env
node ace generate:key
node ace migration:run
node ace db:seed
pnpm dev
```

Open http://localhost:3333 for the site and http://localhost:3333/admin for the admin
(`admin@example.com` / `password1234`, change it under Account).

## What's inside

- **Pages** built from blocks, nested by path, with drafts, scheduled publishing, versions,
  previews and a trash.
- **Collections** of entries (a blog, team members, locations…) with their own fields and public
  URLs.
- **Globals** for site-wide content such as navigation and contact details.
- **Block types** you define in the admin; the theme renders them.
- **Media library** with responsive WebP variants.
- **Forms** with Cloudflare Turnstile, a honeypot, email notifications and CSV export.
- **Redirects**, `sitemap.xml` and `robots.txt`.
- **Users, roles and capabilities**, API clients with access tokens, and an audit log.

## The theme

The public site is server-rendered React in `inertia/site`. Each block type maps to a component in
the theme's block registry; add a block type in the admin, then a component for it here.

## Delivery API

Create an API client and token under System → API clients, then:

```sh
curl -H "Authorization: Bearer <token>" http://localhost:3333/api/v1/pages
```

## Deploy

```sh
docker build -t librepublish .
docker run -p 3333:3333 -v librepublish:/app/storage --env-file .env librepublish
```

Everything that needs backing up lives in `storage/`: the database and the uploads.
