import type { ReactNode } from 'react'
import { Card } from '@/components/common/stitch-ui/Card'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { StatusBadge } from '@/components/common/stitch-ui/StatusBadge'
import { cn } from '@/utils/cn'

/*
 * Card ngữ cảnh đầu trang của luồng khảo sát: mã dự án, trạng thái, tiêu đề, danh bạ và địa chỉ.
 * Dùng lại ở cả ba màn /tech/surveys/:id, .../verify và .../photos.
 */
export type TaskHeaderContact = { icon: string; label: string; value: string }

export type TaskHeaderCardProps = {
  /** Pill mã dự án; site_survey_verification dùng `eyebrow` thay cho pill này */
  code?: string
  /** Dòng nhãn nhỏ in hoa trên tiêu đề (cụm khu vực + người được giao) */
  eyebrow?: ReactNode
  statusLabel?: string
  /** Dòng "Autosaved 2 mins ago" bên phải nhóm badge */
  autosaveLabel?: string
  title: string
  subtitle?: string
  contacts?: TaskHeaderContact[]
  location?: { address: string; meta: string }
  /** Nhóm nút ở mép phải card (Reject / Save Draft / Complete & Sign) */
  actions?: ReactNode
  /** Nội dung thêm dưới lưới danh bạ (stepper của màn ảnh tư liệu…) */
  children?: ReactNode
  className?: string
}

export function TaskHeaderCard({
  code,
  eyebrow,
  statusLabel,
  autosaveLabel,
  title,
  subtitle,
  contacts = [],
  location,
  actions,
  children,
  className,
}: TaskHeaderCardProps) {
  return (
    <Card padding="lg" className={cn('relative w-full overflow-hidden', className)}>
      {/* Vệt sáng góc phải trên như thiết kế */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-fixed/30 blur-3xl"
      />
      <div className="relative z-10 flex flex-col gap-space-md lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-space-xs">
          {eyebrow && <div className="flex flex-wrap items-center gap-space-xs">{eyebrow}</div>}
          <div className={cn('flex flex-wrap items-center gap-space-xs', !code && !statusLabel && !autosaveLabel && 'hidden')}>
            {code && (
              <StatusBadge variant="primary" dot={false} className="tracking-wide">
                {code}
              </StatusBadge>
            )}
            {statusLabel && (
              <StatusBadge variant="in-progress" pulse>
                {statusLabel}
              </StatusBadge>
            )}
            {autosaveLabel && (
              <div className="ml-1 flex items-center gap-1 text-label-sm text-on-surface-variant">
                <Icon name="cloud_done" className="text-[16px] text-surface-tint" />
                <span>{autosaveLabel}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-space-xs pt-1 sm:flex-row sm:items-baseline sm:gap-space-sm">
            <h1 className="text-headline-xl tracking-tight text-on-surface">{title}</h1>
            {subtitle && <span className="text-body-md text-on-surface-variant">{subtitle}</span>}
          </div>

          {contacts.length > 0 && (
            <div className="grid grid-cols-1 gap-space-md pt-space-xs sm:grid-cols-3">
              {contacts.map((contact) => (
                <div key={contact.label} className="flex items-center gap-space-xs">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
                    <Icon name={contact.icon} className="text-[18px]" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-label-sm text-on-surface-variant">{contact.label}</span>
                    <span className="truncate text-label-lg text-on-surface">{contact.value}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {children}
        </div>

        {location && (
          <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-space-sm lg:min-w-[240px] lg:flex-col lg:items-end lg:justify-center">
            <div className="flex items-center gap-space-xs text-label-md text-primary">
              <Icon name="location_on" className="text-[20px]" />
              <span className="font-semibold">{location.address}</span>
            </div>
            <span className="text-body-sm text-on-surface-variant">{location.meta}</span>
          </div>
        )}

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-space-xs">{actions}</div>}
      </div>
    </Card>
  )
}
