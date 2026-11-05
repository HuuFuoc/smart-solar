import { Button, IconButton } from '@/components/common/ui/button'
import { Td, Tr } from '@/components/common/ui/table'
import { calculateDayHours, type Period } from '@/features/scheduling/workingScheduleRules'

interface CustomTimetableDayRowProps {
  dayLabel: string
  periods: Period[]
  onUpdate: (periods: Period[]) => void
  onCopyAll: () => void
}

export function CustomTimetableDayRow({
  dayLabel,
  periods,
  onUpdate,
  onCopyAll,
}: CustomTimetableDayRowProps) {
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
    <Tr className="transition-colors hover:bg-surface-2/40">
      <Td label="Thứ" className="align-top border-r border-line">
        <div className="flex flex-col gap-1.5">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={isWorking}
              onChange={(e) => handleToggle(e.target.checked)}
              className="h-4 w-4 rounded border-fg-3 text-accent focus:ring-accent"
            />
            <span className="font-semibold text-fg">{dayLabel}</span>
          </label>
          <div>
            {isWorking ? (
              <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-micro font-medium text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {periods.length} ca làm
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-slate-500/15 px-2 py-0.5 text-micro font-medium text-slate-500 dark:text-slate-400">
                Nghỉ
              </span>
            )}
          </div>
        </div>
      </Td>

      <Td label="Ca làm việc" className="border-r border-line">
        {!isWorking ? (
          <div className="flex items-center gap-3 py-1">
            <span className="text-meta italic text-fg-3">Nghỉ cả ngày</span>
            <Button size="sm" variant="ghost" icon="add" onClick={() => handleToggle(true)}>
              + Đặt ca (8h-12h, 13h-17h)
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5 py-1">
            {periods.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2/60 px-2.5 py-1.5 shadow-2xs transition-colors hover:border-fg-3/40"
              >
                <span className="rounded bg-surface-1 px-1.5 py-0.5 text-micro font-semibold text-fg-2">
                  Ca {i + 1}
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    step={1800}
                    value={p.start}
                    onChange={(e) => handlePeriodChange(i, { start: e.target.value })}
                    aria-label={`${dayLabel}, Ca ${i + 1}, giờ bắt đầu`}
                    className="h-7 w-24 rounded border border-line bg-surface-1 px-1.5 font-mono text-meta font-medium text-fg outline-none focus:border-accent"
                  />
                  <span className="text-meta text-fg-3">→</span>
                  <input
                    type="time"
                    step={1800}
                    value={p.end}
                    onChange={(e) => handlePeriodChange(i, { end: e.target.value })}
                    aria-label={`${dayLabel}, Ca ${i + 1}, giờ kết thúc`}
                    className="h-7 w-24 rounded border border-line bg-surface-1 px-1.5 font-mono text-meta font-medium text-fg outline-none focus:border-accent"
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
            <Button size="sm" variant="soft" icon="add" onClick={handleAddPeriod}>
              Thêm ca
            </Button>
          </div>
        )}
      </Td>

      <Td label="Thời lượng" className="whitespace-nowrap border-r border-line text-center tnum">
        {isWorking ? <span className="text-body font-semibold text-fg">{dayHours} giờ</span> : <span className="text-fg-3">—</span>}
      </Td>

      <Td label="Thao tác" className="whitespace-nowrap text-right">
        {isWorking && (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              icon="content_copy"
              title="Sao chép ca ngày này cho các ngày khác"
              onClick={onCopyAll}
            >
              Sao chép tuần
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon="delete_sweep"
              title="Đặt ngày này thành ngày nghỉ"
              onClick={() => onUpdate([])}
            >
              Nghỉ
            </Button>
          </div>
        )}
      </Td>
    </Tr>
  )
}
