import { Badge } from '@/components/common/ui/badge'
import {
  cancellationText,
  rescheduleReasonText,
  scheduleStatusMeta,
  scheduleWhen,
} from '@/features/installation-schedules/scheduleDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import type { InstallationScheduleView } from '@/types/res/installationSchedulesRes'

// Lịch sử lịch thi công của một hợp đồng, mới nhất trước. Lịch đã huỷ / đã thay vẫn giữ để biết vì sao đổi

export function ScheduleHistory({
  history,
  viewer,
}: {
  history: InstallationScheduleView[]
  viewer: 'staff' | 'customer'
}) {
  if (history.length === 0) return null
  return (
    <ol className="divide-y divide-line">
      {history.map((s) => {
        const status = scheduleStatusMeta(s.status, viewer)
        return (
          <li key={s.scheduleId} className="space-y-1 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="tnum text-body font-medium text-fg">{scheduleWhen(s)}</span>
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>
            <p className="text-meta text-fg-2">
              Kỹ thuật viên {s.technicianName || 'chưa rõ'}, ghi lúc {formatMoment(s.createdAt)}
            </p>
            {s.changeReason && <p className="text-meta text-fg-2">Lý do đổi: {s.changeReason}</p>}
            {s.status === 'RESCHEDULE_REQUIRED' && (
              <p className="text-meta text-fg-2">{rescheduleReasonText(s.rescheduleReasonCode)}</p>
            )}
            {s.status === 'CANCELLED' && s.cancellationReason && (
              <p className="text-meta text-fg-2">{cancellationText(s.cancellationReason)}</p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
