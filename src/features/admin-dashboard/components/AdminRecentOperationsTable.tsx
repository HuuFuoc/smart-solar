import { useState } from 'react'
import { Link } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { requestKindLabel, requestStatusMeta } from '@/features/after-sales/serviceDisplay'
import { dispatchStatusMeta } from '@/features/dispatch/dispatchDisplay'
import { projectStatusMeta } from '@/features/installation-projects/projectDisplay'
import { formatDay, formatTime, vnDate } from '@/features/scheduling/schedulingDisplay'
import { ROUTES } from '@/routes/paths'
import type { InstallationProjectSummary } from '@/types/res/managerInstallationsRes'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'
import type { DispatchQueueItemView } from '@/types/res/dispatchRes'
import { cx } from '@/utils/cx'

type AdminRecentOperationsTableProps = {
  projects: InstallationProjectSummary[]
  serviceRequests: ServiceRequestSummary[]
  dispatchItems: DispatchQueueItemView[]
}

type TabType = 'installations' | 'afterSales' | 'dispatch'

function formatDateTimeText(iso: string | null | undefined) {
  if (!iso) return '—'
  const day = formatDay(vnDate(iso))
  const time = formatTime(iso)
  return `${time} • ${day}`
}

export function AdminRecentOperationsTable({
  projects,
  serviceRequests,
  dispatchItems,
}: AdminRecentOperationsTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('installations')

  return (
    <div className="rounded-container border border-line bg-surface-2 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h3 className="text-body font-semibold text-fg flex items-center gap-2">
            <Icon name="work_history" className="text-primary text-[20px]" />
            Bảng công việc & Biến động vận hành gần nhất
          </h3>
          <p className="text-meta text-fg-2 mt-0.5">
            Theo dõi trực tiếp hồ sơ thi công, ticket sự cố và yêu cầu điều phối kỹ thuật viên
          </p>
        </div>

        {/* View all link */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeTab === 'installations' && (
            <ButtonLink to={ROUTES.admin.installations} variant="ghost" size="sm" className="text-primary gap-1">
              <span>Xem tất cả thi công</span>
              <Icon name="arrow_forward" className="text-[16px]" />
            </ButtonLink>
          )}
          {activeTab === 'afterSales' && (
            <ButtonLink to={ROUTES.admin.afterSales} variant="ghost" size="sm" className="text-primary gap-1">
              <span>Xem tất cả bảo hành</span>
              <Icon name="arrow_forward" className="text-[16px]" />
            </ButtonLink>
          )}
          {activeTab === 'dispatch' && (
            <ButtonLink to={ROUTES.admin.dispatch} variant="ghost" size="sm" className="text-primary gap-1">
              <span>Xem tất cả điều phối</span>
              <Icon name="arrow_forward" className="text-[16px]" />
            </ButtonLink>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1.5 border-b border-line pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('installations')}
          className={cx(
            'flex items-center gap-2 px-3 py-1.5 rounded-control text-meta font-medium transition-colors whitespace-nowrap',
            activeTab === 'installations'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-fg-2 hover:text-fg hover:bg-surface-3',
          )}
        >
          <Icon name="engineering" className="text-[18px]" />
          <span>Dự án thi công</span>
          <span className="ml-1 rounded-full bg-surface-3 px-1.5 py-0.2 text-[11px] font-semibold text-fg">
            {projects.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('afterSales')}
          className={cx(
            'flex items-center gap-2 px-3 py-1.5 rounded-control text-meta font-medium transition-colors whitespace-nowrap',
            activeTab === 'afterSales'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-fg-2 hover:text-fg hover:bg-surface-3',
          )}
        >
          <Icon name="handyman" className="text-[18px]" />
          <span>Sự cố & Bảo hành</span>
          <span className="ml-1 rounded-full bg-surface-3 px-1.5 py-0.2 text-[11px] font-semibold text-fg">
            {serviceRequests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dispatch')}
          className={cx(
            'flex items-center gap-2 px-3 py-1.5 rounded-control text-meta font-medium transition-colors whitespace-nowrap',
            activeTab === 'dispatch'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-fg-2 hover:text-fg hover:bg-surface-3',
          )}
        >
          <Icon name="calendar_month" className="text-[18px]" />
          <span>Hàng chờ điều phối KTV</span>
          <span className="ml-1 rounded-full bg-surface-3 px-1.5 py-0.2 text-[11px] font-semibold text-fg">
            {dispatchItems.length}
          </span>
        </button>
      </div>

      {/* Tab Content: Installations */}
      {activeTab === 'installations' && (
        <div className="overflow-x-auto">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-fg-muted">
              <Icon name="assignment" className="text-[32px] text-fg-3 mb-2" />
              <p className="text-body font-medium text-fg">Chưa có dự án thi công nào</p>
              <p className="text-meta text-fg-2">Hệ thống sẽ cập nhật khi hợp đồng thanh toán được duyệt khởi tạo.</p>
            </div>
          ) : (
            <table className="w-full text-left text-meta border-collapse">
              <thead>
                <tr className="border-b border-line text-fg-2 font-medium">
                  <th className="py-2.5 px-3">Mã dự án</th>
                  <th className="py-2.5 px-3">Kỹ thuật viên phụ trách</th>
                  <th className="py-2.5 px-3">Khởi tạo / Lịch hẹn</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {projects.slice(0, 6).map((project) => {
                  const meta = projectStatusMeta(project.status)
                  const detailUrl = ROUTES.admin.installation.replace(':id', project.projectId)
                  return (
                    <tr key={project.projectId} className="hover:bg-surface-3/50 transition-colors">
                      <td className="py-3 px-3">
                        <Link to={detailUrl} className="font-semibold text-primary hover:underline">
                          #{project.projectId.slice(0, 8)}
                        </Link>
                        <p className="text-[12px] text-fg-muted">HĐ: #{project.contractId.slice(0, 8)}</p>
                      </td>
                      <td className="py-3 px-3">
                        {project.responsibleTechnicianName ? (
                          <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-ok shrink-0" />
                            <span className="font-medium text-fg">{project.responsibleTechnicianName}</span>
                          </div>
                        ) : (
                          <span className="text-fg-muted italic">Chưa chỉ định KTV</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-fg-2">
                        {project.scheduledStartsAt ? (
                          <div>
                            <span className="text-primary font-medium">{formatDateTimeText(project.scheduledStartsAt)}</span>
                            <p className="text-[11px] text-fg-muted">Lịch hẹn thi công</p>
                          </div>
                        ) : (
                          <div>
                            <span>{formatDateTimeText(project.createdAt)}</span>
                            <p className="text-[11px] text-fg-muted">Ngày tạo</p>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <Badge tone={meta.tone}>
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={detailUrl}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-control text-meta font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          <span>Chi tiết</span>
                          <Icon name="chevron_right" className="text-[16px]" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab Content: After-sales */}
      {activeTab === 'afterSales' && (
        <div className="overflow-x-auto">
          {serviceRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-fg-muted">
              <Icon name="handyman" className="text-[32px] text-fg-3 mb-2" />
              <p className="text-body font-medium text-fg">Chưa có yêu cầu sự cố hoặc bảo hành</p>
              <p className="text-meta text-fg-2">Các ticket phản hồi từ khách hàng sẽ hiển thị tại đây.</p>
            </div>
          ) : (
            <table className="w-full text-left text-meta border-collapse">
              <thead>
                <tr className="border-b border-line text-fg-2 font-medium">
                  <th className="py-2.5 px-3">Mã ticket</th>
                  <th className="py-2.5 px-3">Loại dịch vụ & Mô tả</th>
                  <th className="py-2.5 px-3">Thời gian tạo</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {serviceRequests.slice(0, 6).map((req) => {
                  const meta = requestStatusMeta(req.status, 'manager')
                  const detailUrl = ROUTES.admin.afterSalesRequest.replace(':id', req.requestId)
                  return (
                    <tr key={req.requestId} className="hover:bg-surface-3/50 transition-colors">
                      <td className="py-3 px-3">
                        <Link to={detailUrl} className="font-semibold text-primary hover:underline">
                          {req.requestNumber || `#${req.requestId.slice(0, 8)}`}
                        </Link>
                        <p className="text-[12px] text-fg-muted">Dự án: #{req.projectId.slice(0, 8)}</p>
                      </td>
                      <td className="py-3 px-3 max-w-[280px]">
                        <span className="font-medium text-fg">{requestKindLabel(req.kind)}</span>
                        <p className="text-[12px] text-fg-2 line-clamp-1 truncate">{req.description || 'Không có mô tả chi tiết'}</p>
                      </td>
                      <td className="py-3 px-3 text-fg-2">
                        {formatDateTimeText(req.createdAt)}
                      </td>
                      <td className="py-3 px-3">
                        <Badge tone={meta.tone}>
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={detailUrl}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-control text-meta font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          <span>Xử lý</span>
                          <Icon name="chevron_right" className="text-[16px]" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab Content: Dispatch Queue */}
      {activeTab === 'dispatch' && (
        <div className="overflow-x-auto">
          {dispatchItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-fg-muted">
              <Icon name="check_circle" className="text-[32px] text-ok mb-2" />
              <p className="text-body font-medium text-fg">Hàng chờ điều phối KTV hiện đang trống</p>
              <p className="text-meta text-fg-2">Mọi lịch hẹn khảo sát đã được gán KTV hoặc chưa có yêu cầu mới.</p>
            </div>
          ) : (
            <table className="w-full text-left text-meta border-collapse">
              <thead>
                <tr className="border-b border-line text-fg-2 font-medium">
                  <th className="py-2.5 px-3">Mã điều phối</th>
                  <th className="py-2.5 px-3">Khách hàng & Công trình</th>
                  <th className="py-2.5 px-3">Khu vực phục vụ</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {dispatchItems.slice(0, 6).map((item) => {
                  const meta = dispatchStatusMeta(item.status)
                  const detailUrl = ROUTES.admin.dispatchRequest.replace(':id', item.dispatchRequestId)
                  return (
                    <tr key={item.dispatchRequestId} className="hover:bg-surface-3/50 transition-colors">
                      <td className="py-3 px-3">
                        <Link to={detailUrl} className="font-semibold text-primary hover:underline">
                          #{item.dispatchRequestId.slice(0, 8)}
                        </Link>
                        <p className="text-[12px] text-fg-muted">{formatDateTimeText(item.createdAt)}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-fg">{item.customerName}</p>
                        <p className="text-[12px] text-fg-2 truncate max-w-[220px]">{item.propertyName} ({item.province})</p>
                      </td>
                      <td className="py-3 px-3 text-fg-2">
                        {item.zone?.name || item.province || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <Badge tone={meta.tone}>
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={detailUrl}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-control text-meta font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          <span>Điều phối</span>
                          <Icon name="chevron_right" className="text-[16px]" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

