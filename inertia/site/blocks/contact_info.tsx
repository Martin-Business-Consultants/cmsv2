import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { usePage } from '@inertiajs/react'
import type { ReactNode } from 'react'
import type { RenderBlock } from '#types/site'
import type { SiteShared } from '~/site/types'
import { Container, Section, SectionHeading } from '~/site/section'

export function ContactDetails({
  contact,
  compact = false,
}: {
  contact: Record<string, any>
  compact?: boolean
}) {
  const items: { icon: ReactNode; label: string; value: ReactNode }[] = []
  if (contact.phone) {
    items.push({
      icon: <Phone className="size-5" />,
      label: 'Phone',
      value: (
        <a href={`tel:${String(contact.phone).replace(/[^\d+]/g, '')}`} className="hover:underline">
          {contact.phone}
        </a>
      ),
    })
  }
  if (contact.email) {
    items.push({
      icon: <Mail className="size-5" />,
      label: 'Email',
      value: (
        <a href={`mailto:${contact.email}`} className="hover:underline">
          {contact.email}
        </a>
      ),
    })
  }
  if (contact.address) {
    items.push({
      icon: <MapPin className="size-5" />,
      label: 'Address',
      value: <span className="whitespace-pre-line">{contact.address}</span>,
    })
  }
  if (contact.hours) {
    items.push({
      icon: <Clock className="size-5" />,
      label: 'Hours',
      value: <span className="whitespace-pre-line">{contact.hours}</span>,
    })
  }
  if (!items.length) return null

  if (compact) {
    return (
      <dl className="space-y-6">
        {items.map((item) => (
          <div key={item.label} className="flex gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
              {item.icon}
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{item.label}</dt>
              <dd className="mt-0.5 font-medium">{item.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    )
  }

  return (
    <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-border bg-card p-7">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            {item.icon}
          </div>
          <dt className="mt-6 text-sm text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 text-lg font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function ContactInfo({ data }: { block: RenderBlock; data: Record<string, any> }) {
  const { site } = usePage<SiteShared>().props
  const resolved = data.contact && typeof data.contact === 'object' ? data.contact : {}
  const contact = {
    ...resolved,
    ...Object.fromEntries(
      Object.entries(site?.globals?.contact ?? site?.globals?.general ?? {}).filter(
        ([, value]) => value !== null && value !== undefined && value !== ''
      )
    ),
  }
  return (
    <Section>
      <Container>
        <SectionHeading heading={data.heading} body={data.body} />
        <ContactDetails contact={contact} />
      </Container>
    </Section>
  )
}
