import { MetricCard } from '@/components/common/stitch-ui/MetricCard'

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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard label="Hồ sơ đang quản lý" value={totalSurveys} icon="assignment" tone="primary" />

      <MetricCard label="Chờ xếp lịch kỹ thuật viên" value={pendingAssignment} icon="schedule" tone="secondary" />

      <MetricCard label="Đã lên lịch khảo sát" value={scheduledSurveys} icon="calendar_month" tone="tertiary" />

      <MetricCard
        label="Sẵn sàng lập báo giá"
        value={completedSurveys}
        icon="request_quote"
        tone="primary"
        labelTone="primary"
        valueTone="primary"
      />
    </div>
  )
}
