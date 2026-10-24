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
      <MetricCard
        label="HỒ SƠ ĐANG QUẢN LÝ"
        value={totalSurveys}
        icon="assignment"
        tone="primary"
        description="Tổng yêu cầu khảo sát của bạn"
        delta={
          totalSurveys > 0
            ? { text: 'Đang theo dõi tích cực', tone: 'positive', live: true }
            : undefined
        }
      />

      <MetricCard
        label="CHỜ XẾP LỊCH KỸ THUẬT"
        value={pendingAssignment}
        icon="schedule"
        tone="secondary"
        description="Đang chờ KTV nhận hoặc gán ca"
        delta={
          pendingAssignment > 0
            ? { text: `${pendingAssignment} hồ sơ cần lịch`, tone: 'neutral', icon: 'pending' }
            : { text: 'Đã xếp lịch toàn bộ', tone: 'positive', icon: 'check' }
        }
      />

      <MetricCard
        label="ĐÃ LÊN LỊCH KHẢO SÁT"
        value={scheduledSurveys}
        icon="calendar_month"
        tone="tertiary"
        description="KTV đã xác nhận lịch hẹn"
        delta={
          scheduledSurveys > 0
            ? { text: `${scheduledSurveys} ca sắp tới`, tone: 'positive', icon: 'event' }
            : undefined
        }
      />

      <MetricCard
        label="SẴN SÀNG LẬP BÁO GIÁ"
        value={completedSurveys}
        icon="request_quote"
        tone="primary"
        labelTone="primary"
        valueTone="primary"
        description="Đã có kết quả khảo sát thực địa"
        delta={
          completedSurveys > 0
            ? { text: 'Cơ hội chốt hợp đồng cao', tone: 'positive', icon: 'trending_up' }
            : undefined
        }
      />
    </div>
  )
}
