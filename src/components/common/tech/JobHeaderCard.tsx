import type { ReactNode } from 'react'
import { InfoTileGrid, type InfoTileData } from '@/components/common/tech/InfoTile'
import { Card, Icon, ProgressBar, StatusBadge, type StatusVariant } from '@/components/common/stitch-ui'
import { cn } from '@/utils/cn'

// Header của việc lắp đặt / bảo trì / bảo hành: loại việc, mã, giai đoạn, nút, lưới thông tin và tiến độ
export type JobHeaderAction = {
  label: string
  icon: string
  /** primary = chữ primary; plain = chữ on-surface; solid = nút chính nền primary */
  tone?: 'primary' | 'plain' | 'solid'
  onClick?: () => void
}

export type JobProgress = {
  title: string
  /** Chú thích xám sau tiêu đề, ví dụ "Stage 3 of 4" */
  note?: string
  percent: number
  /** Các mốc dưới thanh; done = tô primary đậm */
  milestones?: { label: string; done: boolean }[]
}

export type JobHeaderCardProps = {
  /** Pill nhỏ trước mã job: "Job Order", "Service Ticket"... */
  kindLabel: string
  code: string
  status: { label: string; variant?: StatusVariant }
  /** Tiêu đề lớn dưới hàng badge (maintenance_task); bỏ trống thì mã job là dòng lớn nhất */
  title?: string
  summary: string
  actions?: JobHeaderAction[]
  meta: InfoTileData[]
  metaColumns?: 3 | 4
  progress?: JobProgress
  /** Nội dung thêm dưới cùng (SLA, cảnh báo...) */
  children?: ReactNode
  className?: string
}

export function JobHeaderCard({
  kindLabel,
  code,
  status,
  title,
  summary,
  actions = [],
  meta,
  metaColumns = 4,
  progress,
  children,
  className,
}: JobHeaderCardProps) {
  return (
    <Card padding="lg" className={cn('flex w-full flex-col gap-space-md', className)}>
      <div className="flex flex-col gap-space-md lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-space-xs">
            <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-label-sm font-bold text-primary">
              {kindLabel}
            </span>
            <span
              className={cn(
                'font-bold tracking-tight',
                title ? 'text-headline-md text-primary' : 'text-headline-lg text-on-surface',
              )}
            >
              {code}
            </span>
            <StatusBadge variant={status.variant ?? 'in-progress'} pulse className="font-semibold">
              {status.label}
            </StatusBadge>
          </div>
          {title && <h1 className="mt-1 text-headline-xl tracking-tight text-on-surface">{title}</h1>}
          <p className={cn('text-on-surface-variant', title ? 'mt-1 text-body-md' : 'mt-1 text-body-lg')}>{summary}</p>
        </div>

        {actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-space-sm self-start lg:self-center">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={cn(
                  'flex items-center gap-space-2xs rounded-xl transition-all',
                  action.tone === 'solid'
                    ? 'h-12 bg-primary px-space-lg text-label-lg font-bold text-on-primary shadow-md hover:bg-primary-container'
                    : cn(
                        'h-10 bg-surface-container-low px-space-md text-label-md hover:bg-surface-container',
                        action.tone === 'plain' ? 'text-on-surface' : 'text-primary',
                      ),
                )}
              >
                <Icon name={action.icon} className={action.tone === 'solid' ? 'text-[20px]' : 'text-[18px]'} />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <InfoTileGrid items={meta} columns={metaColumns} className="pt-space-xs" />

      {progress && (
        <div className="flex flex-col gap-space-xs pt-space-xs">
          <div className="flex items-center justify-between gap-space-sm text-label-md">
            <div className="flex flex-wrap items-center gap-space-xs">
              <span className="font-bold text-on-surface">{progress.title}</span>
              {progress.note && <span className="text-on-surface-variant">{progress.note}</span>}
            </div>
            <span className="text-headline-md font-bold text-primary">{progress.percent}%</span>
          </div>
          <ProgressBar value={progress.percent} label={progress.title} className="h-3" />
          {progress.milestones && progress.milestones.length > 0 && (
            <div
              className="grid gap-space-xs pt-1 text-center text-label-sm text-on-surface-variant"
              style={{ gridTemplateColumns: `repeat(${progress.milestones.length}, minmax(0, 1fr))` }}
            >
              {progress.milestones.map((milestone) => (
                <span key={milestone.label} className={cn(milestone.done && 'font-bold text-primary')}>
                  {milestone.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {children}
    </Card>
  )
}
