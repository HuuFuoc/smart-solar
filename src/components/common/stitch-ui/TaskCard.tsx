import { Button, type ButtonVariant } from '@/components/common/stitch-ui/Button'
import { Card } from '@/components/common/stitch-ui/Card'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { StatusBadge, type StatusVariant } from '@/components/common/stitch-ui/StatusBadge'
import { cn } from '@/utils/cn'

/* Theo 4 thẻ "Today's Assignments" trong technician_dashboard_1 (my_tasks_1 là dạng bảng). */
export type TaskAccent = 'primary' | 'secondary' | 'error' | 'tertiary' | 'success'

export type TaskSpec = { label: string; value: string; tone?: 'default' | 'error' }

export type TaskAction = {
  label: string
  icon?: string
  variant?: ButtonVariant
  onClick?: () => void
}

export type TaskCardProps = {
  /** Màu vạch 6px trên đầu thẻ, theo loại task */
  accent?: TaskAccent
  type: { label: string; variant?: StatusVariant }
  priority?: { label: string; variant?: StatusVariant }
  /** Góc phải trên: giờ hẹn hoặc "Next Up, Starts in 24m" (boxed) */
  meta?: { icon?: string; emphasis?: string; text: string; boxed?: boolean }
  title: string
  /** Nếu có, tiêu đề thành nút mở trang chi tiết (my_tasks_1 dạng Bento) */
  onTitleClick?: () => void
  address?: string
  phoneHref?: string
  /** Lưới thông số 2-4 cột trong khối nền nhạt */
  specs?: TaskSpec[]
  primaryAction?: TaskAction
  secondaryAction?: TaskAction
  className?: string
}

const accentClasses: Record<TaskAccent, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary-container',
  error: 'bg-error',
  tertiary: 'bg-tertiary-fixed-dim',
  success: 'bg-primary-fixed-dim',
}

export function TaskCard({
  accent = 'primary',
  type,
  priority,
  meta,
  title,
  onTitleClick,
  address,
  phoneHref,
  specs,
  primaryAction,
  secondaryAction,
  className,
}: TaskCardProps) {
  return (
    <Card interactive className={cn('relative flex flex-col justify-between overflow-hidden', className)}>
      <div aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-1.5', accentClasses[accent])} />

      <div className="flex flex-col gap-space-md">
        <div className="flex flex-wrap items-center justify-between gap-space-xs">
          <div className="flex flex-wrap items-center gap-space-xs">
            <StatusBadge variant={type.variant ?? 'primary'} className="font-semibold">
              {type.label}
            </StatusBadge>
            {priority && (
              <StatusBadge variant={priority.variant ?? 'neutral'} size="sm" dot={false} className="font-semibold">
                {priority.label}
              </StatusBadge>
            )}
          </div>
          {meta &&
            (meta.boxed ? (
              <div className="flex items-center gap-1 rounded-lg bg-surface-container px-2.5 py-1 text-label-sm text-on-surface-variant">
                {meta.icon && <Icon name={meta.icon} className="text-[16px] text-primary" />}
                {meta.emphasis && <span className="font-bold text-on-surface">{meta.emphasis}</span>}
                <span>{meta.text}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                {meta.icon && <Icon name={meta.icon} className="text-[16px]" />}
                <span>{meta.text}</span>
              </div>
            ))}
        </div>

        <div className="flex items-start justify-between gap-space-md">
          <div className="flex flex-col">
            <h3 className="text-headline-md font-bold text-on-surface">
              {onTitleClick ? (
                <button type="button" onClick={onTitleClick} className="text-left transition-colors hover:text-primary">
                  {title}
                </button>
              ) : (
                title
              )}
            </h3>
            {address && (
              <div className="mt-0.5 flex items-center gap-1 text-body-md text-on-surface-variant">
                <Icon name="location_on" className="text-[18px]" />
                <span>{address}</span>
              </div>
            )}
          </div>
          {phoneHref && (
            <a
              href={phoneHref}
              title="Gọi khách hàng"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-primary transition-colors hover:bg-surface-container"
            >
              <Icon name="phone" className="text-[22px]" />
            </a>
          )}
        </div>

        {specs && specs.length > 0 && (
          <div
            className="grid gap-space-xs rounded-xl bg-surface-container-low p-space-sm text-label-sm"
            style={{ gridTemplateColumns: `repeat(${specs.length}, minmax(0, 1fr))` }}
          >
            {specs.map((spec) => (
              <div key={spec.label} className="flex flex-col">
                <span className="text-on-surface-variant">{spec.label}</span>
                <span className={cn('font-semibold', spec.tone === 'error' ? 'text-error' : 'text-on-surface')}>
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="mt-space-lg flex items-center gap-space-sm pt-space-sm">
          {primaryAction && (
            <Button
              variant={primaryAction.variant ?? 'primary'}
              iconLeft={primaryAction.icon}
              onClick={primaryAction.onClick}
              className="flex-1"
            >
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant={secondaryAction.variant ?? 'ghost'}
              iconLeft={secondaryAction.icon}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
