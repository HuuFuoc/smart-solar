import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ComponentProps } from 'react'
import { cn } from '@/utils/cn'

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...rest }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('flex items-center gap-2 overflow-x-auto', className)} {...rest} />
}

export function TabsTrigger({ className, ...rest }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'whitespace-nowrap rounded-lg px-3 py-1.5 text-label-md text-on-surface-variant transition-all hover:bg-surface-container',
        'data-[state=active]:bg-primary data-[state=active]:font-semibold data-[state=active]:text-on-primary data-[state=active]:hover:bg-primary',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-tertiary-container/30',
        className,
      )}
      {...rest}
    />
  )
}

export function TabsContent({ className, ...rest }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('focus-visible:outline-none', className)} {...rest} />
}
