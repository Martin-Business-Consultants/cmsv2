import { BaseSeeder } from '@adonisjs/lucid/seeders'
import env from '#start/env'
import { DateTime } from 'luxon'
import User from '#models/user'
import Collection from '#models/collection'
import Entry from '#models/entry'
import Global from '#models/global'
import Page from '#models/page'
import db from '@adonisjs/lucid/services/db'
import { settlePlugins } from '#services/plugin_setup'
import { installBlockTypes, installRoles } from '#services/site_bootstrap'
import { updateSettings } from '#services/settings'
import { snapshot } from '#services/pages'
import { snapshot as snapshotEntry } from '#services/entries'

const paragraph = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const heading = (text: string) => ({
  type: 'heading',
  attrs: { level: 2 },
  content: [{ type: 'text', text }],
})
const doc = (...content: Record<string, unknown>[]) => ({ type: 'doc', content })

export default class MainSeeder extends BaseSeeder {
  async run() {
    const admin = await installRoles()

    if (!(await User.query().first())) {
      await User.create({
        fullName: 'Site Admin',
        email: env.get('ADMIN_EMAIL') || 'admin@example.com',
        password: env.get('ADMIN_PASSWORD') || 'password1234',
        roleId: admin.id,
        verifiedAt: DateTime.now(),
      })
    }

    await installBlockTypes()
    await settlePlugins()

    if (await Page.query().first()) return

    await updateSettings({ siteName: 'Acme Home Loans', tagline: 'Home loans, made simple.' })

    await Global.create({
      slug: 'navigation',
      name: 'Navigation',
      description: 'The links in the site header and footer.',
      fields: [
        {
          name: 'header',
          label: 'Header links',
          type: 'repeater',
          of: [{ name: 'link', label: 'Link', type: 'link', required: true }],
        },
        { name: 'footer_text', label: 'Footer text', type: 'text' },
      ],
      data: {
        header: [
          { link: { kind: 'url', value: '/about', label: 'About' } },
          { link: { kind: 'url', value: '/blog', label: 'Blog' } },
          { link: { kind: 'url', value: '/contact', label: 'Contact' } },
        ],
        footer_text: 'Acme Home Loans is a licensed mortgage broker.',
      },
    })
    await Global.create({
      slug: 'contact',
      name: 'Contact details',
      description: 'How visitors reach you.',
      fields: [
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone', type: 'string' },
        { name: 'address', label: 'Address', type: 'text' },
      ],
      data: {
        email: 'hello@example.com',
        phone: '(555) 010-0100',
        address: '1 Main Street\nSpringfield',
      },
    })

    const posts = await Collection.create({
      slug: 'posts',
      name: 'Posts',
      singularName: 'Post',
      description: 'News and articles.',
      icon: 'newspaper',
      urlPrefix: 'blog',
      fields: [
        { name: 'excerpt', label: 'Excerpt', type: 'text' },
        { name: 'cover', label: 'Cover image', type: 'asset' },
        { name: 'body', label: 'Body', type: 'richtext', required: true },
      ],
    })
    const now = DateTime.now()
    const samples = [
      ['How much deposit do you need?', 'Less than you might think.'],
      ['Fixed or variable?', 'What each rate means for your repayments.'],
      ['Refinancing in five steps', 'A plain-English walkthrough.'],
    ]
    for (const [index, [title, excerpt]] of samples.entries()) {
      const entry = await Entry.create({
        collectionId: posts.id,
        title,
        slug: title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
        status: 'published',
        publishedAt: now.minus({ days: index * 7 }),
        data: {
          excerpt,
          body: doc(
            heading(title),
            paragraph(`${excerpt} This is sample content you can edit or delete.`)
          ),
        },
        seo: {},
      })
      await snapshotEntry(entry)
    }

    const contactForm = (await db.connection().schema.hasTable('forms'))
      ? await db.from('forms').where('slug', 'contact').first()
      : null

    const pages = [
      {
        title: 'Home',
        slug: 'home',
        blocks: [
          {
            id: 'hero1',
            type: 'hero',
            data: {
              heading: 'Home loans, made simple.',
              subheading: 'Compare rates from dozens of lenders and get pre-approved in minutes.',
              ctas: [
                { label: 'Get started', url: { kind: 'url', value: '/contact' }, style: 'primary' },
                {
                  label: 'Read the blog',
                  url: { kind: 'url', value: '/blog' },
                  style: 'secondary',
                },
              ],
            },
          },
          {
            id: 'features1',
            type: 'feature_grid',
            data: {
              heading: 'Why Acme',
              columns: '3',
              items: [
                {
                  icon: 'sparkles',
                  title: 'Fast answers',
                  body: 'Pre-approval in minutes, not weeks.',
                },
                {
                  icon: 'shield-check',
                  title: 'No surprises',
                  body: 'Every fee upfront, in writing.',
                },
                {
                  icon: 'heart',
                  title: 'Real people',
                  body: 'One broker from first call to keys.',
                },
              ],
            },
          },
          {
            id: 'posts1',
            type: 'collection_list',
            data: {
              collection_slug: 'posts',
              heading: 'Latest articles',
              filter_status: 'published',
              sort_by: 'published_at',
              sort_dir: 'desc',
              limit: 3,
              layout: 'grid',
            },
          },
          {
            id: 'cta1',
            type: 'cta_band',
            data: {
              heading: 'Ready to talk?',
              body: 'Tell us what you need and we will call you back.',
              background: 'primary',
              ctas: [
                {
                  label: 'Contact us',
                  url: { kind: 'url', value: '/contact' },
                  style: 'secondary',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'About',
        slug: 'about',
        blocks: [
          {
            id: 'about1',
            type: 'text',
            data: {
              body: doc(
                heading('About us'),
                paragraph(
                  'We have helped families buy homes since 2010. Edit this page in the admin.'
                )
              ),
            },
          },
        ],
      },
      {
        title: 'Contact',
        slug: 'contact',
        blocks: [
          contactForm
            ? {
                id: 'form1',
                type: 'form',
                data: {
                  heading: 'Get in touch',
                  body: 'We reply within one business day.',
                  form: contactForm.id,
                },
              }
            : {
                id: 'contact1',
                type: 'contact_info',
                data: { heading: 'Get in touch', body: 'We reply within one business day.' },
              },
        ],
      },
      {
        title: 'Blog',
        slug: 'blog',
        blocks: [
          {
            id: 'blog1',
            type: 'collection_list',
            data: {
              collection_slug: 'posts',
              heading: 'Blog',
              filter_status: 'published',
              sort_by: 'published_at',
              sort_dir: 'desc',
              limit: 24,
              layout: 'list',
            },
          },
        ],
      },
    ]

    for (const values of pages) {
      const page = await Page.create({
        ...values,
        path: values.slug,
        status: 'published',
        publishedAt: now,
        seo: {},
      })
      await snapshot(page)
    }
  }
}
