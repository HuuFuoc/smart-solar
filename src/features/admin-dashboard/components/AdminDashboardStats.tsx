import { Link } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Skeleton } from '@/components/common/ui/states'
import { ROUTES } from '@/routes/paths'
import { cx } from '@/utils/cx'

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

type KpiCardProps = {
  label: string
  value: number | string
  unit: string
  hint: string
  icon: string
  iconBgClass: string
  valueClass?: string
  to: string
}

function KpiCard({ label, value, unit, hint, icon, iconBgClass, valueClass, to }: KpiCardProps) {
  return (
    <Link
      to={to}
      className="group relative flex flex-col justify-between overflow-hidden rounded-container border border-line bg-surface-2 p-3.5 sm:p-4 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md"
    >
      {/* Top: Nhãn & Icon nhỏ có đường ngăn cách */}
      <div className="flex items-start justify-between gap-2 border-b border-line/60 pb-2.5">
        <span className="text-meta font-medium text-fg-2 leading-tight group-hover:text-fg transition-colors">
          {label}
        </span>
        <div
          className={cx(
            'flex size-8 shrink-0 items-center justify-center rounded-control transition-transform group-hover:scale-105 shadow-xs',
            iconBgClass,
          )}
        >
          <Icon name={icon} className="text-[18px]" />
        </div>
      </div>

      {/* Bottom: Số liệu lớn & Ghi chú phụ */}
      <div className="mt-3 flex items-baseline justify-between gap-2 pt-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className={cx('tnum text-display font-bold tracking-tight', valueClass || 'text-fg')}>{value}</span>
          <span className="text-meta font-medium text-fg-2">{unit}</span>
        </div>
        <span className="text-[12px] text-fg-3 truncate max-w-[130px] font-medium" title={hint}>
          {hint}
        </span>
      </div>
    </Link>
  )
}

function KpiSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-container border border-line bg-surface-2 p-3.5 sm:p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-line/60 pb-2.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-8 rounded-control" />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
      {/* Card 1: Dự án thi công */}
      <KpiCard
        label="Dự án thi công"
        value={inProgressProjects + readyContracts}
        unit="dự án"
        hint={`${inProgressProjects} đang lắp, ${readyContracts} chờ gán`}
        icon="construction"
        iconBgClass="bg-accent-soft text-accent-fg"
        valueClass={inProgressProjects + readyContracts > 0 ? 'text-accent-fg' : 'text-fg'}
        to={ROUTES.admin.installations}
      />

      {/* Card 2: Hàng đợi điều phối */}
      <KpiCard
        label="Điều phối hiện trường"
        value={openDispatchCount}
        unit="yêu cầu"
        hint={openDispatchCount > 0 ? `${openDispatchCount} việc chờ gán KTV` : 'Đã xếp lịch đủ'}
        icon="support_agent"
        iconBgClass="bg-info-soft text-info"
        valueClass={openDispatchCount > 0 ? 'text-info' : 'text-fg'}
        to={ROUTES.admin.dispatch}
      />

      {/* Card 3: Bảo hành & Sửa chữa */}
      <KpiCard
        label="Bảo hành & Sự cố"
        value={pendingServicesCount}
        unit="ticket"
        hint={urgentServicesCount > 0 ? `${urgentServicesCount} sự cố khẩn cấp` : 'Xử lý bình thường'}
        icon="build"
        iconBgClass="bg-warn-soft text-warn"
        valueClass={pendingServicesCount > 0 ? 'text-warn' : 'text-fg'}
        to={ROUTES.admin.afterSales}
      />

      {/* Card 4: Kỹ thuật viên */}
      <KpiCard
        label="Đội ngũ kỹ thuật viên"
        value={totalTechnicians}
        unit="nhân sự"
        hint={missingBaseCount > 0 ? `${missingBaseCount} KTV thiếu vùng` : `${readyTechnicians} sẵn sàng`}
        icon="engineering"
        iconBgClass="bg-surface-3 text-fg-2"
        valueClass={missingBaseCount > 0 ? 'text-warn' : 'text-fg'}
        to={ROUTES.admin.technicians}
      />

      {/* Card 5: Người dùng hệ thống */}
      <KpiCard
        label="Tài khoản & Địa bàn"
        value={totalUsers}
        unit="tài khoản"
        hint={`${zonesCount} khu vực phục vụ`}
        icon="manage_accounts"
        iconBgClass="bg-ok-soft text-ok"
        valueClass="text-fg"
        to={ROUTES.admin.users}
      />
    </div>
  )
}
