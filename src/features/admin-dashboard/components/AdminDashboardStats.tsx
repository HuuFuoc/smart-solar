import { Link } from 'react-router'
import { Skeleton } from '@/components/common/ui/states'
import { ROUTES } from '@/routes/paths'

type AdminDashboardStatsProps = {
  isLoading?: boolean
  inProgressProjects: number
  readyContracts: number
  openDispatchCount: number
  pendingServicesCount: number
  urgentServicesCount: number
  totalTechnicians: number
  readyTechnicians: number
  missingBaseCount: number
  totalUsers: number
  zonesCount: number
}

// Một ô số: cả ô là link tới màn của chỉ số đó. Số là chữ thường; việc cần làm ngay báo đỏ ở khối riêng
function KpiCard({ label, value, note, to }: { label: string; value: number; note?: string; to: string }) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-1 bg-canvas px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:-outline-offset-2"
    >
      <span className="text-meta text-fg-2 group-hover:text-fg">{label}</span>
      <span className="tnum text-figure font-semibold text-fg">{value}</span>
      {note && <span className="text-meta text-fg-2">{note}</span>}
    </Link>
  )
}

const GRID =
  'grid grid-cols-2 gap-px overflow-hidden rounded-container border border-line bg-line md:grid-cols-3 xl:grid-cols-5'

export function AdminDashboardStats({
  isLoading,
  inProgressProjects,
  readyContracts,
  openDispatchCount,
  pendingServicesCount,
  urgentServicesCount,
  totalTechnicians,
  readyTechnicians,
  missingBaseCount,
  totalUsers,
  zonesCount,
}: AdminDashboardStatsProps) {
  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Đang tải" className={GRID}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2 bg-canvas px-4 py-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={GRID}>
      <KpiCard
        label="Dự án thi công"
        value={inProgressProjects + readyContracts}
        note={`${inProgressProjects} đang lắp, ${readyContracts} hợp đồng chờ tạo dự án`}
        to={ROUTES.admin.installations}
      />
      <KpiCard
        label="Điều phối kỹ thuật viên"
        value={openDispatchCount}
        note="yêu cầu chờ xếp"
        to={ROUTES.admin.dispatch}
      />
      <KpiCard
        label="Bảo hành, sửa chữa đang mở"
        value={pendingServicesCount}
        note={urgentServicesCount > 0 ? `${urgentServicesCount} chờ bạn xử lý` : undefined}
        to={ROUTES.admin.afterSales}
      />
      <KpiCard
        label="Kỹ thuật viên"
        value={totalTechnicians}
        note={
          missingBaseCount > 0
            ? `${readyTechnicians} sẵn sàng, ${missingBaseCount} chưa có khu vực`
            : `${readyTechnicians} sẵn sàng nhận lịch`
        }
        to={ROUTES.admin.technicians}
      />
      <KpiCard label="Tài khoản" value={totalUsers} note={`${zonesCount} khu vực phục vụ`} to={ROUTES.admin.users} />
    </div>
  )
}
