import { Icon } from '@/components/common/stitch-ui/Icon'
import { ButtonLink } from '@/components/common/ui/button'
import { Skeleton } from '@/components/common/ui/states'
import { ROUTES } from '@/routes/paths'
import type { InstallationProjectSummary } from '@/types/res/managerInstallationsRes'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'

type AdminSystemPipelineCardProps = {
  isLoading?: boolean
  projects: InstallationProjectSummary[]
  serviceRequests: ServiceRequestSummary[]
  totalProducts: number
  totalZones: number
}

export function AdminSystemPipelineCard({
  isLoading,
  projects,
  serviceRequests,
  totalProducts,
  totalZones,
}: AdminSystemPipelineCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-container border border-line bg-surface-2 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-28 w-full rounded-control" />
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Skeleton className="h-20 rounded-control" />
          <Skeleton className="h-20 rounded-control" />
        </div>
      </div>
    )
  }

  // Thống kê phân bổ trạng thái dự án lắp đặt thực tế
  const totalProjects = projects.length || 1
  const pendingAssign = projects.filter(
    (p) => p.status === 'PENDING_ASSIGNMENT' || p.status === 'PENDING_TECHNICIAN_ACCEPTANCE',
  ).length
  const inProgress = projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'SCHEDULED').length
  const awaitingAcceptance = projects.filter(
    (p) => p.status === 'PENDING_CUSTOMER_ACCEPTANCE' || p.status === 'REWORK_REQUIRED',
  ).length
  const completed = projects.filter((p) => p.status === 'COMPLETED').length

  const pendingPct = projects.length > 0 ? Math.round((pendingAssign / totalProjects) * 100) : 0
  const inProgressPct = projects.length > 0 ? Math.round((inProgress / totalProjects) * 100) : 0
  const acceptancePct = projects.length > 0 ? Math.round((awaitingAcceptance / totalProjects) * 100) : 0
  const completedPct = projects.length > 0 ? Math.round((completed / totalProjects) * 100) : 0

  // Thống kê sự cố & bảo hành thực tế
  const totalServices = serviceRequests.length || 1
  const openServices = serviceRequests.filter((s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED').length
  const completedServices = serviceRequests.filter((s) => s.status === 'COMPLETED').length
  const resolutionRate = Math.round((completedServices / totalServices) * 100)

  return (
    <div className="rounded-container border border-line bg-surface-2 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header với đường ngăn cách */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div>
          <h3 className="text-body font-semibold text-fg flex items-center gap-2">
            <Icon name="query_stats" className="text-primary text-[20px]" />
            Giám sát vận hành & Tiến độ thi công toàn hệ thống
          </h3>
          <p className="text-meta text-fg-2 mt-0.5">
            Tổng hợp dữ liệu theo thời gian thực từ các module thi công, dịch vụ và danh mục
          </p>
        </div>
        <ButtonLink to={ROUTES.admin.installations} variant="ghost" size="sm" className="text-primary gap-1">
          <span>Xem chi tiết thi công</span>
          <Icon name="arrow_forward" className="text-[16px]" />
        </ButtonLink>
      </div>

      {/* Bảng con 1: Khối tiến trình vòng đời dự án lắp đặt có viền riêng biệt */}
      <div className="rounded-control border border-line bg-surface-1 p-3.5 sm:p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between text-meta">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-fg">Tiến trình vòng đời dự án</span>
            <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-semibold text-fg-2">
              {projects.length} công trình
            </span>
          </div>
          <span className="text-fg-muted text-[12px]">Phân bổ theo giai đoạn</span>
        </div>

        {/* Thanh bar phân đoạn */}
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-3 border border-line/40">
          {projects.length === 0 ? (
            <div className="w-full bg-surface-3 text-center text-[10px] text-fg-muted leading-3">Chưa có dự án</div>
          ) : (
            <>
              {pendingPct > 0 && (
                <div
                  style={{ width: `${pendingPct}%` }}
                  className="bg-warn transition-all duration-300"
                  title={`Chờ gán & xác nhận: ${pendingAssign} (${pendingPct}%)`}
                />
              )}
              {inProgressPct > 0 && (
                <div
                  style={{ width: `${inProgressPct}%` }}
                  className="bg-accent transition-all duration-300"
                  title={`Đang thi công: ${inProgress} (${inProgressPct}%)`}
                />
              )}
              {acceptancePct > 0 && (
                <div
                  style={{ width: `${acceptancePct}%` }}
                  className="bg-info transition-all duration-300"
                  title={`Chờ nghiệm thu / Rework: ${awaitingAcceptance} (${acceptancePct}%)`}
                />
              )}
              {completedPct > 0 && (
                <div
                  style={{ width: `${completedPct}%` }}
                  className="bg-ok transition-all duration-300"
                  title={`Hoàn thành: ${completed} (${completedPct}%)`}
                />
              )}
            </>
          )}
        </div>

        {/* Chú giải các phân đoạn với đường ngăn cách mờ */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-line/60 text-meta sm:grid-cols-4">
          <div className="flex items-center justify-between rounded-control bg-surface-2/60 px-2.5 py-1.5 border border-line/50">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="size-2 rounded-full bg-warn shrink-0" />
              <span className="text-fg-2 text-[12px] truncate">Chờ gán KTV</span>
            </div>
            <span className="font-semibold text-fg text-xs pl-1">{pendingAssign}</span>
          </div>

          <div className="flex items-center justify-between rounded-control bg-surface-2/60 px-2.5 py-1.5 border border-line/50">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="size-2 rounded-full bg-accent shrink-0" />
              <span className="text-fg-2 text-[12px] truncate">Đang thi công</span>
            </div>
            <span className="font-semibold text-fg text-xs pl-1">{inProgress}</span>
          </div>

          <div className="flex items-center justify-between rounded-control bg-surface-2/60 px-2.5 py-1.5 border border-line/50">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="size-2 rounded-full bg-info shrink-0" />
              <span className="text-fg-2 text-[12px] truncate">Nghiệm thu</span>
            </div>
            <span className="font-semibold text-fg text-xs pl-1">{awaitingAcceptance}</span>
          </div>

          <div className="flex items-center justify-between rounded-control bg-surface-2/60 px-2.5 py-1.5 border border-line/50">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="size-2 rounded-full bg-ok shrink-0" />
              <span className="text-fg-2 text-[12px] truncate">Hoàn thành</span>
            </div>
            <span className="font-semibold text-fg text-xs pl-1">{completed}</span>
          </div>
        </div>
      </div>

      {/* Bảng con 2: Grid chỉ số nghiệp vụ sau bán & kho thiết bị */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Box Sau bán & Sự cố */}
        <div className="p-3.5 rounded-control border border-line bg-surface-1 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-meta font-medium text-fg-2 flex items-center gap-1.5">
              <Icon name="handyman" className="text-primary text-[16px]" />
              Xử lý sự cố & Bảo hành
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-title font-bold text-fg">{openServices}</span>
              <span className="text-meta text-fg-muted">đang mở / {serviceRequests.length} tổng</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[12px] font-semibold text-ok bg-ok-soft px-2.5 py-1 rounded-full border border-ok/20">
              {resolutionRate}% giải quyết
            </span>
          </div>
        </div>

        {/* Box Danh mục & Địa bàn */}
        <div className="p-3.5 rounded-control border border-line bg-surface-1 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-meta font-medium text-fg-2 flex items-center gap-1.5">
              <Icon name="inventory_2" className="text-primary text-[16px]" />
              Danh mục thiết bị & Phủ sóng
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-title font-bold text-fg">{totalProducts}</span>
              <span className="text-meta text-fg-muted">sản phẩm trong hệ thống</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[12px] font-semibold text-fg bg-surface-3 px-2.5 py-1 rounded-full border border-line">
              {totalZones} khu vực
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
