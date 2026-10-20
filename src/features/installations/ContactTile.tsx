import { Card, Icon } from '@/components/common/stitch-ui'
import { cn } from '@/utils/cn'

/*
 * Ô liên hệ nhanh: chữ cái viết tắt (khách hàng trong installation_task) hoặc icon
 * (hotline điều phối trong installation_task_checklist), tên + ghi chú, nút gọi bên phải.
 * Dùng lại cho maintenance_task và warranty_request.
 */
export type ContactTileProps = {
  /** Chữ cái viết tắt; bỏ trống khi dùng `icon` */
  initials?: string
  /** Icon thay chữ cái viết tắt */
  icon?: string
  /** Nhãn in hoa phía trên ô; có nhãn thì ô được bọc trong card riêng */
  eyebrow?: string
  name: string
  note: string
  phoneHref: string
  /** solid = nút gọi nền primary-container (khối hotline) */
  callTone?: 'tonal' | 'solid'
  /** Nhãn cho nút gọi (a11y) */
  callLabel?: string
  className?: string
}

export function ContactTile({
  initials,
  icon,
  eyebrow,
  name,
  note,
  phoneHref,
  callTone = 'tonal',
  callLabel = 'Gọi liên hệ',
  className,
}: ContactTileProps) {
  const tile = (
    <div
      className={cn(
        'flex items-center justify-between gap-space-sm bg-surface-container-low',
        eyebrow ? 'rounded-xl p-space-xs' : 'rounded-2xl p-space-md shadow-sm',
      )}
    >
      <div className="flex min-w-0 items-center gap-space-sm">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center',
            icon
              ? 'h-6 w-6 text-secondary'
              : 'h-10 w-10 rounded-full bg-surface-container-lowest text-label-md font-bold text-primary shadow-sm',
          )}
        >
          {icon ? <Icon name={icon} className="text-[20px]" /> : initials}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-label-md font-bold text-on-surface">{name}</span>
          <span className="truncate text-body-sm text-on-surface-variant">{note}</span>
        </div>
      </div>
      <a
        href={phoneHref}
        aria-label={callLabel}
        title={callLabel}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl transition-colors',
          callTone === 'solid'
            ? 'h-9 w-9 bg-primary-container text-on-primary hover:bg-primary'
            : 'h-10 w-10 bg-surface-container-lowest text-primary shadow-sm hover:bg-primary hover:text-on-primary',
        )}
      >
        <Icon name="call" className={callTone === 'solid' ? 'text-[18px]' : 'text-[20px]'} />
      </a>
    </div>
  )

  if (!eyebrow) return <section className={className}>{tile}</section>

  return (
    <Card padding="lg" className={cn('flex flex-col gap-space-sm', className)}>
      <span className="text-label-sm font-bold text-on-surface-variant">{eyebrow}</span>
      {tile}
    </Card>
  )
}
