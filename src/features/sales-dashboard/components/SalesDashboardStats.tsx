import { Icon } from '@/components/common/stitch-ui/Icon'
import { cx } from '@/utils/cx'

type SalesDashboardStatsProps = {
  totalSurveys: number
  pendingAssignment: number
  scheduledSurveys: number
  completedSurveys: number
}

type KpiCardProps = {
  label: string
  value: number
  icon: string
  hint: string
  iconBgClass: string
  valueClass?: string
}

function KpiCard({ label, value, icon, hint, iconBgClass, valueClass }: KpiCardProps) {
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-container border border-line bg-surface-2 p-3.5 sm:p-4 shadow-sm transition-all duration-200 hover:border-line-2 hover:shadow-md">
      {/* Top: Nhãn & Icon nhỏ đại diện */}
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

      {/* Bottom: Số liệu to nổi bật & Chú thích nhỏ */}
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className={cx('tnum text-display font-bold tracking-tight', valueClass || 'text-fg')}>
          {value}
        </span>
        <span className="text-meta text-fg-3">{hint}</span>
      </div>
    </div>
  )
}

export function SalesDashboardStats({
  totalSurveys,
  pendingAssignment,
  scheduledSurveys,
  completedSurveys,
}: SalesDashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <KpiCard
        label="Hồ sơ đang quản lý"
        value={totalSurveys}
        icon="folder_shared"
        hint="tổng hồ sơ"
        iconBgClass="bg-surface-3 text-fg-2"
        valueClass="text-fg"
      />
      <KpiCard
        label="Chờ xếp lịch kỹ thuật viên"
        value={pendingAssignment}
        icon="hourglass_top"
        hint="chờ KTV nhận"
        iconBgClass="bg-warn-soft text-warn"
        valueClass={pendingAssignment > 0 ? 'text-warn' : 'text-fg'}
      />
      <KpiCard
        label="Đã lên lịch khảo sát"
        value={scheduledSurveys}
        icon="calendar_month"
        hint="đã có lịch hẹn"
        iconBgClass="bg-info-soft text-info"
        valueClass={scheduledSurveys > 0 ? 'text-info' : 'text-fg'}
      />
      <KpiCard
        label="Sẵn sàng lập báo giá"
        value={completedSurveys}
        icon="request_quote"
        hint="khảo sát xong"
        iconBgClass="bg-ok-soft text-ok"
        valueClass={completedSurveys > 0 ? 'text-ok' : 'text-fg'}
      />
    </div>
  )
}
