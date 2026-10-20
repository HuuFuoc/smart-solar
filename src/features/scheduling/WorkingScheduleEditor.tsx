import { useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, IconButton } from '@/components/common/ui/button'
import { Checkbox, Input } from '@/components/common/ui/field'
import { Segmented } from '@/components/common/ui/segmented'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { ConflictList } from '@/features/scheduling/components/ConflictList'
import { conflictsOf } from '@/features/scheduling/components/schedulingDisplay'
import { WEEK_DAYS } from '@/common/scheduling'
import { useSetWorkingScheduleMutation, useWorkingScheduleQuery } from '@/hooks/useTechnicianAdmin'
import { errorMessage } from '@/services/api/errors'
import type { WorkingPeriodView, WorkingScheduleView } from '@/types/res/adminTechniciansRes'

type Day = (typeof WEEK_DAYS)[number]['value']
type Period = { start: string; end: string }
type Week = Record<Day, Period[]>

const MAX_PERIODS = 42

function toWeek(periods: WorkingPeriodView[]): Week {
  const week = Object.fromEntries(WEEK_DAYS.map((d) => [d.value, [] as Period[]])) as Week
  for (const p of periods) if (p.day in week) week[p.day as Day].push({ start: p.start, end: p.end })
  return week
}

/* Luật bám SetWorkingScheduleCommandValidator: mỗi khoảng kết thúc sau khi bắt đầu, cùng ngày không chồng nhau, tối đa 42. */
function weekIssue(week: Week): string | null {
  const all = Object.values(week).flat()
  if (all.length === 0) return 'Cần ít nhất một khoảng làm việc trong tuần, hoặc chọn giờ chung của hệ thống.'
  if (all.length > MAX_PERIODS) return `Tối đa ${MAX_PERIODS} khoảng mỗi tuần.`
  for (const d of WEEK_DAYS) {
    const sorted = [...week[d.value]].sort((a, b) => a.start.localeCompare(b.start))
    for (const [i, p] of sorted.entries()) {
      if (!p.start || !p.end) return `${d.label}: nhập đủ giờ bắt đầu và kết thúc.`
      if (p.end <= p.start) return `${d.label}: giờ kết thúc phải sau giờ bắt đầu (${p.start}–${p.end}).`
      const prev = sorted[i - 1]
      if (prev && p.start < prev.end) return `${d.label}: hai khoảng ${prev.start}–${prev.end} và ${p.start}–${p.end} chồng nhau.`
    }
  }
  return null
}

function DefaultWeek({ schedule }: { schedule: WorkingScheduleView }) {
  const week = toWeek(schedule.periods)
  return (
    <dl className="grid gap-x-8 gap-y-2 text-body sm:grid-cols-[8rem_1fr]">
      {WEEK_DAYS.map((d) => (
        <div key={d.value} className="contents">
          <dt className="text-fg-2">{d.label}</dt>
          <dd className="tnum text-fg">{week[d.value].length ? week[d.value].map((p) => `${p.start}–${p.end}`).join(', ') : 'Nghỉ'}</dd>
        </div>
      ))}
    </dl>
  )
}

function WeekForm({ initial, technicianUserId, onSaved }: { initial: Week; technicianUserId: string; onSaved: () => void }) {
  const [week, setWeek] = useState<Week>(initial)
  const [issue, setIssue] = useState<string | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  const save = useSetWorkingScheduleMutation()

  const update = (day: Day, periods: Period[]) => {
    setWeek((w) => ({ ...w, [day]: periods }))
    setIssue(null)
    setFailure(null)
  }

  async function submit() {
    const found = weekIssue(week)
    if (found) return setIssue(found)
    try {
      await save.mutateAsync({
        id: technicianUserId,
        body: { useDefault: false, periods: WEEK_DAYS.flatMap((d) => week[d.value].map((p) => ({ day: d.value, start: p.start, end: p.end }))) },
      })
      toast.success('Đã lưu giờ làm riêng.')
      onSaved()
    } catch (error) {
      setFailure(error)
    }
  }

  const conflicts = conflictsOf(failure)
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line">
        {WEEK_DAYS.map((d) => {
          const periods = week[d.value]
          return (
            <li key={d.value} className="grid gap-3 py-3 first:pt-0 sm:grid-cols-[9rem_minmax(0,1fr)]">
              <Checkbox
                label={d.label}
                checked={periods.length > 0}
                onChange={(e) => update(d.value, e.target.checked ? [{ start: '08:00', end: '12:00' }] : [])}
              />
              {periods.length === 0 ? (
                <p className="text-body text-fg-3">Nghỉ</p>
              ) : (
                <div className="space-y-2">
                  {periods.map((p, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <label>
                        <span className="sr-only">
                          {d.label}, khoảng {i + 1}, bắt đầu
                        </span>
                        <Input
                          type="time"
                          step={1800}
                          className="w-32"
                          value={p.start}
                          onChange={(e) => update(d.value, periods.map((q, j) => (j === i ? { ...q, start: e.target.value } : q)))}
                        />
                      </label>
                      <span aria-hidden className="text-fg-3">
                        –
                      </span>
                      <label>
                        <span className="sr-only">
                          {d.label}, khoảng {i + 1}, kết thúc
                        </span>
                        <Input
                          type="time"
                          step={1800}
                          className="w-32"
                          value={p.end}
                          onChange={(e) => update(d.value, periods.map((q, j) => (j === i ? { ...q, end: e.target.value } : q)))}
                        />
                      </label>
                      <IconButton
                        icon="delete"
                        variant="danger-quiet"
                        label={`Bỏ khoảng ${p.start}–${p.end} của ${d.label}`}
                        tooltip="Bỏ khoảng này"
                        onClick={() => update(d.value, periods.filter((_, j) => j !== i))}
                      />
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="add"
                    onClick={() => update(d.value, [...periods, { start: periods.at(-1)?.end ?? '13:00', end: '17:00' }])}
                  >
                    Thêm khoảng
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <ConflictList conflicts={conflicts} />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" disabled={save.isPending} onClick={() => void submit()}>
          {save.isPending ? 'Đang lưu…' : 'Lưu giờ làm riêng'}
        </Button>
        {(issue || (failure !== null && conflicts.length === 0)) && (
          <span className="flex items-center gap-1.5 text-body font-medium text-danger" role="alert">
            <Icon name="error" className="shrink-0 text-[20px]" />
            {issue ?? errorMessage(failure)}
          </span>
        )}
      </div>
    </div>
  )
}

/*
  Giờ làm theo tuần của một kỹ thuật viên (giờ Việt Nam). Mặc định dùng giờ chung của hệ thống (08:00–12:00, 13:00–17:00
  mọi ngày); "Giờ riêng" thay cả tuần, ngày không có khoảng nào là ngày nghỉ. Đổi giờ làm mà làm lịch đã có rơi ra ngoài giờ
  thì backend từ chối và liệt kê lịch đó, không tự huỷ. Cần có hồ sơ nhận lịch trước (TECHNICIAN_PROFILE_REQUIRED).
*/
export function WorkingScheduleEditor({ technicianUserId }: { technicianUserId: string }) {
  const query = useWorkingScheduleQuery(technicianUserId)
  const save = useSetWorkingScheduleMutation()
  const [mode, setMode] = useState<'default' | 'custom' | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  const [formKey, setFormKey] = useState(0)

  if (query.isPending) return <Skeleton className="h-64" />
  if (query.isError) return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />

  const schedule = query.data
  const current = mode ?? (schedule.usesDefault ? 'default' : 'custom')

  async function switchToDefault() {
    setFailure(null)
    try {
      await save.mutateAsync({ id: technicianUserId, body: { useDefault: true, periods: [] } })
      toast.success('Đã chuyển về giờ chung của hệ thống.')
      setMode(null)
    } catch (error) {
      setFailure(error)
    }
  }

  const conflicts = conflictsOf(failure)
  return (
    <div className="max-w-3xl space-y-6">
      <Segmented
        label="Kiểu giờ làm"
        value={current}
        onChange={(next) => {
          setMode(next)
          setFailure(null)
          setFormKey((k) => k + 1)
        }}
        options={[
          { value: 'default', label: 'Giờ chung của hệ thống' },
          { value: 'custom', label: 'Giờ riêng' },
        ]}
        className="w-fit"
      />
      {current === 'default' ? (
        <div className="space-y-4">
          {/* Backend chỉ trả giờ chung khi người này đang dùng nó; đang dùng giờ riêng thì không biết giờ chung để vẽ. */}
          {schedule.usesDefault ? (
            <DefaultWeek schedule={schedule} />
          ) : (
            <p className="max-w-prose text-body text-fg-2">
              Người này đang dùng giờ riêng. Chuyển về giờ chung của hệ thống (mặc định 08:00–12:00 và 13:00–17:00 mọi ngày) thì giờ
              riêng bị xoá.
            </p>
          )}
          {!schedule.usesDefault && (
            <>
              <ConflictList conflicts={conflicts} />
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" disabled={save.isPending} onClick={() => void switchToDefault()}>
                  {save.isPending ? 'Đang lưu…' : 'Dùng giờ chung'}
                </Button>
                {failure !== null && conflicts.length === 0 && (
                  <span className="flex items-center gap-1.5 text-body font-medium text-danger" role="alert">
                    <Icon name="error" className="shrink-0 text-[20px]" />
                    {errorMessage(failure)}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        // Chuyển sang giờ riêng lần đầu: điền sẵn giờ chung để chỉ sửa chỗ khác.
        <WeekForm key={formKey} initial={toWeek(schedule.periods)} technicianUserId={technicianUserId} onSaved={() => setMode(null)} />
      )}
    </div>
  )
}
