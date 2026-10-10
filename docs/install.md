# Installing LibrePublish in production

LibrePublish is one Node.js process: the public site, the admin (`/admin`), the delivery API
(`/api/v1`), the job queue and the scheduler all run in it. Data lives in one SQLite database and
an uploads folder, both under `storage/`. Back up that folder and you have backed up the site.

- [Requirements](#requirements)
- [Docker](#docker)
- [Plain Node.js with systemd](#plain-nodejs-with-systemd)
- [HTTPS and reverse proxies](#https-and-reverse-proxies)
- [Environment variables](#environment-variables)
- [Backups and restore](#backups-and-restore)
- [Updating](#updating)
- [Health check](#health-check)
- [Security headers](#security-headers)
- [Webhooks](#webhooks)
- [Jobs and recurring tasks](#jobs-and-recurring-tasks)

## Requirements

- Node.js 24 and pnpm (or Docker).
- A reverse proxy that terminates TLS: Caddy, nginx, Traefik, a PaaS router or a load balancer.
- An SMTP server for password resets, invitations and form notifications.
- One persistent directory for `storage/`.

## Docker

The repository's `Dockerfile` builds a production image. On every start the container runs the
migrations, seeds anything missing (roles, block types, the first admin) and starts the server on
port 3333.

```sh
docker build -t librepublish .
node ace generate:key --show
```

Create `/srv/librepublish/.env` (see [Environment variables](#environment-variables)):

```dotenv
NODE_ENV=production
TZ=UTC
HOST=0.0.0.0
PORT=3333
LOG_LEVEL=info
APP_KEY=<the key you generated>
APP_URL=https://cms.example.com
SESSION_DRIVER=cookie
DRIVE_DISK=fs
LIMITER_STORE=database
MAIL_MAILER=smtp
MAIL_FROM_NAME=Example
MAIL_FROM_ADDRESS=cms@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=…
SMTP_PASSWORD=…
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=<a long password, used only to create the first admin>
```

Run it with a named volume for `storage/`:

```sh
docker run -d --name librepublish --restart unless-stopped \
  -p 127.0.0.1:3333:3333 \
  -v librepublish-storage:/app/storage \
  --env-file /srv/librepublish/.env \
  librepublish
```

With Docker Compose and Caddy (automatic HTTPS):

```yaml
services:
  cms:
    build: .
    restart: unless-stopped
    env_file: .env
    volumes:
      - storage:/app/storage
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "fetch('http://127.0.0.1:3333/up').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))",
        ]
      interval: 30s
      timeout: 5s
      retries: 3

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports: ['80:80', '443:443']
    command: caddy reverse-proxy --from cms.example.com --to cms:3333
    volumes:
      - caddy:/data

volumes:
  storage:
  caddy:
```

Caddy sends `X-Forwarded-Proto: https`, which the CMS honours (see
[HTTPS](#https-and-reverse-proxies)).

## Plain Node.js with systemd

```sh
git clone <repository> /opt/librepublish && cd /opt/librepublish
pnpm install --frozen-lockfile
node ace build
cd build
pnpm install --prod --frozen-lockfile
cp /srv/librepublish/.env .env
ln -s /var/lib/librepublish storage
node ace migration:run --force
node ace db:seed
```

Keep `storage/` outside the build folder (here `/var/lib/librepublish`, owned by the service user)
so a rebuild never touches it. `/etc/systemd/system/librepublish.service`:

```ini
[Unit]
Description=LibrePublish CMS
After=network.target

[Service]
Type=simple
User=librepublish
WorkingDirectory=/opt/librepublish/build
EnvironmentFile=/srv/librepublish/.env
ExecStartPre=/usr/bin/node ace migration:run --force
ExecStart=/usr/bin/node bin/server.js
Restart=on-failure
RestartSec=5
KillSignal=SIGTERM
TimeoutStopSec=30
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/librepublish
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```sh
systemctl daemon-reload
systemctl enable --now librepublish
journalctl -u librepublish -f
```

Put nginx or Caddy in front of `127.0.0.1:3333`. For nginx, forward the scheme:

```nginx
location / {
  proxy_pass http://127.0.0.1:3333;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  client_max_body_size 50m;
}
```

## HTTPS and reverse proxies

In production the CMS redirects every plain-HTTP request to `https://` on the host in `APP_URL`
(301 for GET and HEAD, 307 otherwise), sends HSTS, and marks cookies `Secure`. `/up` is never
redirected, so health checks over HTTP keep working.

A request counts as secure when any of these is true:

- it arrived over TLS;
- the proxy sent `X-Forwarded-Proto: https`;
- `ASSUME_SSL=true` (use this when the proxy terminates TLS but does not send the header).

Serving the CMS over plain HTTP in production (an internal network, say) needs both an `http://`
`APP_URL` and `CMS_FORCE_SSL=false`; otherwise the server refuses to start.

## Environment variables

The server checks its environment when it boots. In production, a problem marked **required**
stops it with a message naming the variable; warnings are logged.

| Variable                                                                                                         | Default                                   | Meaning                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                                                                                       |                                           | `production` on a live install.                                                                                                                                                     |
| `APP_KEY`                                                                                                        |                                           | **Required**, 32+ characters (`node ace generate:key`). Encrypts sessions and stored secrets (webhook secrets); changing it signs everyone out and makes stored secrets unreadable. |
| `APP_URL`                                                                                                        |                                           | **Required**. The public address, `https://` in production. Used for absolute links in emails, the sitemap, webhook payloads and HTTPS redirects.                                   |
| `HOST`, `PORT`                                                                                                   |                                           | Where Node listens (`0.0.0.0` / `3333` in Docker).                                                                                                                                  |
| `TZ`                                                                                                             |                                           | Use `UTC`. Timestamps are stored in UTC.                                                                                                                                            |
| `LOG_LEVEL`                                                                                                      |                                           | `info`, `warn`, `debug`…                                                                                                                                                            |
| `SESSION_DRIVER`                                                                                                 |                                           | `cookie` (recommended) or `database`. `memory` loses sessions on restart.                                                                                                           |
| `LIMITER_STORE`                                                                                                  |                                           | `database` (recommended) or `memory`.                                                                                                                                               |
| `DRIVE_DISK`                                                                                                     |                                           | `fs`: uploads in `storage/uploads`.                                                                                                                                                 |
| `MAIL_MAILER`, `MAIL_FROM_NAME`, `MAIL_FROM_ADDRESS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` |                                           | Outgoing email.                                                                                                                                                                     |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`                                                                                  | `admin@example.com` / `password1234`      | The first admin, created only when there are no users. Always set them in production.                                                                                               |
| `SITE_KEY`                                                                                                       | first label of `APP_URL`'s host           | The `tenant` in webhook payloads. Keep it stable when the install moves to a new host.                                                                                              |
| `CMS_FORCE_SSL`                                                                                                  | on when production and `APP_URL` is https | Redirect HTTP to HTTPS.                                                                                                                                                             |
| `ASSUME_SSL`                                                                                                     | `false`                                   | Treat every request as HTTPS (TLS terminated by a proxy that sends no `X-Forwarded-Proto`).                                                                                         |
| `CMS_CSP`                                                                                                        | `on`                                      | Content-Security-Policy: `on`, `report-only` or `off`.                                                                                                                              |
| `CMS_ALLOW_PRIVATE_WEBHOOKS`                                                                                     | on in development, off in production      | Let webhooks and other outbound requests reach loopback, private and link-local addresses.                                                                                          |
| `CMS_TRASH_DAYS`                                                                                                 | `30`                                      | Days an item stays in the trash before the nightly purge deletes it. `0` keeps the trash forever.                                                                                   |
| `QUEUE_WORKER`                                                                                                   | `inline`                                  | `inline` runs the job worker inside the web process. `off` disables it; then run `node ace queue:work` as a separate service.                                                       |

## Backups and restore

Everything that matters is in `storage/`:

- `storage/db.sqlite3`: content, users, settings, the job queue, webhooks and the audit log;
- `storage/uploads/`: the media library and its image variants;
- `storage/form_uploads/`: files attached to form submissions (Forms plugin).

Plus your `.env` (above all `APP_KEY`). Keep a copy of it somewhere safe: without the same key,
encrypted values in a restored database cannot be read.

Copying a live SQLite file can catch it mid-write. Take a consistent snapshot with SQLite's online
backup, then archive it with the uploads:

```sh
cd /var/lib/librepublish
sqlite3 db.sqlite3 ".backup '/backups/db-$(date +%F).sqlite3'"
tar -czf /backups/uploads-$(date +%F).tar.gz uploads form_uploads
```

In Docker:

```sh
docker exec librepublish node -e "
  const Database = require('better-sqlite3');
  new Database('storage/db.sqlite3').backup('storage/backup.sqlite3').then(() => console.log('ok'))"
docker cp librepublish:/app/storage/backup.sqlite3 ./db-$(date +%F).sqlite3
docker run --rm -v librepublish-storage:/s -v "$PWD":/out alpine \
  tar -czf /out/uploads-$(date +%F).tar.gz -C /s uploads form_uploads
```

Run it nightly (cron or a systemd timer), keep several generations, and copy them off the server.
Test a restore now and then.

To restore: stop the server, put the database back as `storage/db.sqlite3` (remove any
`db.sqlite3-wal` and `db.sqlite3-shm` beside it), unpack the uploads into `storage/`, start the
server with the same `APP_KEY`. The migrations bring an older backup up to date on boot.

## Updating

1. Take a backup (above).
2. Docker: `git pull && docker build -t librepublish . && docker rm -f librepublish` and run it again
   with the same volume and env file. systemd: `git pull`, rebuild as in the install steps, then
   `systemctl restart librepublish` (`ExecStartPre` runs the migrations).
3. Check `/up` and the admin. If something is wrong, roll back to the previous image or build and
   restore the backup taken in step 1.

## Health check

`GET /up` answers `200 {"status":"ok"}` when the app can query its database and
`503 {"status":"unavailable"}` when it cannot. It is never cached, never redirected to HTTPS and
needs no authentication; point your load balancer, container healthcheck or uptime monitor at it.

## Security headers

Every page carries:

- `Content-Security-Policy` with a per-request nonce. Scripts run only from the CMS itself, from
  Cloudflare Turnstile and Google reCAPTCHA (form spam protection), and from the `https://`
  origins of scripts pasted into **Settings › Head scripts** (inline scripts there get the nonce
  automatically). Styles and fonts may come from Google Fonts; images and media from any https
  URL. If a third-party script you add is blocked, the browser console says which origin; add its
  loader to Head scripts, or set `CMS_CSP=report-only` while you investigate.
- `Strict-Transport-Security` (180 days), `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`.
- Uploaded SVG, HTML, XML and JavaScript files are served sandboxed (`CSP: sandbox`), and the
  last three as downloads.

## Webhooks

Tools › Webhooks posts signed JSON to other systems when content changes. Each request carries
`User-Agent: librepublish-webhooks/1` and `X-CMS-Signature: sha256=<hex HMAC-SHA256 of the raw
body keyed with the webhook's secret>`, connects within 5 s, must finish within 10 s and never
follows redirects. Failed deliveries (network errors, timeouts, 408, 429 and 5xx answers) are
retried three times with exponential backoff (about 10 s, 30 s and 90 s). Webhook URLs that
resolve to private or loopback addresses are refused unless `CMS_ALLOW_PRIVATE_WEBHOOKS=true`.

The envelope is `{event, tenant, delivered_at, data}`. Events: `page.published`, `page.updated`,
`page.unpublished`, `page.deleted`, `entry.published`, `entry.updated`, `entry.unpublished`,
`entry.deleted`, `global.updated`, plus the events plugins add (Forms: `submission.created`).

Verify a delivery in Node:

```js
import { createHmac, timingSafeEqual } from 'node:crypto'

const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')
const valid =
  expected.length === signature.length &&
  timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
```

## Jobs and recurring tasks

The queue lives in the SQLite database and its worker runs inside the web process (see
`QUEUE_WORKER`). The scheduler queues:

| Task                                            | When         |
| ----------------------------------------------- | ------------ |
| Scheduled publishing and unpublishing           | every minute |
| Plugin minutely tasks                           | every minute |
| Plugin nightly tasks                            | 01:00        |
| Trash purge (items older than `CMS_TRASH_DAYS`) | 03:00        |
| Session cleanup                                 | hourly       |

Times follow the server's time zone (`TZ`).
