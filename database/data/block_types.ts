import type { BlockTypeOption } from '#types/content'

export const DEFAULT_BLOCK_TYPES: BlockTypeOption[] = [
  {
    slug: 'hero',
    label: 'Hero',
    category: 'Sections',
    description: 'A full-width opening section with heading, sub-headline, image, and CTAs.',
    icon: 'layout-template',
    fields: [
      {
        name: 'heading',
        label: 'Heading',
        type: 'string',
        required: true,
      },
      {
        name: 'subheading',
        label: 'Subheading',
        type: 'text',
      },
      {
        name: 'image_id',
        label: 'Image',
        type: 'asset',
      },
      {
        name: 'ctas',
        label: 'Buttons',
        type: 'repeater',
        of: [
          {
            name: 'label',
            label: 'Label',
            type: 'string',
            required: true,
          },
          {
            name: 'url',
            label: 'Link',
            type: 'link',
            required: true,
          },
          {
            name: 'style',
            label: 'Style',
            type: 'select',
            required: true,
            options: ['primary', 'secondary', 'ghost'],
          },
        ],
      },
    ],
    defaults: {
      heading: 'Lead with your strongest line.',
      subheading: 'A clear sub-headline that supports the hero. Two lines max.',
      ctas: [
        {
          label: 'Get started',
          url: {
            kind: 'url',
            value: '/',
          },
          style: 'primary',
        },
      ],
    },
  },
  {
    slug: 'media_text',
    label: 'Media + text',
    category: 'Sections',
    description:
      'Two-column section pairing an image with supporting copy. Pick which side the image sits on.',
    icon: 'panels-left-right',
    fields: [
      {
        name: 'heading',
        label: 'Heading',
        type: 'string',
        required: true,
      },
      {
        name: 'body',
        label: 'Body',
        type: 'richtext',
        required: true,
      },
      {
        name: 'image_id',
        label: 'Image',
        type: 'asset',
      },
      {
        name: 'side',
        label: 'Image side',
        type: 'select',
        required: true,
        help: 'Which side of the row the image sits on.',
        options: ['right', 'left'],
      },
      {
        name: 'background',
        label: 'Background',
        type: 'select',
        required: true,
        options: ['none', 'muted', 'accent'],
      },
      {
        name: 'cta_label',
        label: 'CTA label',
        type: 'string',
      },
      {
        name: 'cta_url',
        label: 'CTA link',
        type: 'link',
      },
    ],
    defaults: {
      heading: 'Pair an image with words.',
      body: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'A two-column section that places an image alongside supporting copy. Use it for product highlights, feature explanations, or about-section narratives.',
              },
            ],
          },
        ],
      },
      side: 'right',
      background: 'none',
    },
  },
  {
    slug: 'feature_grid',
    label: 'Feature grid',
    category: 'Sections',
    description:
      'A grid of icon + title + body cards. Use for benefits, services, or capabilities summaries.',
    icon: 'layout-grid',
    fields: [
      {
        name: 'heading',
        label: 'Heading',
        type: 'string',
      },
      {
        name: 'body',
        label: 'Intro',
        type: 'text',
      },
      {
        name: 'columns',
        label: 'Columns',
        type: 'select',
        required: true,
        options: ['2', '3', '4'],
      },
      {
        name: 'items',
        label: 'Items',
        type: 'repeater',
        required: true,
        of: [
          {
            name: 'icon',
            label: 'Icon (lucide)',
            type: 'string',
          },
          {
            name: 'title',
            label: 'Title',
            type: 'string',
            required: true,
          },
          {
            name: 'body',
            label: 'Body',
            type: 'text',
            required: true,
          },
          {
            name: 'link',
            label: 'Link',
            type: 'link',
          },
        ],
      },
    ],
    defaults: {
      heading: 'Why this works',
      columns: '3',
      items: [
        {
          icon: 'Sparkles',
          title: 'First benefit',
          body: 'One short sentence that captures the user value.',
        },
        {
          icon: 'Zap',
          title: 'Second benefit',
          body: 'Another sharp benefit. Three is the sweet spot for scannability.',
        },
        {
          icon: 'Heart',
          title: 'Third benefit',
          body: 'Keep them parallel in length and structure.',
        },
      ],
    },
  },
  {
    slug: 'stats_section',
    label: 'Stats',
    category: 'Sections',
    description: 'Heading + a row of big numbers with labels.',
    icon: 'chart-column',
    fields: [
      {
        name: 'heading',
        label: 'Heading',
        type: 'string',
        required: true,
      },
      {
        name: 'body',
        label: 'Body',
        type: 'text',
      },
      {
        name: 'image_id',
        label: 'Image',
        type: 'asset',
      },
      {
        name: 'stats',
        label: 'Stats',
        type: 'repeater',
        required: true,
        of: [
          {
            name: 'value',
            label: 'Value',
            type: 'string',
            required: true,
            help: 'Display string, e.g. "98%" or "8,000+"',
          },
          {
            name: 'label',
            label: 'Label',
            type: 'string',
            required: true,
          },
        ],
      },
    ],
    defaults: {
      heading: 'By the numbers',
      stats: [
        {
          value: '10+',
          label: 'Years experience',
        },
        {
          value: '1,000+',
          label: 'Happy customers',
        },
        {
          value: '98%',
          label: 'Satisfaction rate',
        },
      ],
    },
  },
  {
    slug: 'cta_band',
    label: 'CTA band',
    category: 'Sections',
    description:
      'A bold full-width band with a heading, optional body, and call-to-action buttons.',
    icon: 'megaphone',
    fields: [
      {
        name: 'heading',
        label: 'Heading',
        type: 'string',
        required: true,
      },
      {
        name: 'body',
        label: 'Body',
        type: 'text',
      },
      {
        name: 'ctas',
        label: 'Buttons',
        type: 'repeater',
        required: true,
        of: [
          {
            name: 'label',
            label: 'Label',
            type: 'string',
            required: true,
          },
          {
            name: 'url',
            label: 'Link',
            type: 'link',
            required: true,
          },
          {
            name: 'style',
            label: 'Style',
            type: 'select',
            required: true,
            options: ['primary', 'secondary', 'ghost'],
          },
        ],
      },
      {
        name: 'background',
        label: 'Background',
        type: 'select',
        required: true,
        options: ['primary', 'muted', 'accent'],
      },
    ],
    defaults: {
      heading: 'Ready to take the next step?',
      body: 'Wrap up the page with a clear call to action.',
      ctas: [
        {
          label: 'Get started',
          url: {
            kind: 'url',
            value: '/',
          },
          style: 'primary',
        },
      ],
      background: 'primary',
    },
  },
  {
    slug: 'collection_list',
    label: 'Collection list',
    category: 'Content',
    description: 'Auto-list entries from a collection. Filter, sort, group, choose a layout.',
    icon: 'list',
    version: 2,
    fields: [
      {
        name: 'collection_slug',
        label: 'Collection',
        type: 'string',
        required: true,
        help: 'Slug of the collection to list (e.g. "posts").',
      },
      { name: 'heading', label: 'Heading', type: 'string' },
      { name: 'body', label: 'Intro', type: 'text' },
      {
        name: 'filter_status',
        label: 'Status filter',
        type: 'select',
        options: ['published', 'any'],
        required: true,
        help: 'Limit to published entries (default) or include drafts/archived too.',
      },
      {
        name: 'filter_tags',
        label: 'Filter tags',
        type: 'string',
        help: 'Comma-separated. Entries must have all listed tags.',
      },
      {
        name: 'sort_by',
        label: 'Sort by',
        type: 'select',
        options: ['published_at', 'updated_at', 'created_at', 'title'],
        required: true,
      },
      {
        name: 'sort_dir',
        label: 'Direction',
        type: 'select',
        options: ['desc', 'asc'],
        required: true,
      },
      {
        name: 'limit',
        label: 'Limit',
        type: 'integer',
        help: 'Max entries to show. Leave 0 / blank for all.',
      },
      {
        name: 'group_by',
        label: 'Group by',
        type: 'string',
        help: 'Optional field to group entries by (e.g. "section"), or "category" / "tags".',
      },
      {
        name: 'layout',
        label: 'Layout',
        type: 'select',
        options: ['grid', 'list', 'featured-first'],
        required: true,
      },
    ],
    defaults: {
      filter_status: 'published',
      sort_by: 'published_at',
      sort_dir: 'desc',
      limit: 0,
      layout: 'grid',
    },
  },
  {
    slug: 'text',
    label: 'Text',
    category: 'Content',
    description: 'A body of rich text with headings, lists, links, quotes and images.',
    icon: 'align-left',
    fields: [
      {
        name: 'body',
        label: 'Body',
        type: 'richtext',
        required: true,
      },
    ],
    defaults: {
      body: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Your section heading' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Replace this paragraph with your content.' }],
          },
        ],
      },
    },
  },
  {
    slug: 'quote',
    label: 'Quote',
    category: 'Content',
    description: 'A pull-quote with optional attribution.',
    icon: 'quote',
    fields: [
      {
        name: 'text',
        label: 'Quote',
        type: 'text',
        required: true,
      },
      {
        name: 'attribution',
        label: 'Attribution',
        type: 'string',
      },
    ],
    defaults: {
      text: 'A bold pull-quote captures the essential idea on the page. Trim to one sentence; let it breathe.',
      attribution: '\u2014 Source name',
    },
  },
  {
    slug: 'gallery',
    label: 'Gallery',
    category: 'Media',
    description: 'An image gallery.',
    icon: 'images',
    fields: [
      {
        name: 'items',
        label: 'Images',
        type: 'repeater',
        required: true,
        of: [
          {
            name: 'asset_id',
            label: 'Image',
            type: 'asset',
            required: true,
          },
          {
            name: 'caption',
            label: 'Caption',
            type: 'string',
          },
        ],
      },
    ],
    defaults: {},
  },
  {
    slug: 'divider',
    label: 'Divider',
    category: 'Layout',
    description: 'A horizontal rule between sections.',
    icon: 'minus',
    fields: [
      {
        name: 'style',
        label: 'Style',
        type: 'select',
        required: true,
        options: ['solid', 'dashed', 'dotted'],
      },
    ],
    defaults: {
      style: 'solid',
    },
  },
  {
    slug: 'contact_info',
    label: 'Contact info',
    category: 'Sections',
    description:
      "Hours, address, phone, email \u2014 pulled live from the General global. Drop on any page that should display the site's contact details.",
    icon: 'phone',
    fields: [
      {
        name: 'heading',
        label: 'Heading',
        type: 'string',
        help: 'Optional section heading. Leave blank to omit.',
      },
      {
        name: 'body',
        label: 'Intro',
        type: 'text',
      },
    ],
    defaults: {
      heading: 'Visit Us',
    },
  },
]

export const DEPRECATED_BLOCK_TYPES: BlockTypeOption[] = [
  {
    slug: 'heading',
    label: 'Heading',
    category: 'Text',
    description: "Single H1–H6. Prefer using the Text block's markdown headings.",
    icon: 'heading',
    deprecated: true,
    fields: [
      {
        name: 'level',
        label: 'Level',
        type: 'select',
        options: ['1', '2', '3', '4', '5', '6'],
        required: true,
      },
      { name: 'text', label: 'Text', type: 'string', required: true },
    ],
    defaults: { level: '2', text: 'Heading' },
  },
  {
    slug: 'image',
    label: 'Image',
    category: 'Media',
    description: 'Single image. Prefer Media + text or Gallery for richer layouts.',
    icon: 'image',
    deprecated: true,
    fields: [
      { name: 'asset_id', label: 'Image', type: 'asset', required: true },
      { name: 'alt', label: 'Alt text', type: 'string', required: true },
      { name: 'caption', label: 'Caption', type: 'string' },
    ],
    defaults: {},
  },
  {
    slug: 'embed',
    label: 'Embed',
    category: 'Media',
    description: 'YouTube / Vimeo / Twitter embed. Folded into Text via markdown shortcodes.',
    icon: 'video',
    deprecated: true,
    fields: [
      { name: 'url', label: 'URL', type: 'url', required: true },
      {
        name: 'kind',
        label: 'Kind',
        type: 'select',
        options: ['youtube', 'vimeo', 'twitter', 'other'],
        required: true,
      },
    ],
    defaults: { kind: 'youtube' },
  },
  {
    slug: 'cta',
    label: 'Call to action',
    category: 'Action',
    description: 'A single button. Prefer Hero or CTA band for full sections.',
    icon: 'mouse-pointer-click',
    deprecated: true,
    fields: [
      { name: 'label', label: 'Label', type: 'string', required: true },
      { name: 'url', label: 'Link', type: 'link', required: true },
      {
        name: 'style',
        label: 'Style',
        type: 'select',
        options: ['primary', 'secondary', 'ghost'],
        required: true,
      },
    ],
    defaults: { label: 'Get started', url: { kind: 'url', value: '/' }, style: 'primary' },
  },
  {
    slug: 'columns',
    label: 'Columns',
    category: 'Layout',
    description: 'Generic N-column container. Prefer purpose-built layout blocks.',
    icon: 'columns-3',
    deprecated: true,
    fields: [
      {
        name: 'column_count',
        label: 'Columns',
        type: 'select',
        options: ['2', '3', '4'],
        required: true,
      },
      { name: 'items', label: 'Blocks', type: 'blocks', required: true },
    ],
    defaults: { column_count: '2' },
  },
  {
    slug: 'feature_list',
    label: 'Feature list',
    category: 'Content',
    description: 'Heading + body + bullet list. Prefer Feature grid for richer layouts.',
    icon: 'list-checks',
    deprecated: true,
    fields: [
      { name: 'heading', label: 'Heading', type: 'string', required: true },
      { name: 'body', label: 'Body', type: 'text' },
      {
        name: 'items',
        label: 'Bullet items',
        type: 'repeater',
        required: true,
        of: [{ name: 'text', label: 'Text', type: 'string', required: true }],
      },
    ],
    defaults: {},
  },
  {
    slug: 'card_grid',
    label: 'Card grid (legacy)',
    category: 'Content',
    description: 'Older card grid with extras (subtitle, image). Prefer Feature grid.',
    icon: 'layout-grid',
    deprecated: true,
    fields: [
      { name: 'heading', label: 'Heading', type: 'string' },
      { name: 'body', label: 'Body', type: 'text' },
      {
        name: 'columns',
        label: 'Columns',
        type: 'select',
        options: ['2', '3', '4'],
        required: true,
      },
      {
        name: 'cards',
        label: 'Cards',
        type: 'repeater',
        required: true,
        of: [
          { name: 'icon', label: 'Icon (lucide)', type: 'string' },
          { name: 'image_id', label: 'Image', type: 'asset' },
          { name: 'title', label: 'Title', type: 'string', required: true },
          { name: 'subtitle', label: 'Subtitle', type: 'string' },
          { name: 'description', label: 'Description', type: 'text' },
          { name: 'link_url', label: 'Link', type: 'link' },
          { name: 'link_label', label: 'Link label', type: 'string' },
        ],
      },
    ],
    defaults: { columns: '3' },
  },
  {
    slug: 'pitch',
    label: 'Pitch',
    category: 'Content',
    description: 'Pain-point pitch with rhetorical questions. Prefer Media + text or CTA band.',
    icon: 'message-square-text',
    deprecated: true,
    fields: [
      { name: 'heading', label: 'Heading', type: 'string', required: true },
      {
        name: 'questions',
        label: 'Questions',
        type: 'repeater',
        of: [{ name: 'text', label: 'Question', type: 'string', required: true }],
      },
      { name: 'body', label: 'Body', type: 'text', required: true },
      { name: 'cta_label', label: 'CTA label', type: 'string' },
      { name: 'cta_url', label: 'CTA link', type: 'link' },
      { name: 'image_id', label: 'Image', type: 'asset' },
    ],
    defaults: {},
  },
  {
    slug: 'testimonial_grid',
    label: 'Testimonial grid',
    category: 'Content',
    description:
      'Inline testimonial cards. Prefer a testimonials collection + Collection list block.',
    icon: 'messages-square',
    deprecated: true,
    fields: [
      { name: 'heading', label: 'Heading', type: 'string', required: true },
      { name: 'body', label: 'Body', type: 'text' },
      {
        name: 'testimonials',
        label: 'Testimonials',
        type: 'repeater',
        required: true,
        of: [
          { name: 'rating', label: 'Rating (1–5)', type: 'integer' },
          { name: 'quote', label: 'Quote', type: 'text', required: true },
          { name: 'attribution', label: 'Attribution', type: 'string', required: true },
        ],
      },
    ],
    defaults: {},
  },
  {
    slug: 'partners_grid',
    label: 'Partners grid',
    category: 'Content',
    description: 'Partners picker. Prefer Collection list with the partners collection.',
    icon: 'handshake',
    deprecated: true,
    fields: [
      { name: 'heading', label: 'Heading', type: 'string' },
      { name: 'body', label: 'Body', type: 'text' },
      {
        name: 'partners',
        label: 'Partners',
        type: 'record_refs',
        collection: 'partners',
        required: true,
      },
    ],
    defaults: {},
  },
]

export const STARTER_BLOCK_TYPES: BlockTypeOption[] = [
  ...DEFAULT_BLOCK_TYPES,
  ...DEPRECATED_BLOCK_TYPES,
]
