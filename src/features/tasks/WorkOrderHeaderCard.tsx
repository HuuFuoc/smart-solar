import { Card } from '@/components/common/stitch-ui/Card'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { StatusBadge, type StatusVariant } from '@/components/common/stitch-ui/StatusBadge'
import { cn } from '@/utils/cn'

/*
 * "Work Order Key Data Card" đầu task_detail_timeline: ô icon lớn, mã lệnh, badge trạng thái,
 * các dòng thông tin hiện trường bên trái và khối 3 chỉ số bên phải.
 */
export type WorkOrderFact = { icon: string; text: string; emphasis?: boolean }

export type WorkOrderMetric = {
  label: string
  value: string
  caption: string
  valueTone?: 'default' | 'primary'
}

export type WorkOrderHeaderCardProps = {
  icon: string
  code: string
  status: { label: string; variant: StatusVariant }
  /** "Synced 10:48 AM" */
  syncLabel?: string
  title: string
  facts: WorkOrderFact[]
  metrics: WorkOrderMetric[]
  className?: string
}

export function WorkOrderHeaderCard({
  icon,
  code,
  status,
  syncLabel,
  title,
  facts,
  metrics,
  className,
}: WorkOrderHeaderCardProps) {
  return (
    <Card
      padding="lg"
      className={cn(
        'relative flex flex-col justify-between gap-space-lg overflow-hidden lg:flex-row lg:items-center',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-fixed/20 blur-3xl"
      />

      <div className="relative z-10 flex items-start gap-space-md">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary shadow-md">
          <Icon name={icon} className="text-[30px]" />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-space-sm">
            <span className="text-headline-lg font-bold text-on-surface">{code}</span>
            <StatusBadge variant={status.variant} pulse>
              {status.label}
            </StatusBadge>
            {syncLabel && (
              <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                <Icon name="cloud_done" className="text-[16px] text-surface-tint" />
                {syncLabel}
              </span>
            )}
          </div>

          <p className="text-body-lg text-on-surface-variant">{title}</p>

          <div className="mt-space-xs flex flex-wrap items-center gap-space-lg text-body-md text-on-surface-variant">
            {facts.map((fact) => (
              <div key={fact.text} className="flex items-center gap-space-xs">
                <Icon name={fact.icon} className="text-[18px] text-primary" />
                <span className={cn(fact.emphasis && 'font-semibold text-on-surface')}>{fact.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-space-md rounded-xl bg-surface-container-low p-space-md">
        {metrics.map((metric, index) => (
          <div key={metric.label} className="flex items-center gap-space-md">
            {index > 0 && <span aria-hidden="true" className="h-10 w-px bg-surface-container-highest" />}
            <div className="flex flex-col">
              <span className="text-label-sm text-on-surface-variant">{metric.label}</span>
              <span
                className={cn(
                  'text-headline-md font-bold',
                  metric.valueTone === 'primary' ? 'text-primary' : 'text-on-surface',
                )}
              >
                {metric.value}
              </span>
              <span
                className={cn(
                  'text-label-sm',
                  metric.valueTone === 'primary' ? 'text-on-surface-variant' : 'text-surface-tint',
                )}
              >
                {metric.caption}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
