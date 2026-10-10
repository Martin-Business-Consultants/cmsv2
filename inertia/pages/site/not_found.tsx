import { Link } from '@adonisjs/inertia/react'
import { ArrowLeft } from 'lucide-react'
import type { InertiaProps } from '~/types'
import SeoHead from '~/site/seo_head'
import { Container } from '~/site/section'
import type { SiteNotFoundProps } from '~/site/types'

export default function SiteNotFound({ seo, site }: InertiaProps<SiteNotFoundProps>) {
  return (
    <>
      <SeoHead seo={seo} site={site} />
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(50%_60%_at_50%_0%,var(--color-muted)_0%,transparent_100%)]" />
        <Container className="flex flex-col items-center py-28 text-center sm:py-40">
          <p className="text-8xl font-semibold tracking-tighter text-foreground/10 sm:text-9xl">
            404
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            We couldn’t find that page
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            The page may have moved, or the link might be out of date.
          </p>
          <Link
            route="site.home"
            className="mt-10 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </Container>
      </section>
    </>
  )
}
