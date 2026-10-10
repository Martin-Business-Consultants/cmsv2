import type { ReactNode } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { isInternal } from '~/site/utils'

type Props = {
  href: string
  className?: string
  children?: ReactNode
  onClick?: () => void
}

export default function SmartLink({ href, className, children, onClick }: Props) {
  if (isInternal(href)) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {children}
      </Link>
    )
  }
  const external = /^https?:\/\//.test(href)
  return (
    <a
      href={href}
      className={className}
      onClick={onClick}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  )
}
