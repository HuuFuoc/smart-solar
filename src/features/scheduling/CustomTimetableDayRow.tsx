import { Button, IconButton } from '@/components/common/ui/button'
import { calculateDayHours, type Period } from '@/features/scheduling/workingScheduleRules'

interface CustomTimetableDayRowProps {
  dayLabel: string
  periods: Period[]
  onUpdate: (periods: Period[]) => void
  onCopyAll: () => void
}

export function CustomTimetableDayRow({ dayLabel, periods, onUpdate, onCopyAll }: CustomTimetableDayRowProps) {
  const isWorking = periods.length > 0
  const dayHours = calculateDayHours(periods)

  const handleToggle = (checked: boolean) => {
    onUpdate(
      checked
        ? [
            { start: '08:00', end: '12:00' },
            { start: '13:00', end: '17:00' },
          ]
        : [],
    )
  }

  const handlePeriodChange = (index: number, patch: Partial<Period>) => {
    onUpdate(periods.map((item, j) => (j === index ? { ...item, ...patch } : item)))
  }

  const handleRemovePeriod = (index: number) => {
    onUpdate(periods.filter((_, j) => j !== index))
  }

  const handleAddPeriod = () => {
    const lastEnd = periods.at(-1)?.end ?? '12:00'
    const nextStart = lastEnd < '13:00' ? '13:00' : lastEnd
    const h = Number(nextStart.split(':')[0] ?? 13)
    const nextEnd = `${String(Math.min(22, h + 4)).padStart(2, '0')}:00`
    onUpdate([...periods, { start: nextStart, end: nextEnd }])
  }

  return (
    <tr className="transition-colors hover:bg-surface-2/40">
      {/* Cột 1: Thứ & Trạng thái ngày (Cố định w-40) */}
      <td className="w-40 border-r border-line px-4 py-3 align-top">
        <div className="flex flex-col gap-1.5">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isWorking}
              onChange={(e) => handleToggle(e.target.checked)}
              className="h-4 w-4 rounded-control border-fg-3 text-accent-fg focus:ring-accent"
            />
            <span className="font-semibold text-fg">{dayLabel}</span>
          </label>
          <div>
            {isWorking ? (
              <span className="inline-flex items-center gap-1 rounded-control border border-ok/30 bg-ok-soft px-2 py-0.5 text-meta font-medium text-ok">
                {periods.length} ca làm
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-control border border-line bg-surface-3 px-2 py-0.5 text-meta font-medium text-fg-2">
                Nghỉ
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Cột 2: Các ca làm việc (Không bao giờ rớt dòng, không phình ngang) */}
      <td className="border-r border-line px-4 py-2.5 align-top">
        {!isWorking ? (
          <div className="flex items-center gap-3 py-1.5">
            <span className="text-meta italic text-fg-3">Nghỉ cả ngày</span>
            <Button size="sm" variant="soft" icon="add" onClick={() => handleToggle(true)}>
              Đặt ca (8h-12h, 13h-17h)
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-1">
            {periods.map((p, i) => (
              <div
                key={i}
                className="flex w-fit items-center gap-2 rounded-control border border-line bg-surface-2 px-2 py-1"
              >
                <span className="shrink-0 text-meta text-fg-2">Ca {i + 1}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="time"
                    step={1800}
                    value={p.start}
                    onChange={(e) => handlePeriodChange(i, { start: e.target.value })}
                    aria-label={`${dayLabel}, Ca ${i + 1}, giờ bắt đầu`}
                    className="tnum h-8 w-32 rounded-control border border-line-2 bg-canvas px-2 text-body text-fg"
                  />
                  <span className="text-fg-2">–</span>
                  <input
                    type="time"
                    step={1800}
                    value={p.end}
                    onChange={(e) => handlePeriodChange(i, { end: e.target.value })}
                    aria-label={`${dayLabel}, Ca ${i + 1}, giờ kết thúc`}
                    className="tnum h-8 w-32 rounded-control border border-line-2 bg-canvas px-2 text-body text-fg"
                  />
                </div>
                <IconButton
                  icon="delete"
                  variant="danger-quiet"
                  label={`Xóa ca ${p.start}-${p.end} của ${dayLabel}`}
                  tooltip="Xóa ca này"
                  onClick={() => handleRemovePeriod(i)}
                />
              </div>
            ))}
            <div>
              <Button size="sm" variant="soft" icon="add" onClick={handleAddPeriod}>
                + Thêm ca làm việc
              </Button>
            </div>
          </div>
        )}
      </td>

      {/* Cột 3: Tổng thời lượng ngày (Cố định w-24) */}
      <td className="w-24 border-r border-line px-3 py-3 text-center align-middle tnum">
        {isWorking ? (
          <span className="text-body font-semibold text-fg">{dayHours} giờ</span>
        ) : (
          <span className="text-fg-3">—</span>
        )}
      </td>

      {/* Cột 4: Thao tác nhanh (Cố định w-36, gọn gàng không dồn dập) */}
      <td className="w-36 px-3 py-3 text-right align-middle">
        {isWorking ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              icon="content_copy"
              className="text-meta px-2"
              title="Sao chép ca ngày này cho các ngày khác"
              onClick={onCopyAll}
            >
              Sao chép
            </Button>
            <IconButton
              icon="delete_sweep"
              variant="danger-quiet"
              label="Chuyển sang ngày nghỉ"
              tooltip="Đặt ngày này thành ngày nghỉ"
              onClick={() => handleToggle(false)}
            />
          </div>
        ) : (
          <div className="flex items-center justify-end">
            <Button size="sm" variant="ghost" icon="add" className="text-meta px-2" onClick={() => handleToggle(true)}>
              Bật ca
            </Button>
          </div>
        )}
      </td>
    </tr>
  )
}
