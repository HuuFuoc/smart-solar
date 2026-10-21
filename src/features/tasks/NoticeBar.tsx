import type { ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

/* Dải thông báo trên bảng my_tasks_1: icon + câu tóm tắt bên trái, ghi chú bên phải. */
export type NoticeBarProps = {
  icon: string
  children: ReactNode
  /** Ghi chú góc phải, ví dụ "GPS Auto-Routing Enabled" */
  meta?: string
  className?: string
}

export function NoticeBar({ icon, children, meta, className }: NoticeBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-space-xs rounded-xl bg-surface-container-high px-space-md py-space-sm text-on-surface',
        className,
      )}
    >
      <div className="flex items-center gap-space-sm">
        <Icon name={icon} className="text-[20px] text-primary" />
        <span className="text-label-md">{children}</span>
      </div>
      {meta && <span className="text-label-sm text-on-surface-variant">{meta}</span>}
    </div>
  )
}
