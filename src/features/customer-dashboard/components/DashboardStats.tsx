import { Icon } from '@/components/common/stitch-ui/Icon'
import { cx } from '@/utils/cx'

type DashboardStatsProps = {
  activeProjects: number
  activeProgressPct?: number | null
  upcomingAppointments: number
  nearestAppointmentTime?: string | null
  completedProjects: number
  pendingServices: number
}

function formatShortDateTime(isoString: string | null | undefined): string {
  if (!isoString) return 'Chưa có lịch'
  try {
    const d = new Date(isoString)
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }).format(d)
  } catch {
    return 'Đã lên lịch'
  }
}

type StatCardProps = {
  label: string
  value: number | string
  unit?: string
  icon: string
  hint: string
  iconBgClass: string
  valueClass?: string
}

function StatCard({ label, value, unit, icon, hint, iconBgClass, valueClass }: StatCardProps) {
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-container border border-line bg-surface-2 p-3.5 sm:p-4 shadow-sm transition-all duration-200 hover:border-line-2 hover:shadow-md">
      {/* Top: Nhãn & Icon nhỏ */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-meta font-medium text-fg-2 leading-tight">{label}</span>
        <div
          className={cx(
            'flex size-8 shrink-0 items-center justify-center rounded-control transition-transform group-hover:scale-105',
            iconBgClass,
          )}
        >
          <Icon name={icon} className="text-[18px]" />
        </div>
      </div>

      {/* Bottom: Số liệu to nổi bật & Chú thích phụ */}
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className={cx('tnum text-display font-bold tracking-tight', valueClass || 'text-fg')}>
            {value}
          </span>
          {unit && <span className="text-meta text-fg-2 font-medium">{unit}</span>}
        </div>
        <span className="text-meta text-fg-3 truncate max-w-[130px]" title={hint}>
          {hint}
        </span>
      </div>
    </div>
  )
}

export function DashboardStats({
  activeProjects,
  activeProgressPct,
  upcomingAppointments,
  nearestAppointmentTime,
  completedProjects,
  pendingServices,
}: DashboardStatsProps) {
  const progressText =
    activeProgressPct != null && activeProgressPct > 0 ? `${activeProgressPct}% tiến độ` : 'Chờ triển khai'

  const appointmentHint = nearestAppointmentTime ? formatShortDateTime(nearestAppointmentTime) : 'Chưa có lịch mới'

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {/* Card 1: Dự án đang lắp đặt */}
      <StatCard
        label="Dự án đang lắp đặt"
        value={activeProjects}
        unit="công trình"
        icon="solar_power"
        hint={activeProjects > 0 ? progressText : 'Chưa có dự án'}
        iconBgClass="bg-accent-soft text-accent-fg"
        valueClass={activeProjects > 0 ? 'text-accent-fg' : 'text-fg'}
      />

      {/* Card 2: Lịch hẹn gần nhất */}
      <StatCard
        label="Lịch hẹn gần nhất"
        value={upcomingAppointments}
        unit="lịch hẹn"
        icon="calendar_month"
        hint={appointmentHint}
        iconBgClass="bg-info-soft text-info"
        valueClass={upcomingAppointments > 0 ? 'text-info' : 'text-fg'}
      />

      {/* Card 3: Hệ thống đã bàn giao */}
      <StatCard
        label="Hệ thống đã bàn giao"
        value={completedProjects}
        unit="hệ thống"
        icon="electric_bolt"
        hint={completedProjects > 0 ? 'Vận hành ổn định' : 'Chờ nghiệm thu'}
        iconBgClass="bg-ok-soft text-ok"
        valueClass={completedProjects > 0 ? 'text-ok' : 'text-fg'}
      />

      {/* Card 4: Yêu cầu bảo hành/hỗ trợ */}
      <StatCard
        label="Yêu cầu bảo hành & sửa chữa"
        value={pendingServices}
        unit="yêu cầu"
        icon="support_agent"
        hint={pendingServices > 0 ? 'KTV đang xử lý' : 'Tất cả ổn định'}
        iconBgClass="bg-warn-soft text-warn"
        valueClass={pendingServices > 0 ? 'text-warn' : 'text-fg'}
      />
    </div>
  )
}
