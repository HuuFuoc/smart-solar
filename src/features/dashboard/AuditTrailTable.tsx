import { DataTable, type DataTableColumn } from '@/components/common/stitch-ui/DataTable'
import { StatusBadge, type StatusVariant } from '@/components/common/stitch-ui/StatusBadge'
import { cn } from '@/utils/cn'

/* "nhật ký thao tác" trong admin_dashboard: bảng gọn 5 cột. */
export type AuditActorTone = 'primary' | 'primary-container' | 'secondary' | 'neutral'

export type AuditEntry = {
  id: string
  timestamp: string
  actor: { initials: string; name: string; tone: AuditActorTone }
  action: string
  /** Phần mã hiển thị font mono sau action, ví dụ SKU hoặc giá trị thay đổi */
  actionCode?: string
  actionCodeTone?: 'primary' | 'tertiary'
  target: string
  origin: { ip: string; site: string }
  integrity: { label: string; variant: StatusVariant }
}

const actorToneClasses: Record<AuditActorTone, string> = {
  primary: 'bg-primary text-on-primary',
  'primary-container': 'bg-primary-container text-on-primary',
  secondary: 'bg-secondary text-on-secondary',
  neutral: 'bg-surface-container-highest text-on-surface',
}

const columns: DataTableColumn<AuditEntry>[] = [
  {
    key: 'timestamp',
    header: 'Thời điểm',
    className: 'whitespace-nowrap text-label-sm text-outline',
    render: (entry) => entry.timestamp,
  },
  {
    key: 'actor',
    header: 'Người thực hiện',
    className: 'whitespace-nowrap',
    render: (entry) => (
      <div className="flex items-center gap-space-xs">
        <div
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-label-sm font-semibold',
            actorToneClasses[entry.actor.tone],
          )}
        >
          {entry.actor.initials}
        </div>
        <span className="text-label-md text-on-surface">{entry.actor.name}</span>
      </div>
    ),
  },
  {
    key: 'action',
    header: 'Thao tác và đối tượng',
    className: 'max-w-xs',
    render: (entry) => (
      <>
        <p className="truncate font-medium text-on-surface" title={`${entry.action} ${entry.actionCode ?? ''}`.trim()}>
          {entry.action}
          {entry.actionCode && (
            <>
              {' '}
              <span
                className={cn(
                  'font-mono',
                  entry.actionCodeTone === 'primary' ? 'font-semibold text-primary' : 'text-tertiary-container',
                )}
              >
                {entry.actionCode}
              </span>
            </>
          )}
        </p>
        <span className="text-label-sm text-outline">Đối tượng: {entry.target}</span>
      </>
    ),
  },
  {
    key: 'origin',
    header: 'Nguồn truy cập',
    className: 'whitespace-nowrap text-label-sm text-on-surface-variant',
    render: (entry) => (
      <>
        <span>{entry.origin.ip}</span> <span className="text-outline">{entry.origin.site}</span>
      </>
    ),
  },
  {
    key: 'integrity',
    header: 'Kết quả',
    align: 'right',
    className: 'whitespace-nowrap',
    render: (entry) => (
      <StatusBadge variant={entry.integrity.variant} size="sm" className="text-label-sm font-semibold">
        {entry.integrity.label}
      </StatusBadge>
    ),
  },
]

export function AuditTrailTable({ entries, className }: { entries: AuditEntry[]; className?: string }) {
  return (
    <DataTable
      variant="plain"
      size="sm"
      columns={columns}
      rows={entries}
      rowKey={(entry) => entry.id}
      className={className}
    />
  )
}
