import type { ComponentProps } from 'react'
import { cn } from '@/utils/cn'

export type SwitchProps = Omit<ComponentProps<'input'>, 'type' | 'size'>

// Công tắc 36x20px
export function Switch({ className, ...rest }: SwitchProps) {
  return (
    <label className={cn('relative inline-flex cursor-pointer items-center', className)}>
      <input type="checkbox" role="switch" className="peer sr-only" {...rest} />
      <span
        aria-hidden="true"
        className="relative h-5 w-9 rounded-full bg-surface-container-highest transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-surface-container-lowest after:shadow-sm after:transition-transform after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus-visible:ring-[3px] peer-focus-visible:ring-tertiary-container/30 peer-disabled:opacity-50"
      />
    </label>
  )
}
