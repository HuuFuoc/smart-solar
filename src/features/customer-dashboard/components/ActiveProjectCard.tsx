import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { Icon } from '@/components/common/stitch-ui/Icon'
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
      <Panel className="flex flex-col justify-between">
        <div>
          <PanelHeader
            title="Công trình điện mặt trời"
            description="Chưa có dự án thi công đang thực hiện"
          />
          <PanelBody className="flex h-48 flex-col items-center justify-center text-center text-body text-fg-3">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-fg-3">
              <Icon name="solar_power" className="text-[26px]" />
            </div>
            <p className="font-medium text-fg-2">Chưa có hợp đồng lắp đặt</p>
            <p className="mt-1 text-meta">
              Sau khi hoàn tất khảo sát và ký hợp đồng, tiến độ thi công sẽ hiển thị tại đây.
            </p>
          </PanelBody>
        </div>
        <PanelFooter className="flex justify-end">
          <ButtonLink to={ROUTES.customer.requests} size="sm">
            Xem yêu cầu khảo sát
          </ButtonLink>
        </PanelFooter>
      </Panel>
    )
  }

  const statusLabel =
    CUSTOMER_INSTALLATION_LABELS[project.status] ||
    INSTALLATION_STATUS_LABELS[project.status] ||
    project.status
  const statusTone = INSTALLATION_STATUS_TONES.customer[project.status] || 'neutral'
  const isAwaitingAcceptance = project.status === 'PENDING_CUSTOMER_ACCEPTANCE'

  return (
    <Panel className="flex flex-col justify-between">
      <div>
        <PanelHeader
          title="Công trình điện mặt trời"
          description={`Hợp đồng #${project.contractId.slice(0, 8)}`}
          action={<Badge tone={statusTone}>{statusLabel}</Badge>}
        />
        <PanelBody className="space-y-4">
          {isAwaitingAcceptance && (
            <div className="rounded-control border border-danger/20 bg-danger-soft p-3 text-body text-danger">
              <p className="font-semibold">Công trình đang chờ bạn nghiệm thu!</p>
              <p className="mt-1 text-meta text-fg-2">
                Kỹ thuật viên đã gửi báo cáo hoàn thành. Vui lòng kiểm tra hình ảnh thi công và xác nhận nghiệm thu.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 text-body">
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
        </PanelBody>
      </div>

      <PanelFooter className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-meta text-fg-3">Mã dự án: {project.projectId.slice(0, 8)}...</span>
        <ButtonLink
          to={withId(ROUTES.customer.project, project.projectId)}
          variant={isAwaitingAcceptance ? 'primary' : 'secondary'}
          size="sm"
        >
          {isAwaitingAcceptance ? 'Nghiệm thu công trình' : 'Xem tiến độ chi tiết'}
        </ButtonLink>
      </PanelFooter>
    </Panel>
  )
}