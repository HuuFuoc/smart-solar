import { Stat, StatRow } from '@/components/common/ui/stat'

type DashboardStatsProps = {
  activeProjects: number
  upcomingAppointments: number
  completedProjects: number
  pendingServices: number
}

export function DashboardStats({
  activeProjects,
  upcomingAppointments,
  completedProjects,
  pendingServices,
}: DashboardStatsProps) {
  return (
    <StatRow framed className="mb-8">
      <Stat label="Dự án đang triển khai" value={activeProjects} tone={activeProjects > 0 ? 'ok' : undefined} />
      <Stat label="Lịch hẹn sắp tới" value={upcomingAppointments} tone={upcomingAppointments > 0 ? 'ok' : undefined} />
      <Stat label="Hệ thống đã bàn giao" value={completedProjects} />
      <Stat label="Bảo hành đang xử lý" value={pendingServices} tone={pendingServices > 0 ? 'warn' : undefined} />
    </StatRow>
  )
}
