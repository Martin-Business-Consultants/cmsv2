import { marked } from 'marked'
import { cn } from '~/lib/utils'

export const proseClass = cn(
  'text-base leading-7 text-foreground/85 sm:text-[1.0625rem] sm:leading-8',
  '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
  '[&_h1]:mt-0 [&_h1]:mb-6 [&_h1]:text-4xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-foreground sm:[&_h1]:text-5xl',
  '[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground sm:[&_h2]:text-3xl',
  '[&_h3]:mt-10 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground',
  '[&_h4]:mt-8 [&_h4]:mb-2 [&_h4]:font-semibold [&_h4]:text-foreground',
  '[&_p]:my-5',
  '[&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:decoration-foreground/30 [&_a]:underline-offset-4 hover:[&_a]:decoration-foreground',
  '[&_strong]:font-semibold [&_strong]:text-foreground',
  '[&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-2 [&_li]:pl-1 [&_li::marker]:text-muted-foreground',
  '[&_blockquote]:my-8 [&_blockquote]:border-l-2 [&_blockquote]:border-foreground [&_blockquote]:pl-6 [&_blockquote]:text-lg [&_blockquote]:italic [&_blockquote]:text-foreground',
  '[&_hr]:my-12 [&_hr]:border-border',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.875em] [&_code]:text-foreground',
  '[&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-foreground [&_pre]:p-5 [&_pre]:text-sm [&_pre]:leading-6 [&_pre]:text-background',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit',
  '[&_img]:my-8 [&_img]:rounded-xl',
  '[&_table]:my-8 [&_table]:w-full [&_table]:text-sm [&_th]:border-b [&_th]:border-border [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground [&_td]:border-b [&_td]:border-border [&_td]:py-2'
)

export default function Markdown({
  source,
  className,
}: {
  source: string | { html: string } | null | undefined
  className?: string
}) {
  if (!source) return null
  const html =
    typeof source === 'object'
      ? source.html
      : marked.parse(String(source), { async: false, gfm: true, breaks: false })
  return <div className={cn(proseClass, className)} dangerouslySetInnerHTML={{ __html: html }} />
}
