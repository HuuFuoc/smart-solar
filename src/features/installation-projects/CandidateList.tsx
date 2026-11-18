import { useId } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { ineligibleLabel } from '@/features/scheduling/schedulingDisplay'
import type { InstallationCandidateView } from '@/types/res/managerInstallationsRes'
import { cx } from '@/utils/cx'

// Kết quả "ai nhận được khoảng thời gian này" của backend (technician-candidates): người nhận được chọn được, người bận ghi lý do.
// Dùng ở phân công thi công và xếp buổi sau bán (cùng bộ kiểm tra lịch của backend)

export function CandidateList({
  candidates,
  zoneName,
  currentId,
  value,
  onChange,
}: {
  candidates: InstallationCandidateView[]
  zoneName: string | null
  currentId: string | null
  value: string | null
  onChange: (id: string) => void
}) {
  const name = useId()
  // Backend xếp người trong khu vực trước, người ngoài khu vực sau
  const groups = [
    { title: zoneName ? `Trong khu vực ${zoneName}` : 'Trong khu vực', items: candidates.filter((c) => !c.crossZone) },
    { title: 'Ngoài khu vực của công trình', items: candidates.filter((c) => c.crossZone) },
  ].filter((group) => group.items.length > 0)
  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Kỹ thuật viên phụ trách</legend>
      {groups.map((group) => (
        <div key={group.title}>
          <p className="mb-2 text-meta font-medium text-fg-2">{group.title}</p>
          <div className="space-y-2">
            {group.items.map((c) => (
              <label
                key={c.technicianUserId}
                className={cx(
                  'flex gap-3 rounded-control border border-line-2 bg-panel px-4 py-3',
                  c.isEligible
                    ? 'press cursor-pointer [&:not(:has(:checked)):hover]:border-fg-3 has-checked:border-accent-line has-checked:bg-accent-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-ring'
                    : 'cursor-not-allowed bg-surface-2',
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={c.technicianUserId}
                  disabled={!c.isEligible}
                  checked={value === c.technicianUserId}
                  onChange={() => onChange(c.technicianUserId)}
                  className="mt-1 size-4 shrink-0 accent-accent"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={cx('font-semibold', c.isEligible ? 'text-fg' : 'text-fg-2')}>{c.fullName}</span>
                    {c.technicianUserId === currentId && <Badge tone="info">Đang phụ trách</Badge>}
                  </span>
                  <span className="mt-1 block text-meta text-fg-2">
                    {c.isEligible ? 'Nhận được khoảng thời gian này' : `Không nhận được: ${ineligibleLabel(c.reason)}`}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  )
}
