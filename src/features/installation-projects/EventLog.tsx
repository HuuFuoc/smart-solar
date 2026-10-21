import { ActivityList } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { eventLabel, projectStatusMeta } from '@/features/installation-projects/projectDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import type { InstallationEventView } from '@/types/res/managerInstallationsRes'

// Nhật ký dự án (chỉ quản lý / quản trị thấy), mới nhất lên đầu.
// `detail` của backend là ghi chú nội bộ tiếng Anh kèm id, chỉ hiện khi nó đúng là lý do người dùng đã nhập
const REASON_EVENTS = new Set(['PROJECT_CANCELLED', 'ASSIGNMENT_DECLINED'])

function transition(e: InstallationEventView) {
  if (!e.fromStatus || !e.toStatus) return null
  return `Chuyển từ ${projectStatusMeta(e.fromStatus).label.toLocaleLowerCase('vi')} sang ${projectStatusMeta(e.toStatus).label.toLocaleLowerCase('vi')}.`
}

export function EventLog({ events }: { events: InstallationEventView[] }) {
  const items = [...events]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((e) => ({
      time: formatMoment(e.createdAt),
      title: eventLabel(e.eventType),
      body: [transition(e), REASON_EVENTS.has(e.eventType) && e.detail ? `Lý do: ${e.detail}` : null]
        .filter(Boolean)
        .join(' '),
    }))
  return (
    <Panel>
      <PanelHeader title="Nhật ký dự án" />
      <PanelBody>
        {items.length === 0 ? (
          <p className="text-body text-fg-2">Chưa có sự kiện nào.</p>
        ) : (
          <ActivityList items={items.map((item) => ({ ...item, body: item.body || undefined }))} />
        )}
      </PanelBody>
    </Panel>
  )
}
