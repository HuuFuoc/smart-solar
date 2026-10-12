import { useId } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { TravelSummary } from '@/features/scheduling/components/TravelSummary'
import { formatTime } from '@/features/scheduling/components/schedulingDisplay'
import type { AvailableTechnicianView } from '@/types/res/technicianAvailabilityRes'
import { cx } from '@/utils/cx'

/*
  Chọn một kỹ thuật viên trong danh sách backend trả (đã kiểm tra lịch, giờ làm, lịch nghỉ, số lịch / ngày và đường đi);
  không bao giờ cho chọn người ngoài danh sách. Mỗi lựa chọn là một radio thật trong khối có viền; khối đang chọn mang
  nền "đang chọn" như mọi lựa chọn khác. Thứ tự giữ như backend: người đang giữ chỗ lên đầu, rồi người tới nhanh hơn.
*/
export function TechnicianChoiceList({
  technicians,
  value,
  onChange,
  currentAssigneeId,
  label,
}: {
  technicians: AvailableTechnicianView[]
  value: string | null
  onChange: (technicianUserId: string) => void
  /** Người đang phụ trách lịch (khi đổi người / đổi giờ). */
  currentAssigneeId?: string | null
  label: string
}) {
  const name = useId()
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="space-y-2">
        {technicians.map((t) => (
          <label
            key={t.technicianUserId}
            className={cx(
              'press flex cursor-pointer gap-3 rounded-control border border-line-2 bg-canvas px-4 py-3',
              '[&:not(:has(:checked)):hover]:border-fg-3 has-checked:border-accent-line has-checked:bg-accent-soft',
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-ring',
            )}
          >
            <input
              type="radio"
              name={name}
              value={t.technicianUserId}
              checked={value === t.technicianUserId}
              onChange={() => onChange(t.technicianUserId)}
              className="mt-1 size-4 shrink-0 accent-accent"
            />
            <span className="min-w-0 flex-1 space-y-2">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-fg">{t.fullName}</span>
                {t.technicianUserId === currentAssigneeId && <Badge tone="info">Đang phụ trách</Badge>}
                {t.isCurrentReservation && t.technicianUserId !== currentAssigneeId && <Badge tone="accent">Hệ thống đang giữ chỗ</Badge>}
              </span>
              <span className="block text-meta text-fg-2">
                Tới nơi sớm nhất <span className="tnum font-medium text-fg">{formatTime(t.earliestArrivalAt)}</span>, {t.activeAppointmentsThatDay} lịch
                khác trong ngày
              </span>
              <TravelSummary leg={t.inbound} />
              {t.outbound && <TravelSummary leg={t.outbound} label="Sau lịch này, tới công trình kế tiếp" />}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
