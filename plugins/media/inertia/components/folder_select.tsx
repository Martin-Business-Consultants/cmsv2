import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import type { FolderNode } from '../types'

export function depthOf(path: string) {
  return path === '/' ? 0 : path.split('/').length - 1
}

export default function FolderSelect({
  id,
  value,
  folders,
  onChange,
  exclude,
  disabled,
}: {
  id?: string
  value: string
  folders: FolderNode[]
  onChange: (value: string) => void
  exclude?: string
  disabled?: boolean
}) {
  const options = folders.filter(
    (folder) =>
      folder.path !== '/' &&
      (!exclude || (folder.path !== exclude && !folder.path.startsWith(`${exclude}/`)))
  )
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Choose a folder" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="/">Library (top level)</SelectItem>
        {options.map((folder) => (
          <SelectItem key={folder.path} value={folder.path}>
            <span style={{ paddingLeft: `${(depthOf(folder.path) - 1) * 12}px` }}>
              {folder.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
