import type { Field, FieldData } from '#types/content'

export type PageTemplate = {
  key: string
  title: string
  slug: string
  description: string
  icon: string
  blocks: { type: string; data: FieldData }[]
}

export type CollectionTemplate = {
  key: string
  name: string
  singularName: string
  slug: string
  urlPrefix: string | null
  description: string
  icon: string
  fields: Field[]
}

type Inline = { type: 'text'; text: string; marks?: { type: string }[] }

function inline(text: string): Inline[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('**') && part.endsWith('**')
        ? { type: 'text', text: part.slice(2, -2), marks: [{ type: 'bold' }] }
        : { type: 'text', text: part }
    )
}

function paragraph(text: string) {
  return { type: 'paragraph', content: inline(text) }
}

export function richText(markdown: string) {
  const content = markdown.split(/\n{2,}/).map((chunk) => {
    const heading = chunk.match(/^(#{1,6}) (.*)$/)
    if (heading) {
      return {
        type: 'heading',
        attrs: { level: heading[1].length },
        content: inline(heading[2]),
      }
    }
    const lines = chunk.split('\n')
    if (lines.every((line) => line.startsWith('- '))) {
      return {
        type: 'bulletList',
        content: lines.map((line) => ({ type: 'listItem', content: [paragraph(line.slice(2))] })),
      }
    }
    if (lines.every((line) => line.startsWith('> '))) {
      return {
        type: 'blockquote',
        content: [paragraph(lines.map((line) => line.slice(2)).join(' '))],
      }
    }
    return paragraph(chunk)
  })
  return { type: 'doc', content }
}

const url = (value: string) => ({ kind: 'url', value })

const button = (label: string, href: string, style = 'primary') => ({
  label,
  url: url(href),
  style,
})

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    key: 'home',
    title: 'Home',
    slug: 'home',
    description: 'Hero, supporting sections, and a closing call to action.',
    icon: 'house',
    blocks: [
      {
        type: 'hero',
        data: {
          heading: 'Lead with your strongest line.',
          subheading: 'A clear sub-headline that supports the hero. Two lines max.',
          ctas: [button('Get started', '/')],
        },
      },
      {
        type: 'media_text',
        data: {
          heading: 'Pair an image with words.',
          body: richText('A two-column section that places an image alongside supporting copy.'),
          side: 'right',
          background: 'none',
        },
      },
      {
        type: 'feature_grid',
        data: {
          heading: 'Why this works',
          columns: '3',
          items: [
            { title: 'First benefit', body: 'One short sentence that captures the user value.' },
            { title: 'Second benefit', body: 'Another sharp benefit. Three is the sweet spot.' },
            { title: 'Third benefit', body: 'Keep them parallel in length and structure.' },
          ],
        },
      },
      {
        type: 'cta_band',
        data: {
          heading: 'Ready to take the next step?',
          body: 'Wrap up the page with a clear call to action.',
          background: 'primary',
          ctas: [button('Get started', '/')],
        },
      },
    ],
  },
  {
    key: 'about',
    title: 'About',
    slug: 'about',
    description: 'Story, values, stats, and a contact prompt.',
    icon: 'info',
    blocks: [
      {
        type: 'hero',
        data: {
          heading: 'About us',
          subheading: "The short version of who we are and what we're building.",
        },
      },
      {
        type: 'text',
        data: {
          body: richText(
            "## Our story\n\nReplace this with the long-form narrative of how the company began, what drives the team, and where you're headed."
          ),
        },
      },
      {
        type: 'feature_grid',
        data: {
          heading: 'What we value',
          columns: '3',
          items: [
            { title: 'Craft', body: 'We sweat the details so the result feels effortless.' },
            {
              title: 'Honesty',
              body: "We tell customers and teammates the truth, even when it's awkward.",
            },
            {
              title: 'Curiosity',
              body: "We're never done learning. Every project teaches us something.",
            },
          ],
        },
      },
      {
        type: 'stats_section',
        data: {
          heading: 'By the numbers',
          stats: [
            { value: '10+', label: 'Years experience' },
            { value: '1,000+', label: 'Happy customers' },
            { value: '98%', label: 'Satisfaction rate' },
          ],
        },
      },
      {
        type: 'cta_band',
        data: {
          heading: 'Want to work together?',
          background: 'muted',
          ctas: [button('Get in touch', '/contact')],
        },
      },
    ],
  },
  {
    key: 'contact',
    title: 'Contact',
    slug: 'contact',
    description: 'Intro, contact details, and a prompt to reach out.',
    icon: 'mail',
    blocks: [
      {
        type: 'hero',
        data: {
          heading: 'Get in touch',
          subheading: 'We read every message and reply within one business day.',
        },
      },
      {
        type: 'text',
        data: {
          body: richText(
            '## How to reach us\n\n- **Email:** hello@example.com\n- **Phone:** (555) 123-4567\n- **Hours:** Mon – Fri, 9am – 5pm'
          ),
        },
      },
      {
        type: 'cta_band',
        data: {
          heading: 'Prefer something else?',
          body: 'Find us on social, or book a call directly.',
          background: 'accent',
          ctas: [button('Book a call', '/')],
        },
      },
    ],
  },
  {
    key: 'pricing',
    title: 'Pricing',
    slug: 'pricing',
    description: 'Hero, three-tier plans, and a final CTA.',
    icon: 'tag',
    blocks: [
      {
        type: 'hero',
        data: {
          heading: 'Simple, transparent pricing',
          subheading: 'Pick the plan that fits today. Change any time.',
        },
      },
      {
        type: 'feature_grid',
        data: {
          heading: 'Plans',
          columns: '3',
          items: [
            { title: 'Starter', body: '$0 / month — for individuals giving it a try.' },
            { title: 'Pro', body: '$29 / month — for serious projects and small teams.' },
            { title: 'Enterprise', body: 'Custom — SSO, audit, dedicated support.' },
          ],
        },
      },
      {
        type: 'cta_band',
        data: {
          heading: 'Still deciding?',
          body: 'Try Pro free for 14 days. No credit card required.',
          background: 'primary',
          ctas: [button('Start free trial', '/')],
        },
      },
    ],
  },
  {
    key: 'features',
    title: 'Features',
    slug: 'features',
    description: 'Capabilities grid plus deep-dives on the headline ones.',
    icon: 'sparkles',
    blocks: [
      {
        type: 'hero',
        data: {
          heading: 'Everything you need to ship',
          subheading: 'The full toolset, without the bloat.',
        },
      },
      {
        type: 'feature_grid',
        data: {
          heading: 'Built for the work',
          columns: '3',
          items: [
            { title: 'Fast', body: 'Sub-second load times across every page.' },
            { title: 'Composable', body: 'Drop blocks together — no templates to fight.' },
            { title: 'Collaborative', body: 'Real-time co-editing with audit history.' },
            { title: 'Searchable', body: 'Full-text search across every collection.' },
            { title: 'Internationalized', body: 'First-class locale support.' },
            { title: 'API-first', body: 'Everything you see in the UI is available via API.' },
          ],
        },
      },
      {
        type: 'media_text',
        data: {
          heading: 'A closer look at composition',
          body: richText(
            'Pages, collections, and globals share the same field DSL. Learn it once.'
          ),
          side: 'left',
          background: 'muted',
        },
      },
      {
        type: 'cta_band',
        data: {
          heading: 'See it in action',
          background: 'primary',
          ctas: [button('Watch demo', '/')],
        },
      },
    ],
  },
  {
    key: 'services',
    title: 'Services',
    slug: 'services',
    description: 'Service grid with a deeper feature spotlight.',
    icon: 'briefcase',
    blocks: [
      {
        type: 'hero',
        data: {
          heading: 'What we do',
          subheading: 'End-to-end services tailored to your stage.',
        },
      },
      {
        type: 'feature_grid',
        data: {
          heading: 'Services',
          columns: '3',
          items: [
            { title: 'Strategy', body: 'Brand, positioning, and go-to-market planning.' },
            { title: 'Design', body: 'Identity, web, and product design systems.' },
            { title: 'Engineering', body: 'Web, mobile, and backend builds from scratch.' },
          ],
        },
      },
      {
        type: 'media_text',
        data: {
          heading: 'Our process',
          body: richText('Discovery → design → build → launch. Tight loops, clear handoffs.'),
          side: 'right',
          background: 'none',
        },
      },
      {
        type: 'cta_band',
        data: {
          heading: 'Have a project in mind?',
          background: 'accent',
          ctas: [button('Start the conversation', '/contact')],
        },
      },
    ],
  },
  {
    key: 'team',
    title: 'Team',
    slug: 'team',
    description: 'Intro and copy block for team bios. Pair with a Team Members collection.',
    icon: 'users',
    blocks: [
      {
        type: 'hero',
        data: {
          heading: 'Meet the team',
          subheading: 'Engineers, designers, and builders. Reach any of us directly.',
        },
      },
      {
        type: 'text',
        data: {
          body: richText(
            'Add a paragraph here describing your culture or how the team works together — then list members below.'
          ),
        },
      },
      {
        type: 'cta_band',
        data: {
          heading: "We're hiring",
          body: 'Open roles across engineering and design.',
          background: 'muted',
          ctas: [button('See open roles', '/jobs')],
        },
      },
    ],
  },
  {
    key: 'blog_index',
    title: 'Blog',
    slug: 'blog',
    description: 'Hero plus an auto-list of entries from a Posts collection.',
    icon: 'newspaper',
    blocks: [
      {
        type: 'hero',
        data: {
          heading: 'Writing',
          subheading: 'Notes, essays, and changelog from the team.',
        },
      },
      {
        type: 'collection_list',
        data: {
          collection_slug: 'posts',
          heading: 'Latest posts',
          filter_status: 'published',
          sort_by: 'published_at',
          sort_dir: 'desc',
          limit: 0,
          layout: 'grid',
        },
      },
    ],
  },
  {
    key: 'case_studies_index',
    title: 'Case Studies',
    slug: 'case-studies',
    description: 'Hero plus an auto-list of Case Study entries.',
    icon: 'chart-column',
    blocks: [
      {
        type: 'hero',
        data: {
          heading: 'Customer stories',
          subheading: 'How teams use the product to ship faster.',
        },
      },
      {
        type: 'collection_list',
        data: {
          collection_slug: 'case-studies',
          heading: 'Recent case studies',
          filter_status: 'published',
          sort_by: 'published_at',
          sort_dir: 'desc',
          limit: 0,
          layout: 'featured-first',
        },
      },
    ],
  },
  {
    key: 'faq',
    title: 'FAQ',
    slug: 'faq',
    description: 'Common questions in markdown. Replace inline or wire to an FAQ collection.',
    icon: 'circle-help',
    blocks: [
      {
        type: 'hero',
        data: {
          heading: 'Questions',
          subheading: 'The ones we hear most.',
        },
      },
      {
        type: 'text',
        data: {
          body: richText(
            "## How do I get started?\n\nClick the **Get started** button above and follow the prompts.\n\n## Can I cancel any time?\n\nYes. There are no contracts — cancel from your account settings in one click.\n\n## Do you offer refunds?\n\nWithin 30 days of purchase, yes. Email support and we'll take care of it."
          ),
        },
      },
      {
        type: 'cta_band',
        data: {
          heading: 'Still stuck?',
          body: 'Reach out — we read every message.',
          background: 'muted',
          ctas: [button('Contact support', '/contact')],
        },
      },
    ],
  },
  {
    key: 'privacy',
    title: 'Privacy Policy',
    slug: 'privacy',
    description: "Long-form legal page — placeholder copy you'll need to replace.",
    icon: 'shield',
    blocks: [
      {
        type: 'hero',
        data: {
          heading: 'Privacy policy',
          subheading: 'Last updated: replace with your effective date.',
        },
      },
      {
        type: 'text',
        data: {
          body: richText(
            '## Information we collect\n\nReplace this with a description of the personal data your product collects from users and customers.\n\n## How we use it\n\nDescribe the purposes for which data is processed.\n\n## Your rights\n\nLink to a contact path for data-subject requests (access, deletion, portability).\n\n> This template is a starting structure — consult counsel before publishing.'
          ),
        },
      },
    ],
  },
  {
    key: 'terms',
    title: 'Terms of Service',
    slug: 'terms',
    description: "Long-form legal page — placeholder copy you'll need to replace.",
    icon: 'file-text',
    blocks: [
      {
        type: 'hero',
        data: {
          heading: 'Terms of service',
          subheading: 'Last updated: replace with your effective date.',
        },
      },
      {
        type: 'text',
        data: {
          body: richText(
            "## Acceptance\n\nReplace with the basis on which users accept these terms.\n\n## Use of the service\n\nDescribe what's permitted and what isn't.\n\n## Liability\n\nNote your limits of liability and warranty disclaimers.\n\n> This template is a starting structure — consult counsel before publishing."
          ),
        },
      },
    ],
  },
  {
    key: 'not_found',
    title: 'Not Found',
    slug: '404',
    description: 'Friendly 404 with a path back to the home page.',
    icon: 'triangle-alert',
    blocks: [
      {
        type: 'hero',
        data: {
          heading: "We can't find that page",
          subheading: 'The link may be old, or the page moved. Try one of these instead.',
        },
      },
      {
        type: 'cta_band',
        data: {
          heading: 'Get back on track',
          background: 'primary',
          ctas: [button('Go home', '/'), button('Contact us', '/contact', 'secondary')],
        },
      },
    ],
  },
  {
    key: 'coming_soon',
    title: 'Coming Soon',
    slug: 'coming-soon',
    description: 'Pre-launch teaser with a single CTA.',
    icon: 'rocket',
    blocks: [
      {
        type: 'hero',
        data: {
          heading: 'Something new is coming',
          subheading: "Drop your email and we'll let you know the moment it's ready.",
        },
      },
      {
        type: 'cta_band',
        data: {
          heading: 'Be the first to know',
          background: 'accent',
          ctas: [button('Notify me', '/')],
        },
      },
    ],
  },
]

const gallery: Field = {
  name: 'gallery',
  label: 'Gallery',
  type: 'repeater',
  of: [
    { name: 'image', label: 'Image', type: 'asset' },
    { name: 'caption', label: 'Caption', type: 'string' },
  ],
}

export const COLLECTION_TEMPLATES: CollectionTemplate[] = [
  {
    key: 'blog_post',
    name: 'Blog Posts',
    singularName: 'Blog Post',
    slug: 'posts',
    urlPrefix: 'blog',
    description: 'Articles with an excerpt, cover image, and author.',
    icon: 'file-text',
    fields: [
      { name: 'excerpt', label: 'Excerpt', type: 'text', help: 'Shown in listings and previews.' },
      { name: 'cover_image', label: 'Cover image', type: 'asset' },
      { name: 'author', label: 'Author', type: 'string' },
    ],
  },
  {
    key: 'news_article',
    name: 'News Articles',
    singularName: 'News Article',
    slug: 'news',
    urlPrefix: 'news',
    description: 'Press releases or third-party news with a source link.',
    icon: 'newspaper',
    fields: [
      { name: 'summary', label: 'Summary', type: 'text' },
      { name: 'source', label: 'Source', type: 'string' },
      { name: 'source_url', label: 'Source URL', type: 'url' },
      { name: 'hero_image', label: 'Hero image', type: 'asset' },
    ],
  },
  {
    key: 'team_member',
    name: 'Team Members',
    singularName: 'Team Member',
    slug: 'team',
    urlPrefix: null,
    description: 'People profiles — photo, role, and social links.',
    icon: 'users',
    fields: [
      { name: 'photo', label: 'Photo', type: 'asset' },
      { name: 'role', label: 'Role', type: 'string' },
      { name: 'email', label: 'Email', type: 'string' },
      { name: 'website', label: 'Website', type: 'url' },
      { name: 'twitter', label: 'Twitter', type: 'string' },
      { name: 'linkedin', label: 'LinkedIn', type: 'url' },
    ],
  },
  {
    key: 'product',
    name: 'Products',
    singularName: 'Product',
    slug: 'products',
    urlPrefix: 'products',
    description: 'Catalog items with SKU, price, and gallery.',
    icon: 'package',
    fields: [
      { name: 'sku', label: 'SKU', type: 'string', required: true },
      { name: 'price', label: 'Price', type: 'string', help: 'Display price (e.g. $19.99).' },
      { name: 'in_stock', label: 'In stock', type: 'boolean' },
      { name: 'category', label: 'Category', type: 'string' },
      gallery,
    ],
  },
  {
    key: 'event',
    name: 'Events',
    singularName: 'Event',
    slug: 'events',
    urlPrefix: 'events',
    description: 'Scheduled events with start/end and location.',
    icon: 'calendar',
    fields: [
      { name: 'starts_at', label: 'Starts at', type: 'datetime', required: true },
      { name: 'ends_at', label: 'Ends at', type: 'datetime' },
      { name: 'location', label: 'Location', type: 'string' },
      { name: 'ticket_url', label: 'Ticket URL', type: 'url' },
      { name: 'cover', label: 'Cover', type: 'asset' },
    ],
  },
  {
    key: 'faq',
    name: 'FAQs',
    singularName: 'FAQ',
    slug: 'faqs',
    urlPrefix: null,
    description: 'Questions (entry title) and answers (body) with a category.',
    icon: 'circle-help',
    fields: [{ name: 'category', label: 'Category', type: 'string' }],
  },
  {
    key: 'testimonial',
    name: 'Testimonials',
    singularName: 'Testimonial',
    slug: 'testimonials',
    urlPrefix: null,
    description: 'Customer quotes with attribution and photo.',
    icon: 'quote',
    fields: [
      { name: 'author_title', label: 'Author title', type: 'string' },
      { name: 'company', label: 'Company', type: 'string' },
      { name: 'photo', label: 'Photo', type: 'asset' },
    ],
  },
  {
    key: 'case_study',
    name: 'Case Studies',
    singularName: 'Case Study',
    slug: 'case-studies',
    urlPrefix: 'case-studies',
    description: 'Long-form customer stories — challenge, solution, results.',
    icon: 'chart-column',
    fields: [
      { name: 'client', label: 'Client', type: 'string' },
      { name: 'summary', label: 'Summary', type: 'text' },
      { name: 'cover', label: 'Cover', type: 'asset' },
    ],
  },
  {
    key: 'press_mention',
    name: 'Press Mentions',
    singularName: 'Press Mention',
    slug: 'press',
    urlPrefix: null,
    description: 'External coverage with publication and link.',
    icon: 'megaphone',
    fields: [
      { name: 'publication', label: 'Publication', type: 'string', required: true },
      { name: 'url', label: 'URL', type: 'url', required: true },
      { name: 'excerpt', label: 'Excerpt', type: 'text' },
      { name: 'logo', label: 'Logo', type: 'asset' },
      { name: 'published_on', label: 'Published on', type: 'datetime' },
    ],
  },
  {
    key: 'recipe',
    name: 'Recipes',
    singularName: 'Recipe',
    slug: 'recipes',
    urlPrefix: 'recipes',
    description: 'Cooking instructions with ingredients and times.',
    icon: 'chef-hat',
    fields: [
      { name: 'description', label: 'Description', type: 'text' },
      { name: 'prep_time_minutes', label: 'Prep time (min)', type: 'integer' },
      { name: 'cook_time_minutes', label: 'Cook time (min)', type: 'integer' },
      { name: 'servings', label: 'Servings', type: 'integer' },
      { name: 'hero_image', label: 'Hero image', type: 'asset' },
      {
        name: 'ingredients',
        label: 'Ingredients',
        type: 'repeater',
        of: [
          { name: 'quantity', label: 'Quantity', type: 'string' },
          { name: 'item', label: 'Item', type: 'string' },
        ],
      },
    ],
  },
  {
    key: 'job_posting',
    name: 'Job Postings',
    singularName: 'Job Posting',
    slug: 'jobs',
    urlPrefix: 'jobs',
    description: 'Open roles with department, location, and apply link.',
    icon: 'briefcase',
    fields: [
      { name: 'department', label: 'Department', type: 'string' },
      { name: 'location', label: 'Location', type: 'string' },
      {
        name: 'employment_type',
        label: 'Employment type',
        type: 'select',
        options: ['Full-time', 'Part-time', 'Contract', 'Internship'],
      },
      { name: 'apply_url', label: 'Apply URL', type: 'url' },
    ],
  },
  {
    key: 'portfolio_project',
    name: 'Portfolio Projects',
    singularName: 'Portfolio Project',
    slug: 'projects',
    urlPrefix: 'projects',
    description: 'Case-study-lite — cover, gallery, and project link.',
    icon: 'layout-grid',
    fields: [
      { name: 'client', label: 'Client', type: 'string' },
      { name: 'summary', label: 'Summary', type: 'text' },
      { name: 'cover_image', label: 'Cover image', type: 'asset' },
      { name: 'project_url', label: 'Project URL', type: 'url' },
      gallery,
    ],
  },
  {
    key: 'location',
    name: 'Locations',
    singularName: 'Location',
    slug: 'locations',
    urlPrefix: null,
    description: 'Physical places with address, hours, and map.',
    icon: 'map-pin',
    fields: [
      { name: 'address', label: 'Address', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'string' },
      { name: 'email', label: 'Email', type: 'string' },
      { name: 'hours', label: 'Hours', type: 'markdown' },
      { name: 'map_url', label: 'Map URL', type: 'url' },
      { name: 'photo', label: 'Photo', type: 'asset' },
    ],
  },
]
