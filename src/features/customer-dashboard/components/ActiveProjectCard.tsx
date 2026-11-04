import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { Panel, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import {
  CUSTOMER_INSTALLATION_LABELS,
  INSTALLATION_STATUS_LABELS,
  INSTALLATION_STATUS_TONES,
} from '@/common/installation'
import { ROUTES, withId } from '@/routes/paths'
import type { InstallationCustomerView } from '@/types/res/customerInstallationsRes'

function formatScheduleTime(isoString: string | null) {
  if (!isoString) return 'Chưa ấn định thời gian'
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(isoString))
  } catch {
    return isoString
  }
}

export function ActiveProjectCard({ project }: { project?: InstallationCustomerView | null }) {
  if (!project) {
    return (
      <Panel>
        <PanelHeader
          className="items-start"
          title="Công trình"
          action={
            <ButtonLink to={ROUTES.customer.requests} size="sm" variant="info" icon="list">
              Xem yêu cầu khảo sát
            </ButtonLink>
          }
        />
        <p className="text-body text-fg-2">Chưa có công trình lắp đặt</p>
      </Panel>
    )
  }

  const statusLabel =
    CUSTOMER_INSTALLATION_LABELS[project.status] || INSTALLATION_STATUS_LABELS[project.status] || project.status
  const statusTone = INSTALLATION_STATUS_TONES.customer[project.status] || 'neutral'
  const isAwaitingAcceptance = project.status === 'PENDING_CUSTOMER_ACCEPTANCE'

  return (
    <Panel>
      <PanelHeader
        className="items-start"
        title="Công trình"
        description={`Hợp đồng #${project.contractId.slice(0, 8)}`}
        action={<Badge tone={statusTone}>{statusLabel}</Badge>}
      />
      {isAwaitingAcceptance && (
        <p className="mb-3 text-body font-semibold text-danger">Công trình đang chờ bạn nghiệm thu</p>
      )}
      <div className="grid gap-3 text-body sm:grid-cols-2">
        <div>
          <p className="text-meta text-fg-3">Kỹ thuật viên phụ trách</p>
          <p className="font-medium text-fg-1">{project.technicianName || 'Chưa phân công'}</p>
        </div>
        <div>
          <p className="text-meta text-fg-3">Lịch thi công dự kiến</p>
          <p className="font-medium text-fg-1">{formatScheduleTime(project.scheduledStartsAt)}</p>
        </div>
        <div>
          <p className="text-meta text-fg-3">Thiết bị lắp đặt</p>
          <p className="font-medium text-fg-1">{project.assets.length} thiết bị ghi nhận</p>
        </div>
        <div>
          <p className="text-meta text-fg-3">Hình ảnh thi công</p>
          <p className="font-medium text-fg-1">{project.evidence.length} bức ảnh lưu trữ</p>
        </div>
      </div>

      <PanelFooter className="justify-between">
        <span className="text-meta text-fg-3">Mã dự án: {project.projectId.slice(0, 8)}...</span>
        <ButtonLink
          to={withId(ROUTES.customer.project, project.projectId)}
          variant={isAwaitingAcceptance ? 'primary' : 'info'}
          icon={isAwaitingAcceptance ? 'task_alt' : 'visibility'}
          size="sm"
        >
          {isAwaitingAcceptance ? 'Nghiệm thu công trình' : 'Xem tiến độ chi tiết'}
        </ButtonLink>
      </PanelFooter>
    </Panel>
  )
}
