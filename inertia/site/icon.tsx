import { DynamicIcon, iconNames, type IconName } from 'lucide-react/dynamic'
import { kebab } from '~/site/utils'

const known = new Set<string>(iconNames)

export default function SiteIcon({
  name,
  className,
}: {
  name?: string | null
  className?: string
}) {
  const icon = name ? kebab(name) : ''
  if (!known.has(icon)) return null
  return <DynamicIcon name={icon as IconName} className={className} />
}
