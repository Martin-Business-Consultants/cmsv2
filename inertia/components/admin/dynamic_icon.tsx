import { DynamicIcon, iconNames, type IconName } from 'lucide-react/dynamic'
import { Box } from 'lucide-react'

const known = new Set<string>(iconNames)

export default function Icon({ name, className }: { name?: string | null; className?: string }) {
  if (!name || !known.has(name)) return <Box className={className} />
  return <DynamicIcon name={name as IconName} className={className} />
}
