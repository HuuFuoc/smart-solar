import type { ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

/* "Engine Defaults" trong admin_dashboard: hàng icon + nhãn/phụ đề bên trái, giá trị bên phải. */
export type KeyValueRowProps = {
  icon?: string
  /** Màu icon, mặc định text-primary */
  iconClassName?: string
  label: string
  sublabel?: string
  sublabelClassName?: string
  value?: ReactNode
  valueClassName?: string
  /** Thay cho value: chấm trạng thái, badge… */
  trailing?: ReactNode
  className?: string
}

export function KeyValueRow({
  icon,
  iconClassName,
  label,
  sublabel,
  sublabelClassName,
  value,
  valueClassName,
  trailing,
  className,
}: KeyValueRowProps) {
  return (
    <div className={cn('flex items-center justify-between rounded-xl bg-surface-container-low p-space-sm', className)}>
      <div className="flex items-center gap-space-xs">
        {icon && <Icon name={icon} className={cn('text-[18px] text-primary', iconClassName)} />}
        <div>
          <span className="block text-label-md leading-tight text-on-surface">{label}</span>
          {sublabel && <span className={cn('text-label-sm text-outline', sublabelClassName)}>{sublabel}</span>}
        </div>
      </div>
      {trailing ??
        (value !== undefined && (
          <span className={cn('text-label-lg font-bold text-on-surface', valueClassName)}>{value}</span>
        ))}
    </div>
  )
}

export function KeyValueList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-space-sm', className)}>{children}</div>
}
