import { ActivityList } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { contractEventLabel, contractStatusLabel } from '@/features/contracts/contractDisplay'
import type { ContractEventView } from '@/types/res/customerContractsRes'

// Nhật ký hợp đồng (chỉ nhân viên thấy), mới nhất lên đầu. `detail` của backend là ghi chú nội bộ tiếng Anh, chỉ hiện khi
// nó là lý do người dùng nhập (từ chối bản ký)
export function ContractEventLog({ events }: { events: ContractEventView[] }) {
  const items = [...events]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((e) => {
      const moved =
        e.fromStatus && e.toStatus ? `${contractStatusLabel(e.fromStatus)} → ${contractStatusLabel(e.toStatus)}.` : null
      const reason = e.toStatus === 'SIGNATURE_REJECTED' && e.detail ? `Lý do: ${e.detail}` : null
      return {
        time: formatMoment(e.createdAt),
        title: contractEventLabel(e.eventType),
        body: [moved, reason].filter(Boolean).join(' ') || undefined,
      }
    })
  return (
    <Panel>
      <PanelHeader title="Nhật ký hợp đồng" />
      <PanelBody>
        {items.length === 0 ? (
          <p className="text-body text-fg-2">Chưa có sự kiện nào.</p>
        ) : (
          <ActivityList items={items} />
        )}
      </PanelBody>
    </Panel>
  )
}
