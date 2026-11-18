import { ButtonLink } from '@/components/common/ui/button'
import { Panel, PanelHeader } from '@/components/common/ui/panel'
import { StackedBar, type StackedPart } from '@/components/common/ui/stacked-bar'
import { Stat } from '@/components/common/ui/stat'
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
      <div className="space-y-4 rounded-container border border-line bg-panel p-4">
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

  // Thống kê sự cố & bảo hành thực tế
  const totalServices = serviceRequests.length || 1
  const openServices = serviceRequests.filter((s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED').length
  const completedServices = serviceRequests.filter((s) => s.status === 'COMPLETED').length
  const resolutionRate = Math.round((completedServices / totalServices) * 100)

  const pct = (n: number) => (projects.length > 0 ? Math.round((n / totalProjects) * 100) : 0)
  const parts: StackedPart[] = [
    {
      key: 'pending',
      label: 'Chờ gán kỹ thuật viên',
      value: pendingAssign,
      percent: pct(pendingAssign),
      color: 'var(--warn)',
    },
    { key: 'progress', label: 'Đang thi công', value: inProgress, percent: pct(inProgress), color: 'var(--accent)' },
    {
      key: 'acceptance',
      label: 'Chờ nghiệm thu',
      value: awaitingAcceptance,
      percent: pct(awaitingAcceptance),
      color: 'var(--info)',
    },
    { key: 'done', label: 'Hoàn thành', value: completed, percent: pct(completed), color: 'var(--fg-3)' },
  ]

  return (
    <Panel raised>
      <PanelHeader
        title="Tiến độ thi công"
        description={`${projects.length} công trình`}
        action={
          <ButtonLink to={ROUTES.admin.installations} variant="info" size="sm" icon="list">
            Xem thi công
          </ButtonLink>
        }
      />
      <StackedBar parts={parts} />
      <dl className="mt-4 grid grid-cols-2 content-start gap-x-8 gap-y-6 border-t border-line pt-4">
        <Stat
          label="Bảo hành, sửa chữa đang mở"
          value={openServices}
          note={`${serviceRequests.length} yêu cầu, ${resolutionRate}% đã xong`}
        />
        <Stat label="Sản phẩm trong danh mục" value={totalProducts} note={`${totalZones} khu vực phục vụ`} />
      </dl>
    </Panel>
  )
}
