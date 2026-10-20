import { Icon } from '@/components/common/stitch-ui/Icon'
import {
  congestionText,
  formatDistance,
  formatDuration,
  formatMoment,
  originLabel,
  routeCalculationLabel,
} from '@/features/scheduling/schedulingDisplay'
import type { TravelEstimateView } from '@/types/res/technicianAvailabilityRes'

// Một chặng đường (ước tính của Vietmap). Không tính được thì ghi rõ, không bao giờ in "0 phút"
export function TravelSummary({ leg, label }: { leg: TravelEstimateView; label?: string }) {
  const ok = leg.routeCalculationStatus === 'OK' && leg.durationSeconds != null
  return (
    <div className="min-w-0 text-body">
      {ok ? (
        <p className="text-fg">
          {label ?? originLabel(leg.originKind)}: {formatDistance(leg.distanceMeters)},{' '}
          {formatDuration(leg.durationSeconds)} đi xe máy, cộng {leg.safetyBufferMinutes} phút dự phòng
        </p>
      ) : (
        <p className="flex items-center gap-1.5 text-warn">
          <Icon name="warning" className="shrink-0 text-[16px]" />
          {label ?? originLabel(leg.originKind)}: chưa tính được đường đi (
          {routeCalculationLabel(leg.routeCalculationStatus)})
        </p>
      )}
      <p className="mt-0.5 text-meta text-fg-3">
        {congestionText(leg.congestion)}. Ước tính lúc {formatMoment(leg.estimatedAt)}.
      </p>
    </div>
  )
}
