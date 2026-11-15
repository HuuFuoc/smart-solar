import { Icon } from '@/components/common/stitch-ui/Icon'

type SalesDashboardStatsProps = {
  totalSurveys: number
  pendingAssignment: number
  scheduledSurveys: number
  completedSurveys: number
}

type Tone = 'neutral' | 'warn' | 'info' | 'ok'

function Kpi({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string
  value: number
  note: string
  icon: string
  tone: Tone
}) {
  return (
    <div className="sv-kpi" data-tone={tone}>
      <div className="flex items-start justify-between gap-3">
        <dt className="sv-label text-meta">{label}</dt>
        <span className="sv-stat-icon" aria-hidden>
          <Icon name={icon} className="text-[20px]" />
        </span>
      </div>
      <dd className="flex flex-wrap items-baseline gap-x-3">
        <span className="tnum text-display font-semibold">{value}</span>
        <span className="sv-kpi-note text-meta">{note}</span>
      </dd>
    </div>
  )
}

// Bốn số của hồ sơ đang quản lý; phần trăm tính trên tổng hồ sơ đang quản lý
export function SalesDashboardStats({
  totalSurveys,
  pendingAssignment,
  scheduledSurveys,
  completedSurveys,
}: SalesDashboardStatsProps) {
  const pct = (n: number) => (totalSurveys > 0 ? Math.round((n / totalSurveys) * 100) : 0)
  return (
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label="Hồ sơ đang quản lý" value={totalSurveys} note="Tất cả dự án" icon="description" tone="neutral" />
      <Kpi
        label="Chờ kỹ thuật viên nhận"
        value={pendingAssignment}
        note={`${pct(pendingAssignment)}% tổng hồ sơ`}
        icon="schedule"
        tone="warn"
      />
      <Kpi
        label="Đã có lịch khảo sát"
        value={scheduledSurveys}
        note={`${pct(scheduledSurveys)}% tổng hồ sơ`}
        icon="calendar_month"
        tone="info"
      />
      <Kpi label="Khảo sát xong, chờ báo giá" value={completedSurveys} note="Cần xử lý" icon="task_alt" tone="ok" />
    </dl>
  )
}
