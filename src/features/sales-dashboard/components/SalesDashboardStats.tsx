import { Stat, StatRow } from '@/components/common/ui/stat'

type SalesDashboardStatsProps = {
  totalSurveys: number
  pendingAssignment: number
  scheduledSurveys: number
  completedSurveys: number
}

// Bốn số của hồ sơ đang quản lý. Số là chữ thường, không tô màu: việc cần làm ngay đã báo đỏ ở khối riêng
export function SalesDashboardStats({
  totalSurveys,
  pendingAssignment,
  scheduledSurveys,
  completedSurveys,
}: SalesDashboardStatsProps) {
  return (
    <StatRow framed>
      <Stat label="Hồ sơ đang quản lý" value={totalSurveys} />
      <Stat label="Chờ kỹ thuật viên nhận" value={pendingAssignment} />
      <Stat label="Đã có lịch khảo sát" value={scheduledSurveys} />
      <Stat label="Khảo sát xong, chờ báo giá" value={completedSurveys} />
    </StatRow>
  )
}
