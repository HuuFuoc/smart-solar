import { Stat, StatRow } from '@/components/common/ui/stat'

type SalesDashboardStatsProps = {
  totalSurveys: number
  pendingAssignment: number
  scheduledSurveys: number
  completedSurveys: number
}

export function SalesDashboardStats({
  totalSurveys,
  pendingAssignment,
  scheduledSurveys,
  completedSurveys,
}: SalesDashboardStatsProps) {
  return (
    <StatRow>
      <Stat label="Hồ sơ đang quản lý" value={totalSurveys} />
      <Stat
        label="Chờ xếp lịch kỹ thuật viên"
        value={pendingAssignment}
        tone={pendingAssignment > 0 ? 'warn' : undefined}
      />
      <Stat label="Đã lên lịch khảo sát" value={scheduledSurveys} />
      <Stat label="Sẵn sàng lập báo giá" value={completedSurveys} />
    </StatRow>
  )
}
