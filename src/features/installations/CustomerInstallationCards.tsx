import { Icon } from '@/components/common/stitch-ui/Icon'
import { awaitsCustomerDecision } from '@/features/installations/installationDisplay'
import type { ProjectFilterStatus } from '@/features/installations/customerInstallationDisplay'
import type { InstallationCustomerView } from '@/types/res/customerInstallationsRes'
import { cx } from '@/utils/cx'

type CardItem = {
  key: ProjectFilterStatus
  label: string
  icon: string
  count: number
}

export function CustomerInstallationCards({
  items,
  selected,
  onSelect,
}: {
  items: InstallationCustomerView[]
  selected: ProjectFilterStatus
  onSelect: (filter: ProjectFilterStatus) => void
}) {
  const total = items.length
  const inProgress = items.filter(
    (p) => p.status === 'IN_PROGRESS' || p.status === 'SCHEDULED' || p.status === 'REWORK_REQUIRED',
  ).length
  const awaiting = items.filter((p) => p.status === 'PENDING_CUSTOMER_ACCEPTANCE' || awaitsCustomerDecision(p)).length
  const completed = items.filter((p) => p.status === 'COMPLETED').length

  const cards: CardItem[] = [
    { key: 'ALL', label: 'Tất cả công trình', icon: 'layers', count: total },
    { key: 'IN_PROGRESS', label: 'Đang lắp đặt', icon: 'schedule', count: inProgress },
    { key: 'AWAITING_HANDOVER', label: 'Chờ bàn giao', icon: 'handshake', count: awaiting },
    { key: 'COMPLETED', label: 'Đã bàn giao', icon: 'check_circle', count: completed },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => {
        const isSelected = selected === c.key
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onSelect(isSelected && c.key !== 'ALL' ? 'ALL' : c.key)}
            className={cx(
              'flex items-center gap-3.5 rounded-container p-3.5 text-left transition-colors',
              isSelected
                ? 'border-2 border-primary bg-accent-soft/20'
                : 'border border-line bg-canvas hover:bg-surface-2/60',
            )}
          >
            <div
              className={cx(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-control',
                isSelected || c.key === 'ALL'
                  ? 'bg-accent-soft text-primary'
                  : 'border border-line bg-surface-2 text-fg-2',
              )}
            >
              <Icon name={c.icon} className="text-[20px]" />
            </div>
            <div className="min-w-0">
              <div className="text-meta font-medium text-fg-2">{c.label}</div>
              <div className="tnum mt-0.5 text-figure font-bold leading-tight text-fg">{c.count}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
