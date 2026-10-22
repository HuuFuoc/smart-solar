import { Badge } from '@/components/common/ui/badge'
import { Facts } from '@/features/pre-surveys/Facts'
import { directionLabel } from '@/features/pre-surveys/preSurveyDisplay'
import {
  feasibilityLabel,
  feasibilityTone,
  formatCoordinates,
  obstacleKindLabel,
  roofConditionLabel,
} from '@/features/onsite-survey/onSiteSurveyDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import type { OnSiteSurveyView } from '@/types/res/technicianOnSiteSurveyRes'

const num = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
const n = (value: number | null | undefined, unit: string) => (value == null ? '—' : `${num.format(value)} ${unit}`)
const t = (value: string | null | undefined) => (value && value.trim() ? value : '—')

// Kết quả khảo sát tại công trình, chỉ đọc: kỹ thuật viên xem lại sau khi hoàn thành, kinh doanh xem để báo giá
export function OnSiteSurveySummary({ survey }: { survey: OnSiteSurveyView }) {
  const d = survey.data
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {d.installationFeasibility && (
          <Badge tone={feasibilityTone(d.installationFeasibility)}>{feasibilityLabel(d.installationFeasibility)}</Badge>
        )}
        <span className="tnum text-meta text-fg-2">
          Bắt đầu {formatMoment(survey.startedAt)}
          {survey.completedAt ? `, hoàn thành ${formatMoment(survey.completedAt)}` : ''}
        </span>
      </div>

      <Facts
        items={[
          { k: 'Loại mái', v: t(d.roofType) },
          { k: 'Vật liệu', v: t(d.roofMaterial) },
          {
            k: 'Dài × rộng',
            v: d.roofLengthM == null ? '—' : `${num.format(d.roofLengthM)} × ${n(d.roofWidthM, 'm')}`,
          },
          { k: 'Diện tích lắp được', v: n(d.usableAreaM2, 'm²') },
          { k: 'Độ dốc', v: n(d.tiltDegree, 'độ') },
          {
            k: 'Hướng mái',
            v: d.azimuthDegree == null ? '—' : `${num.format(d.azimuthDegree)} độ, ${directionLabel(d.azimuthDegree)}`,
          },
          { k: 'Tình trạng mái', v: roofConditionLabel(d.roofCondition) },
          { k: 'Toạ độ đo', v: formatCoordinates(d.measuredLatitude, d.measuredLongitude) },
        ]}
      />

      <Facts
        column
        items={[
          { k: 'Tủ điện', v: t(d.electricalCabinetNotes) },
          { k: 'Đấu nối điện', v: t(d.electricalConnectionNotes) },
          { k: 'Vị trí đặt inverter', v: t(d.proposedInverterLocation) },
          { k: 'Bố trí tấm pin', v: t(d.proposedPanelLayoutNotes) },
          { k: 'Ghi chú', v: t(d.notes) },
        ]}
        className="[&_dd]:whitespace-pre-line"
      />

      <div>
        <h4 className="mb-2 text-body font-medium text-fg">Vật cản ({survey.obstacles.length})</h4>
        {survey.obstacles.length === 0 ? (
          <p className="text-body text-fg-2">Không ghi vật cản nào.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {survey.obstacles.map((o, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2 text-body">
                <span className="min-w-0">
                  <span className="font-medium text-fg">{obstacleKindLabel(o.kind)}</span>
                  {o.description && <span className="text-fg-2">: {o.description}</span>}
                </span>
                <span className="tnum text-meta text-fg-2">
                  Cao {n(o.heightM, 'm')}, diện tích {n(o.areaM2, 'm²')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
