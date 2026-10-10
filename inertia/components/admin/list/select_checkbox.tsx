import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { CheckIcon, MinusIcon } from 'lucide-react'
import { cn } from '~/lib/utils'

export default function SelectCheckbox({
  checked,
  onCheckedChange,
  label,
  className,
  ...rest
}: {
  checked: boolean | 'indeterminate'
  onCheckedChange: () => void
  label: string
  className?: string
} & Record<`data-${string}`, string | boolean | undefined>) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        'peer border-input focus-visible:border-ring focus-visible:ring-ring/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground dark:bg-input/30 flex size-4 shrink-0 items-center justify-center rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px]',
        className
      )}
      {...rest}
    >
      <CheckboxPrimitive.Indicator className="grid place-content-center text-current">
        {checked === 'indeterminate' ? (
          <MinusIcon className="size-3.5" />
        ) : (
          <CheckIcon className="size-3.5" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
