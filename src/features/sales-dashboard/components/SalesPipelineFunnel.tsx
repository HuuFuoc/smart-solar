import { Panel, PanelHeader } from '@/components/common/ui/panel'
import { StackedBar } from '@/components/common/ui/stacked-bar'

type SalesPipelineFunnelProps = {
  total: number
  pending: number
  scheduled: number
  completed: number
}

export function SalesPipelineFunnel({ total, pending, scheduled, completed }: SalesPipelineFunnelProps) {
  const safeTotal = total > 0 ? total : 1
  const percent = (value: number) => Math.round((value / safeTotal) * 100)

  return (
    <Panel>
      <PanelHeader title="Tiến độ hồ sơ" description={`${total} hồ sơ`} />
      <StackedBar
        parts={[
          { key: 'pending', label: 'Chờ xếp lịch', value: pending, percent: percent(pending), color: 'var(--warn)' },
          {
            key: 'scheduled',
            label: 'Đã có lịch',
            value: scheduled,
            percent: percent(scheduled),
            color: 'var(--info)',
          },
          {
            key: 'completed',
            label: 'Sẵn sàng báo giá',
            value: completed,
            percent: percent(completed),
            color: 'var(--ok)',
          },
        ]}
      />
    </Panel>
  )
}
