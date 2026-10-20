import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ComponentProps } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

// Dialog Radix, z-index nằm trên sidebar và drawer
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
} as const

export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  size?: keyof typeof sizeClasses
}

export function DialogContent({ className, children, size = 'md', ...rest }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-60 bg-on-background/40 backdrop-blur-[2px] data-[state=open]:animate-[dialog-fade-in_150ms_ease-out]" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-70 flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-space-md overflow-y-auto rounded-2xl bg-surface-container-lowest p-space-lg shadow-level-3 focus:outline-none data-[state=open]:animate-[dialog-pop-in_180ms_ease-out]',
          sizeClasses[size],
          className,
        )}
        {...rest}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Đóng"
          className="absolute right-space-md top-space-md flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <Icon name="close" className="text-[18px]" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col pr-10', className)} {...rest} />
}

export function DialogTitle({ className, ...rest }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-headline-lg tracking-tight text-primary', className)} {...rest} />
}

export function DialogDescription({ className, ...rest }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-body-sm text-on-surface-variant', className)} {...rest} />
}

export function DialogFooter({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('mt-1 flex items-center gap-space-sm pt-space-xs', className)} {...rest} />
}
