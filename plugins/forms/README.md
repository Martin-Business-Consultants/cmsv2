# Forms

Contact, signup and quote forms for LibrePublish: a form builder, a Form block for pages, a
submissions inbox, email notifications and confirmations, a per-form webhook and spam protection.

Key `forms`, on by default. Switching it off hides everything below and keeps the data; pages
that embed a form simply stop showing it.

## What it adds

| Where            | What                                                                                                                                                                                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin menu       | Content › Forms: All forms, Add new, Submissions. “+ New › Form” in the admin bar.                                                                                                                                                                                                                   |
| Form editor      | Tabs for Fields (builder + live preview), Settings (button label, success message, redirect URL, webhook), Emails (notification and confirmation) and Submissions (latest ten, unread count, CSV export).                                                                                            |
| Submissions      | One inbox across every form (`/admin/submissions`) or per form (`/admin/forms/:id/submissions`): Inbox / Unread / Spam / All, search in answers, bulk mark read, unread, spam or delete, a detail sheet with files, page URL, email and webhook delivery status. Opening a submission marks it read. |
| Settings › Forms | From name and address, default notification recipients, captcha provider (honeypot only, Cloudflare Turnstile or Google reCAPTCHA v2) with site and secret keys (secrets are never sent back to the browser; blank keeps the saved one), days to keep spam. Stored in the `settings` row `forms`.    |
| Block type       | `form`: heading, intro text and a `form` field. Theme component `inertia/blocks/form.tsx`.                                                                                                                                                                                                           |
| Field type       | `form`: a form picker (`inertia/fields/form.tsx`), resolved to the `ResolvedForm` shape below for rendering and the delivery API.                                                                                                                                                                    |
| Dashboard        | “Form submissions · last 7 days” with the unread count and the latest submissions.                                                                                                                                                                                                                   |
| Trash            | Deleted forms go to the trash (`kind: form`) with their submissions; purging removes their files too.                                                                                                                                                                                                |
| Permissions      | Group “Forms”: `forms:read`, `forms:write`, `forms:delete`, `submissions:read`, `submissions:delete`. Defaults: Editor gets all, Author, Production site and Agent get `forms:read`.                                                                                                                 |
| Provides         | `publishedForms` (count of live forms) and `spamProtection` (a captcha is configured) for site health.                                                                                                                                                                                               |
| Nightly          | Deletes spam older than the retention setting.                                                                                                                                                                                                                                                       |
| Bootstrap        | Creates a published “Contact us” form (slug `contact`: name, email, phone, message) when no form exists.                                                                                                                                                                                             |

## Field types

Short text, email, phone, long text, dropdown, multiple choice (radio), checkbox, number, date and
file upload (10 MB, optional list of allowed extensions). Field names are lowercase snake case;
`website`, `cf-turnstile-response`, `g-recaptcha-response` and `page_url` are reserved.

## Emails

Each form has two emails, each with an on/off switch, a subject and a Markdown body:

- **Notification** to the form’s recipients (or Settings › Forms’ default recipients), with
  reply-to taken from an answer.
- **Confirmation** to the visitor, sent to the address in the chosen email field (the first email
  field by default).

Placeholders: `{{<field name>}}`, `{{answers}}` (every answer as a table), `{{form_title}}`,
`{{form_slug}}`, `{{submission_id}}`, `{{submitted_at}}`, `{{ip}}`, `{{page_url}}`,
`{{site_name}}`. Answers are HTML-escaped. Emails render with `forms::emails/form_submission`
(Edge disk `forms` is mounted on `resources/views`) and carry the site logo when the Media plugin
provides one. They are sent from queued jobs (`SendFormEmailJob`, one per email, 3 retries); the
result is recorded on the submission.

## Webhook

When a form has a webhook URL, each new (non-spam) submission is POSTed as JSON by
`PostFormWebhookJob` through `safeFetch` (private addresses refused; the URL is checked on save):

```json
{
  "event": "submission.created",
  "form": { "id": 3, "slug": "quote", "title": "Quote" },
  "submission": {
    "id": 12,
    "data": {
      "name": "Jane",
      "attachment": {
        "name": "brief.pdf",
        "size": 1234,
        "type": "application/pdf",
        "url": "https://cms.example.com/admin/submissions/12/files/attachment"
      }
    },
    "pageUrl": "https://example.com/contact",
    "createdAt": "2026-10-09T22:06:43.713+00:00",
    "url": "https://cms.example.com/admin/submissions/12"
  }
}
```

## Public submission endpoint

`POST /forms/:slug` (route `public.forms.submit`, 10 requests per minute per IP, exempt from CSRF so
headless frontends can post to it).

- Body: urlencoded, multipart (needed for file fields) or JSON. One key per field name, plus
  `website` (honeypot, must be empty), the captcha token (`cf-turnstile-response` or
  `g-recaptcha-response`, when a captcha is configured) and optionally `page_url`.
- `Accept: application/json` (without `X-Inertia`):
  - `200 {"ok": true, "message": "<success message>", "redirect": "<submitUrl or null>"}`
  - `422 {"errors": [{"field": "email", "message": "Email must be a valid email address", "rule": "email"}]}`
  - `404 {"ok": false, "message": "This form is not accepting submissions"}` for drafts, trashed
    forms, unknown slugs or while the plugin is off
  - `429` when rate limited
- Inertia (the Form block): errors come back as Inertia validation errors; on success it flashes
  `formSuccess` and redirects back, or visits the form’s redirect URL.
- A plain HTML post redirects back (or to the redirect URL).
- A filled honeypot answers like a success but stores the submission as spam, without emails or
  webhook.

## Delivery API

`GET /api/v1/forms` and `GET /api/v1/forms/:slug` (token with `forms:read`) return published forms
as `ResolvedForm`:

```ts
{ id, slug, title, fields, submitLabel, successMessage, submitUrl,
  action, honeypot: 'website', captcha: { provider: 'turnstile' | 'recaptcha', siteKey, field } | null }
```

`action` is absolute here; inside resolved page blocks it is the relative `/forms/:slug`.

## Actions

Audited (and emitted to plugin listeners): `form.created`, `form.updated`, `form.published`,
`form.unpublished`, `form.trashed`, `form.submissions_exported`, `submission.created`,
`submission.deleted`, `submission.marked_<status>`, `submission.bulk_deleted`,
`submission.bulk_marked_<status>`, `settings.updated` (with `section: 'forms'`).

## Data

Tables `forms` (adds `submit_url`, `webhook_url`, `deleted_at`), `form_emails` (per form and kind)
and `form_submissions` (adds `status` new/read/spam, `meta`, `updated_at`). Uploaded files live in
`storage/form_uploads/<form id>/` and are only served to signed-in users with `submissions:read`.
