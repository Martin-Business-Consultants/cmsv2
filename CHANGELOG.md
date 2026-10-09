# Changelog

Every release of the CMS, newest first. The version lives in `VERSION`;
releases are git tags (`v1.0.0`) with a GitHub release whose notes are the
section below. An install is brought to one with `bin/update v1.0.0`, or a
Kamal site with `kamal deploy -d <site>`. Settings shows when a newer one is
out.

## Unreleased

## 1.4.0

### Added
- **A Docker install updates itself from Settings › Updates**, as Runwell
  and WordPress do, with nothing to set up: Update downloads the release's
  bundle for this machine (the app, its gems, the default plugins and its
  Ruby, attached to every release from now on) into the data volume, checks
  it, and restarts the container on it (`Upgrade::InPlace`). Deploying a
  newer image takes over again. A release that needs a new system base
  redeploys through Hoster or GitHub when the install can, or says how, and
  one that would leave a `CMS_PLUGINS` plugin behind refuses. Installs
  deployed by Hoster without its API token, and Kamal installs without
  GitHub's, now update this way instead of by hand. An install deploys 1.4.0
  once to get it.

## 1.3.0

### Added
- **Search everything from the admin bar.** The search icon at its top
  right finds pages, entries, collections, globals, block types, redirects,
  users and roles that hold a term, whatever the person's role can read,
  with where each matched, a page at a time (`/search`, `GlobalSearch`).
- **Numbered pagination on every index table**: 25 rows a page, and under
  the table which rows these are and « Previous, the page numbers and
  Next », keeping the list's filters and search. Lists that loaded more as
  you scrolled, and those that showed everything (pages, trash, the
  sitemap…), all page this way. Plugins' tables get it as they are.

### Changed
- **Search runs on ActiveSearch** (`rails-active_search`): one index of
  every page, entry, collection, global, block type, redirect, user, role
  and audit entry, in this install's database, kept in step as they're
  saved. A list's search box searches it, finding any part of a word (two
  characters or fewer still match by LIKE), and so do `POST /api/search`
  and `cms search`. It replaces `pages_fts` and `collection_entries_fts`;
  the migration indexes what's already there, and `bin/rails
  search:reindex` replaces `fts:rebuild`.
- **The admin's layout**: a page's actions (its New button) sit across from
  its title at the right, and there's no line under the title. The admin
  menu stays put while the page scrolls, a fly-out stays open as the
  pointer travels to it, and the site's logo heads the menu. Screen options
  is in the admin bar, beside the theme toggle, and choosing Light keeps
  checkboxes and the browser's other controls light.

## 1.2.1

### Changed
- **Releases come from `Martin-Business-Consultants/cmsv2`**, now public:
  the daily update check reads them there (`CMS_RELEASES_REPO` still points
  it elsewhere). An install on 1.2.0 checks the old repository until it
  updates, or until it sets `CMS_RELEASES_REPO=Martin-Business-Consultants/cmsv2`.

## 1.2.0

### Added
- **Install a plugin from Settings › Plugins**, as Runwell does: an admin
  gives its GitHub repository (`owner/name`) and the CMS installs its latest
  release on the server (`CMS_DATA_DIR/plugins`), where it stays through
  deploys and updates, and restarts. Installed plugins get Update and Remove
  buttons, an update that won't load puts the previous release back, and
  Recent changes says how each went (`PluginChange`). A plugin may depend
  only on gems the core bundles. `CMS_INSTALLED_PLUGINS=off` boots without
  them.

## 1.1.0

### Added
- **Import a site from the old deployment's backup archive.**
  `bin/rails "cms:import_tenant[PATH]"` takes the `.tar.gz` the old
  deployment's Tools › Backup or `cms backup` writes as PATH, as well as a
  directory, with the tenant and its owner from the archive's manifest. The
  LibrePublish Import plugin (`cms-site-import`) is the button for it.
- **`CMS_PLUGINS=default`** installs the default plugins alone, for a host
  such as Hoster that won't keep an empty secret.

### Fixed
- **Docker builds fetch the default plugins.** The image copies
  `config/default_plugins.yml` before `bin/fetch-plugins` runs, so it knows
  what they are.

## 1.0.0

### Added
- **Open source**, under the Functional Source License (FSL-1.1-MIT,
  `LICENSE.md`).
- **Releases are cut with `bin/release X.Y.Z`**, which moves these notes under
  the version, tags and pushes; GitHub publishes the release with them
  (`.github/workflows/release.yml`). CI runs `bin/ci` on every push and pull
  request.
- **Docker installs keep their plugins.** The `CMS_PLUGINS` builder secret
  lists git URLs (with an optional `#tag`), and the image build fetches them
  before bundling (`bin/fetch-plugins`).
- **Settings › Updates**: the newest release and its notes, Check now, and
  an Update button (admins only). A plain install runs `bin/update <tag>` in
  the background; an install Hoster deploys proposes the tag's deploy to
  Hoster, approved there (`CMS_HOSTER_URL`, `CMS_HOSTER_TOKEN`,
  `CMS_HOSTER_ENVIRONMENT_ID`); another Docker install starts the Deploy
  workflow (`CMS_GITHUB_TOKEN`, `CMS_DEPLOY_DESTINATION`). `CMS_UPDATES`
  forces hoster, github, local or manual. The page follows a running update until the
  install boots on the new version, or says why it failed. `GET /api/updates`,
  `POST /api/updates/check` and `cms updates [check]` read and check, but
  can't start one. `CMS_UPDATE_CHECK=false` turns off the daily check.
- **Hoster can deploy the CMS** from the repository as it is
  (docs/install.md › Hoster): one app per site.

### Changed
- **A new look for the admin, styled with Litewind.** The screens are drawn
  with Tailwind's utility classes from Litewind 2.0.1 (Tailwind compiled
  ahead of time, vendored, still no build step), after Payload's admin:
  neutral and flat, a gray sidebar, compact controls. Every screen follows
  Settings › Branding's color, type and surface, in both themes: the primary
  color is the accent (primary buttons, links, focus, the current menu item;
  black until one is set), the secondary color tints the grays, and the
  font, corners and shadow — until now the public site's only — apply to the
  whole admin.
  Fizzy's CSS and its utility classes (`btn`, `txt-small`, `flex-column`…)
  are gone: a plugin whose views used them should move to Tailwind classes
  and the core's `ui(...)` recipes (STYLE.md, docs/plugins.md).
- **`config/deploy.yml` names no server, hostname or secret.** It is what
  every install shares; a site's destination and secrets
  (`config/deploy.<site>.yml`, `.kamal/secrets.<site>`) are no longer
  committed. The proxy now reaches Thruster (port 80), and `asset_path` is
  set.
- **No Rails credentials.** `config/credentials.yml.enc` and the master key
  are gone; everything comes from the install's environment. Mail takes
  `SMTP_PASSWORD` (no credentials fallback) and `MAIL_FROM_ADDRESS` /
  `MAIL_FROM_NAME` (default `noreply@<APP_HOST>`, `LibrePublish`), and
  Active Record encryption takes `AR_ENCRYPTION_*` or derives from
  `SECRET_KEY_BASE`. A site moved from the old shared install sets
  `SECRET_KEY_BASE` to that install's.
- The daily update check reads the CMS's releases from GitHub
  (`CMS_RELEASES_REPO`).
- **The admin is laid out like WordPress's.** A dark admin menu down the left
  (top-level items with icons, in groups, the current one open with its
  submenu, the others flying out on hover and keyboard focus; folds to icons;
  a drawer on narrow screens) and a thin admin bar across the top (the site
  and View site, "+ New", the update notice, plugins' items, the "/" filter,
  the theme and the person's menu). Screens share WordPress's conventions:
  the title with its primary action beside it, notices as toasts at the
  bottom right (a notice fades after a few seconds, an alert stays until it's
  dismissed),
  and list tables with status links ("All (12) | Published (8)"), a "Bulk
  actions" select and Apply, a search box, a tick-all box, and row actions
  under the title. The header nav, its Menu popup and the settings pages'
  section list are gone; Settings' sections are its submenu.
- **Plugins add to the admin menu** with `Cms::Plugins.menu` (a top-level
  item), `submenu` (a link under any item) and `new_item` ("+ New"), in place
  of `nav`.
- **The CMS says it's headless.** Every page, entry and global editor has a
  **JSON** tab: the record exactly as the API hands it to the site, with its
  endpoint and how to fetch it. A **Developers** screen explains how
  frontends work with the CMS, lists the API, walks through connecting an
  Astro site, and shows the frontend it serves and its last build; the
  dashboard says the same in a line.
- **The CLI, MCP and API come first.** Developers leads with the three
  surfaces and their one-line setups; every admin screen with a `cms`
  command names it under its title; the dashboard lists the tokens working
  through the API this week. New commands cover what the admin gained:
  `cms frontend`, `cms asset <id> [set …]`, `cms email … set`,
  `cms webhook create|update`.
- **Docs** (Help › Docs): guides on how the CMS works, working with an Astro
  site and working with AI agents (Markdown in `app/guides`, filled in for
  the install). The same at `/api/docs` and `cms docs [slug]`.
- **Site health** (Help › Docs › Site health, `/api/site_health`,
  `cms site-health`): whether the site is in good order, always — the business's name, address, phone and hours, and
  one phone number everywhere in its pages and globals; Turnstile or reCAPTCHA with both keys, form notifications and a
  sender on the site's domain; meta descriptions, a sharing image,
  structured data, nothing hidden from search by mistake; a contact page,
  privacy policy and terms; alt text and broken links; HTTPS, rebuilds,
  webhooks, a recent backup and two-factor. Forms, when it's installed,
  provides `:spam_protection`.
- **Connecting an Astro site is one line**:
  `curl -fsSL <cms>/frontend/install.sh | sh` in the site's project installs
  the Astro packages (with the Forms and Commerce add-ons when those plugins
  are on) and gets the site its own read-only service token through a browser
  approval (the device login, now with a `site` purpose).
- **The Astro integration is npm packages**: `@librepublish/astro`,
  `@librepublish/astro-forms` and `@librepublish/astro-commerce`, in their own
  repository (github.com/Martin-Business-Consultants/cms-astro), in place of
  files copied into each site from `integrations/astro`. Content loaders read
  the delivery API incrementally; types come from `/api/v1/schema`; `<Blocks>`,
  `<Image>`, `<Seo>`, `<Form>` and `<QuoteRequest>` render it. Each build
  writes `_redirects`, `sitemap.xml` and `robots.txt`, holds the site to Site
  health's site-facing checks (also written into its AGENTS.md), and reports
  how the site renders; a site rendered on demand on Cloudflare gets signed
  cache purges at `/_cms/webhook`. The GitHub publish workflow for a site repo
  is `docs/cms-publish.yml`.
### Removed
- **The core is content and publishing, and little else.** Gone, with their
  screens, API endpoints and `cms` commands: review requests, Approvals,
  pending changes (revisions), findings (`/api/recommendations`), Tools ›
  Schedules (recurring tasks), the go-live checklist and the dashboard's
  getting-started checklist; and the Agents, AI, Local Marketing, Consent &
  Scripts and Importers plugins. Site Health stays. A migration drops their
  tables and settings, and takes their capabilities off saved roles. The
  Lumin contract (`cms_contract.json`, version 2) no longer has the
  findings endpoint.
- **No review queue: anything in front of visitors takes the publish
  capability.** Changing a published page or entry, or any global, and
  publishing or scheduling a draft, need `<resource>:publish`. Without it the
  admin refuses the save with an error (a role that can't publish gets Save
  Draft and no Publish button) and the API answers 403. Version history and
  "Restore this version" stay.
- **Inertia, React, shadcn, Vite, TypeScript and Tailwind.** `app/frontend`,
  the `inertia_rails`, `vite_rails` and `typelizer` gems, `package.json`
  and the pnpm lockfile, the SSR Dockerfile and the Vite dev process are
  gone. The CMS needs no Node: not to develop, not to build its image, not
  in CI (the npm lint, format, type-check and audit steps are gone too).
- **The CMS's own page renderer** (`/site/:slug`, `SiteController`, the
  `site/blocks` partials). Pages are only rendered by the published site.
  `/api/preview_drafts` stays for the Astro site's `/_preview`; the
  `preview_url` it returns now points there, like `public_preview_url`
  (nil until Settings › General has the site's base URL).
- **Relationships** (`/relationships`, "Where is this used?"). The reference
  index it read (`ContentReference`, `/api/references`) stays: the asset
  usage audit and the API use it.
- **`app/services` in the core.** Its last four objects are plain objects in
  `app/models` (`Sitemap`, `Preview`, `OnboardingChecklist`,
  `Recommendation::QueueState`); an architecture spec keeps it gone.
- **`app/services` in the plugins**, and with it every exception the
  architecture specs allowed. Agents, AI, Forms and Importers keep
  their classes, now in `app/models`; the plugins' APIs render jbuilder
  views; Forms' `POST /api/submissions/bulk_destroy` is a resource at the
  same URL; `Lumin::LlmTool` becomes `Ai::Tool` in the AI plugin, so only AI
  names RubyLLM. The specs now forbid all four patterns outright.
- **Plugin job names.** `AgentRunJob`, `AgentSchedulerJob`, `ReapAgentRunsJob`,
  `NotifyFormSubmissionJob`, `NotifyQuoteRequestJob`, `SendInvoiceJob`,
  `AstroImportJob`, `DirectusImportJob` and `WordpressImportJob` become
  `AgentRun::ExecutionJob`, `Agent::ScheduleJob`, `AgentRun::ReapJob`,
  `FormSubmission::NotificationJob`, `QuoteRequest::NotificationJob`,
  `Invoice::DeliveryJob` and `Importers::{Astro,Directus,Wordpress}Job`,
  each calling a `*_now` verb on its record or adapter. The old names stay
  one release as subclasses, for jobs already queued.
- **`Trash::PurgeJob`**, which nothing scheduled. `TrashPurgeJob` now runs
  every night (config/recurring.yml) and deletes what has been in the trash
  longer than 30 days.

### Content editor
- **The page, entry and global forms are Hotwire**, and with them the block
  editor: blocks and repeater items reorder by dragging or with the arrows,
  blocks are added from a filterable picker and can be duplicated (with a
  new id), rich text is Lexxy writing HTML, assets are chosen (or uploaded)
  in a picker over the file manager, and references and links are selects.
  A form saved without edits writes back exactly what it read; an edit
  changes only what it touched.
- **JSON-LD is validated**: `seo.json_ld` must be one node or a list of
  nodes with an `@type` (or an `@graph`), on pages and entries alike, and
  the SEO panel has a JSON-LD box.
- **The visual editor (the live preview iframe) is gone.**
- A new entry's slug is made from its name when left blank, as a new
  page's already was.

### Plugins
- **Local Marketing is a plugin** (`engines/local_marketing`), off by
  default and adopted by an install with reports or reporting settings:
  DataForSEO reports, the site audit, the Marketer's Report, its guided
  setup, Settings › Reporting and `/api/reports`. It runs without the AI
  plugin; the written summaries are left out without one. `/api/reports`
  answers exactly as before while it's on, and 404s while it's off.
- **Reports and the Marketer's Report are text for now**: each report says
  what it measured, when, its headline figures against the run before, and
  its rows as tables. Charts, the rank map and sparklines are gone until
  reporting is redesigned. Running a report, the baseline, handing work to
  an agent and rewriting the summary are resources at the same URLs.
- A wildcard token's capabilities come in the role editor's order again,
  with each plugin's where its group sits.
- **AI and Agents are plugins** (`engines/ai`, `engines/agents`), off by
  default; Agents depends on AI. AI holds OpenCode Zen, RubyLLM and
  Settings › AI; Agents holds agents, swarms, templates, the run log and the
  worker protocol. An install with agents, runs or swarms — or a saved AI
  setting — adopts them on upgrade. `/api/agents` and every
  `/api/agent_runs` step the `cms` CLI uses answer exactly as before while
  they're on, and 404 while they're off. Findings stay in the core; the
  finding still names the agent that filed it.
- The agents, runs, live view and swarms render in ERB; the charts are
  words for now. Queue, upgrade, cancel, seeding and installing templates
  are their own resources at the same or nearby URLs (`/agents/:id/run`,
  `/agents/:id/upgrade`, `/agent_runs/:id/cancellation`,
  `/agent_templates/seeding`, `/agent_templates/:id/installation`, and the
  same for swarm templates).
- Plugins can run work every N minutes (`minutely`) and set a site up on
  install or first switch-on (`bootstrap`). The agent scheduler and reaper
  moved from `config/recurring.yml` into the Agents plugin, run by
  `PluginsMinutelyJob`.
- Adopting a plugin adopts the plugins it depends on.
- **Importers is a plugin** (`engines/importers`), off by default: Tools ›
  Import with a tab per source (WordPress, Directus, Astro), and the wipe
  before a fresh import. Each source is an `Importers::Adapter`, so another
  plugin can add one. `/api/tools/import`, `/api/tools/import/<source>` and
  `/api/tools/import/wipe` answer exactly as before while it's on, and 404
  while it's off.
- Forms owns `submission.created` and its per-form webhook filter
  (`webhook_event_filter`); the event list and its order are unchanged.
- Switching a plugin on for the first time gives the built-in roles its
  standard permissions (audited as `plugin.permissions_granted`).
- Settings › Forms stores the Turnstile and reCAPTCHA secret keys encrypted
  and never shows them again; a migration moves saved ones across.
- `after: :start` puts a plugin's addition first.

### Admin
- The file manager renders in ERB: a folder tree, cards or a table, search
  across folders, uploads straight to storage with progress, zip unpacking
  with a page that follows it, bulk move and delete, and a page per file with
  its alt text, folder and where the site uses it.
- Tools › Schedules and Tools › Backup render in ERB; Backup also lists the
  data-directory archives `bin/update` keeps, for download.
- **Commerce is a plugin** (`engines/commerce`), off by default and switched
  on for any install that already has quote requests or invoices. Its admin —
  the quote inbox, invoices, Settings › Commerce — renders in ERB; sending,
  paying and voiding are resources (`/invoices/:id/delivery`, `…/payment`,
  `…/voiding`). `/api/quotes`, `/api/invoices`, `/api/quote_requests` and the
  hosted `/i/:token` page answer exactly as before while it's on, and 404
  while it's off. Settings › Commerce now needs `invoices:read` to open and
  `invoices:write` to save.
- Plugins can add webhook events (`webhook_events`), place a new Menu group
  (`group_after:`), and name another plugin's item — or a list of choices —
  in `after:`.
- An invoice's payment link must be an http(s) URL as a whole, not just start
  like one; a quote request's page and item links only become links when
  they're http(s).

### Moved
- **Forms and Commerce are installed plugins**, each in its own repository,
  rather than bundled in `engines/`. Install them with
  `bin/rails "plugins:install[<git url>]"`, or list them in `CMS_PLUGINS` for a
  Docker install; their data and tables are unchanged. Only `engines/hello`,
  the reference plugin, still ships with the core.

## 1.0.0

The first versioned release: the CMS becomes something you install, one
customer per install, rather than a shared multi-tenant service.

### Installs, versions and updates
- **One install per site.** Multi-tenancy is gone (activerecord-tenanted, the
  global database, subdomain routing, root-domain signup and provisioning).
  An install is configured by its environment: `APP_HOST`, `SITE_KEY` (sent
  as `tenant` in webhooks, the manifest and device login, unchanged for
  Lumin) and `CMS_DATA_DIR`, which holds every database and uploaded file.
- `bin/install --host …` sets up a plain install; `bin/update [vX.Y.Z]` backs
  up the data directory, checks out a release, migrates and restarts.
  `config/deploy.yml` is one install per Kamal destination
  (`config/deploy.example-site.yml`); the container backs up its data before
  every migrate. See docs/install.md.
- The first account created at `/sign_up` is the owner; the CMS is
  invitation-only after that. A fresh install gets the site's starter
  content, never the demo seed.
- A daily check of the CMS's GitHub releases; Settings says when a newer
  version is available.

### Plugins
- A plugin system modelled on Runwell's: Rails engines in `engines/`
  (bundled) and `plugins/` (installed with `bin/rails "plugins:install[url]"`),
  switched on in Settings › Plugins. Extension points: menu links, view
  slots, settings pages, capabilities, stylesheets, nightly tasks, API
  endpoints (listed in `/api/manifest`), agent tools, reports, importers,
  script presets, block type packs, schema field types, deploy providers and
  in-process content events. `engines/hello` is the reference plugin;
  docs/plugins.md the guide.
- Deploys go through a provider: the existing build hook, or GitHub
  (`repository_dispatch` on the site's repo). Installs with a hook URL keep
  using it.

### The admin moves to Hotwire
- Inertia/React/shadcn give way to server-rendered ERB (Herb/ReActionView),
  Stimulus and Turbo, with Fizzy's CSS, served through importmap and
  Propshaft with no build step. Every admin screen is ported.
- Custom actions become resources (approvals, rejections, restorations, bulk
  deletions, rotations…). `/api` URLs and response shapes are unchanged;
  `/api/manifest` gains `version` and `plugins`.
- Backups (Tools › Backup) now include uploaded files.
