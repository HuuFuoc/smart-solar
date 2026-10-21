import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import type { ComponentProps } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

export type CheckboxProps = Omit<ComponentProps<typeof CheckboxPrimitive.Root>, 'asChild'> & {
  /** md = 20px theo DESIGN.md; sm = 16px cho ô chọn trong bảng */
  size?: 'sm' | 'md'
  /** error = tô đỏ khi checked (quyền destructive trong roles_permissions) */
  tone?: 'primary' | 'error'
}

const toneClasses = {
  primary:
    'data-[state=checked]:border-primary-container data-[state=checked]:bg-primary-container data-[state=indeterminate]:border-primary-container data-[state=indeterminate]:bg-primary-container',
  error:
    'data-[state=checked]:border-error data-[state=checked]:bg-error data-[state=indeterminate]:border-error data-[state=indeterminate]:bg-error',
} as const

/** Checkbox Radix 20px. `checked="indeterminate"` cho ô chọn tất cả */
export function Checkbox({ className, size = 'md', tone = 'primary', ...rest }: CheckboxProps) {
  const iconSize = size === 'md' ? 'text-[14px]' : 'text-[12px]'
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'group peer inline-flex shrink-0 cursor-pointer items-center justify-center border-[1.5px] border-outline-variant bg-surface-container-lowest text-on-primary transition-colors',
        toneClasses[tone],
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-tertiary-container/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'h-5 w-5 rounded-md' : 'h-4 w-4 rounded',
        className,
      )}
      {...rest}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Icon name="check" className={cn(iconSize, 'group-data-[state=indeterminate]:hidden')} />
        <Icon name="remove" className={cn(iconSize, 'hidden group-data-[state=indeterminate]:inline-block')} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
