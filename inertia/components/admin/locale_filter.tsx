import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { useListUrl } from '~/components/admin/list'
import { languageName } from '~/components/admin/translations_postbox'

export type ListLocales = { available: string[]; defaultLocale: string }

const ALL = '__all__'

export function showsLocales(locales: ListLocales | undefined) {
  return (locales?.available.length ?? 0) > 1
}

export default function LocaleFilter({
  locales,
  value,
}: {
  locales: ListLocales | undefined
  value: string | undefined
}) {
  const { visit } = useListUrl()
  if (!locales || !showsLocales(locales)) return null

  return (
    <Select
      value={value || ALL}
      onValueChange={(next) => visit({ locale: next === ALL ? null : next })}
    >
      <SelectTrigger aria-label="Filter by language" size="sm" className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All languages</SelectItem>
        {locales.available.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {languageName(locale)}{' '}
            <span className="text-muted-foreground font-mono text-xs">{locale}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
