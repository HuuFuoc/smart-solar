import { useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, IconButton } from '@/components/common/ui/button'
import { Segmented } from '@/components/common/ui/segmented'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { ConflictList } from '@/features/scheduling/ConflictList'
import { conflictsOf } from '@/features/scheduling/schedulingDisplay'
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

function calculateDayHours(periods: Period[]): number {
  let totalMinutes = 0
  for (const p of periods) {
    if (!p.start || !p.end) continue
    const parts1 = p.start.split(':').map(Number)
    const parts2 = p.end.split(':').map(Number)
    const h1 = parts1[0] ?? 0
    const m1 = parts1[1] ?? 0
    const h2 = parts2[0] ?? 0
    const m2 = parts2[1] ?? 0
    if (h2 * 60 + m2 > h1 * 60 + m1) {
      totalMinutes += h2 * 60 + m2 - (h1 * 60 + m1)
    }
  }
  return Math.round((totalMinutes / 60) * 10) / 10
}

// Mỗi khoảng kết thúc sau khi bắt đầu, cùng ngày không chồng nhau, tối đa 42
function weekIssue(week: Week): string | null {
  const all = Object.values(week).flat()
  if (all.length === 0) return 'Cần ít nhất một khoảng làm việc trong tuần, hoặc chọn giờ chung của hệ thống.'
  if (all.length > MAX_PERIODS) return `Tối đa ${MAX_PERIODS} khoảng mỗi tuần.`
  for (const d of WEEK_DAYS) {
    const sorted = [...week[d.value]].sort((a, b) => a.start.localeCompare(b.start))
    for (const [i, p] of sorted.entries()) {
      if (!p.start || !p.end) return `${d.label}: nhập đủ giờ bắt đầu và kết thúc.`
      if (p.end <= p.start) return `${d.label}: giờ kết thúc phải sau giờ bắt đầu (${p.start}-${p.end}).`
      const prev = sorted[i - 1]
      if (prev && p.start < prev.end)
        return `${d.label}: hai khoảng ${prev.start}-${prev.end} và ${p.start}-${p.end} chồng nhau.`
    }
  }
  return null
}

/** Bảng thời khóa biểu giờ chung của hệ thống */
function DefaultWeek({ schedule }: { schedule: WorkingScheduleView }) {
  const week = toWeek(schedule.periods)
  const totalWeekHours = WEEK_DAYS.reduce((sum, d) => sum + calculateDayHours(week[d.value]), 0)
  const activeDaysCount = WEEK_DAYS.filter((d) => week[d.value].length > 0).length

  return (
    <div className="overflow-hidden rounded-container border border-line bg-surface-1 shadow-sm">
      <div className="border-b border-line bg-surface-2/40 px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-fg">Thời khóa biểu giờ chuẩn của hệ thống</h3>
          <p className="text-meta text-fg-2">Lịch làm việc mặc định được áp dụng cho toàn bộ đội ngũ kỹ thuật viên.</p>
        </div>
        <span className="rounded-full border border-line bg-surface-1 px-3 py-1 text-meta font-semibold text-fg">
          Tổng thời lượng: <strong className="text-accent">{totalWeekHours} giờ</strong> / tuần
        </span>
      </div>

      <Table stack>
        <thead>
          <tr>
            <Th className="border-r border-line w-44">Thứ trong tuần</Th>
            <Th className="border-r border-line">Khung giờ làm việc (Các ca trong ngày)</Th>
            <Th className="border-r border-line text-center w-36">Thời lượng</Th>
            <Th className="text-center w-36">Trạng thái</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {WEEK_DAYS.map((d) => {
            const periods = week[d.value]
            const hours = calculateDayHours(periods)
            const isWorking = periods.length > 0
            return (
              <Tr key={d.value} className="hover:bg-surface-2/50 transition-colors">
                <Td label="Thứ" className="border-r border-line font-medium text-fg">
                  <div className="flex items-center gap-2">
                    <Icon name="calendar_today" className="text-accent text-[16px]" />
                    <span className="font-semibold text-fg">{d.label}</span>
                  </div>
                </Td>
                <Td label="Khung giờ" className="border-r border-line">
                  {isWorking ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {periods.map((p, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-3 py-1 text-meta font-medium font-mono text-fg shadow-2xs"
                        >
                          <Icon name="schedule" className="text-accent text-[15px]" />
                          <span>
                            {p.start} — {p.end}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-meta italic text-fg-3">Nghỉ làm việc</span>
                  )}
                </Td>
                <Td label="Thời lượng" className="border-r border-line text-center tnum">
                  {isWorking ? (
                    <span className="font-semibold text-fg">{hours} giờ</span>
                  ) : (
                    <span className="text-fg-3">—</span>
                  )}
                </Td>
                <Td label="Trạng thái" className="text-center whitespace-nowrap">
                  {isWorking ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-meta font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Làm việc
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 border border-slate-500/30 px-2.5 py-0.5 text-meta font-medium text-slate-500 dark:text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      Nghỉ
                    </span>
                  )}
                </Td>
              </Tr>
            )
          })}
        </tbody>
      </Table>
      <div className="border-t border-line bg-surface-2/30 px-4 py-2.5 text-meta text-fg-3 flex items-center justify-between">
        <span>Tiêu chuẩn: {activeDaysCount} ngày làm việc mỗi tuần</span>
        <span className="tnum">SmartSolar System Timetable</span>
      </div>
    </div>
  )
}

/** Form thiết kế Thời khóa biểu tương tác cho Giờ làm riêng */
function WeekForm({
  initial,
  technicianUserId,
  onSaved,
}: {
  initial: Week
  technicianUserId: string
  onSaved: () => void
}) {
  const [week, setWeek] = useState<Week>(initial)
  const [issue, setIssue] = useState<string | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  const save = useSetWorkingScheduleMutation()

  const update = (day: Day, periods: Period[]) => {
    setWeek((w) => ({ ...w, [day]: periods }))
    setIssue(null)
    setFailure(null)
  }

  // Tiện ích: Áp dụng giờ hành chính chuẩn (T2-T6: 08:00-12:00 & 13:00-17:00, T7 & CN: Nghỉ)
  const applyStandardWeek = () => {
    const standardPeriods: Period[] = [
      { start: '08:00', end: '12:00' },
      { start: '13:00', end: '17:00' },
    ]
    setWeek({
      MONDAY: [...standardPeriods],
      TUESDAY: [...standardPeriods],
      WEDNESDAY: [...standardPeriods],
      THURSDAY: [...standardPeriods],
      FRIDAY: [...standardPeriods],
      SATURDAY: [],
      SUNDAY: [],
    })
    setIssue(null)
    toast.success('Đã áp dụng giờ chuẩn hành chính (T2 đến T6: 8h-12h, 13h-17h; T7-CN nghỉ).')
  }

  // Tiện ích: Đặt cả tuần (7 ngày) làm việc
  const applyFullWeek = () => {
    const standardPeriods: Period[] = [
      { start: '08:00', end: '12:00' },
      { start: '13:00', end: '17:00' },
    ]
    setWeek({
      MONDAY: [...standardPeriods],
      TUESDAY: [...standardPeriods],
      WEDNESDAY: [...standardPeriods],
      THURSDAY: [...standardPeriods],
      FRIDAY: [...standardPeriods],
      SATURDAY: [...standardPeriods],
      SUNDAY: [...standardPeriods],
    })
    setIssue(null)
    toast.success('Đã áp dụng lịch làm việc cho tất cả 7 ngày trong tuần.')
  }

  // Tiện ích: Nghỉ Thứ Bảy & Chủ Nhật
  const setWeekendOff = () => {
    setWeek((w) => ({ ...w, SATURDAY: [], SUNDAY: [] }))
    setIssue(null)
    toast.success('Đã chuyển Thứ Bảy và Chủ Nhật sang ngày nghỉ.')
  }

  // Tiện ích: Xóa tất cả ca
  const clearAllDays = () => {
    setWeek({
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
      SUNDAY: [],
    })
    setIssue(null)
  }

  // Sao chép khung giờ của 1 ngày sang các ngày khác
  const copyDayToAll = (sourceDay: Day) => {
    const periodsToCopy = week[sourceDay]
    if (periodsToCopy.length === 0) {
      toast.error('Ngày này chưa có ca làm việc nào để sao chép.')
      return
    }
    const updated = {} as Week
    for (const d of WEEK_DAYS) {
      updated[d.value] = periodsToCopy.map((p) => ({ ...p }))
    }
    setWeek(updated)
    toast.success(`Đã sao chép ca làm việc của ${WEEK_DAYS.find((d) => d.value === sourceDay)?.label} cho toàn bộ tuần.`)
  }

  async function submit() {
    const found = weekIssue(week)
    if (found) return setIssue(found)
    try {
      await save.mutateAsync({
        id: technicianUserId,
        body: {
          useDefault: false,
          periods: WEEK_DAYS.flatMap((d) => week[d.value].map((p) => ({ day: d.value, start: p.start, end: p.end }))),
        },
      })
      toast.success('Đã lưu giờ làm việc riêng.')
      onSaved()
    } catch (error) {
      setFailure(error)
    }
  }

  const conflicts = conflictsOf(failure)
  const totalWeekHours = WEEK_DAYS.reduce((sum, d) => sum + calculateDayHours(week[d.value]), 0)
  const activeDaysCount = WEEK_DAYS.filter((d) => week[d.value].length > 0).length

  return (
    <div className="space-y-4">
      {/* Thanh công cụ thao tác nhanh cho thời khóa biểu */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-container border border-line bg-surface-1 p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-meta font-medium text-fg-2">Mẫu lịch nhanh:</span>
          <Button size="sm" variant="soft" type="button" icon="work" onClick={applyStandardWeek}>
            Giờ hành chính (T2-T6)
          </Button>
          <Button size="sm" variant="soft" type="button" icon="calendar_view_week" onClick={applyFullWeek}>
            Cả 7 ngày
          </Button>
          <Button size="sm" variant="ghost" type="button" icon="weekend" onClick={setWeekendOff}>
            Nghỉ T7 & CN
          </Button>
          <Button size="sm" variant="ghost" type="button" icon="clear_all" onClick={clearAllDays}>
            Xóa ca
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-line bg-surface-2 px-3 py-1 text-meta font-semibold text-fg">
            Tổng: <strong className="text-accent">{totalWeekHours} giờ</strong> ({activeDaysCount} ngày làm việc)
          </span>
        </div>
      </div>

      {/* Bảng Thời khóa biểu tuần tương tác */}
      <div className="overflow-hidden rounded-container border border-line bg-surface-1 shadow-sm">
        <Table stack>
          <thead>
            <tr>
              <Th className="border-r border-line w-44">Thứ trong tuần</Th>
              <Th className="border-r border-line">Thời khóa biểu các ca làm việc</Th>
              <Th className="border-r border-line text-center w-32">Thời lượng</Th>
              <Th className="text-right w-44">Thao tác nhanh</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {WEEK_DAYS.map((d) => {
              const periods = week[d.value]
              const isWorking = periods.length > 0
              const dayHours = calculateDayHours(periods)

              return (
                <Tr key={d.value} className="hover:bg-surface-2/40 transition-colors">
                  {/* Cột 1: Ngày trong tuần + Switch/Checkbox bật làm việc */}
                  <Td label="Thứ" className="border-r border-line align-top">
                    <div className="flex flex-col gap-1.5">
                      <label className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isWorking}
                          onChange={(e) =>
                            update(
                              d.value,
                              e.target.checked
                                ? [
                                    { start: '08:00', end: '12:00' },
                                    { start: '13:00', end: '17:00' },
                                  ]
                                : [],
                            )
                          }
                          className="h-4 w-4 rounded border-fg-3 text-accent focus:ring-accent"
                        />
                        <span className="font-semibold text-fg">{d.label}</span>
                      </label>
                      <div>
                        {isWorking ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-micro font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
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

                  {/* Cột 2: Các ca làm việc (Time slots) */}
                  <Td label="Ca làm việc" className="border-r border-line">
                    {!isWorking ? (
                      <div className="flex items-center gap-3 py-1">
                        <span className="text-meta italic text-fg-3">Nghỉ cả ngày</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="add"
                          onClick={() =>
                            update(d.value, [
                              { start: '08:00', end: '12:00' },
                              { start: '13:00', end: '17:00' },
                            ])
                          }
                        >
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
                                onChange={(e) =>
                                  update(
                                    d.value,
                                    periods.map((item, j) => (j === i ? { ...item, start: e.target.value } : item)),
                                  )
                                }
                                aria-label={`${d.label}, Ca ${i + 1}, giờ bắt đầu`}
                                className="h-7 w-24 rounded border border-line bg-surface-1 px-1.5 text-meta font-mono font-medium text-fg outline-none focus:border-accent"
                              />
                              <span className="text-fg-3 text-meta">→</span>
                              <input
                                type="time"
                                step={1800}
                                value={p.end}
                                onChange={(e) =>
                                  update(
                                    d.value,
                                    periods.map((item, j) => (j === i ? { ...item, end: e.target.value } : item)),
                                  )
                                }
                                aria-label={`${d.label}, Ca ${i + 1}, giờ kết thúc`}
                                className="h-7 w-24 rounded border border-line bg-surface-1 px-1.5 text-meta font-mono font-medium text-fg outline-none focus:border-accent"
                              />
                            </div>
                            <IconButton
                              icon="delete"
                              variant="danger-quiet"
                              label={`Xóa ca ${p.start}-${p.end} của ${d.label}`}
                              tooltip="Xóa ca này"
                              onClick={() =>
                                update(
                                  d.value,
                                  periods.filter((_, j) => j !== i),
                                )
                              }
                            />
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="soft"
                          icon="add"
                          onClick={() => {
                            const lastEnd = periods.at(-1)?.end ?? '12:00'
                            const nextStart = lastEnd < '13:00' ? '13:00' : lastEnd
                            const h = Number(nextStart.split(':')[0] ?? 13)
                            const nextEnd = `${String(Math.min(22, h + 4)).padStart(2, '0')}:00`
                            update(d.value, [...periods, { start: nextStart, end: nextEnd }])
                          }}
                        >
                          Thêm ca
                        </Button>
                      </div>
                    )}
                  </Td>

                  {/* Cột 3: Tổng thời lượng ngày */}
                  <Td label="Thời lượng" className="border-r border-line text-center tnum whitespace-nowrap">
                    {isWorking ? (
                      <span className="font-semibold text-fg text-body">{dayHours} giờ</span>
                    ) : (
                      <span className="text-fg-3">—</span>
                    )}
                  </Td>

                  {/* Cột 4: Thao tác sao chép / nhanh */}
                  <Td label="Thao tác" className="text-right whitespace-nowrap">
                    {isWorking && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="content_copy"
                          title="Sao chép ca ngày này cho các ngày khác"
                          onClick={() => copyDayToAll(d.value)}
                        >
                          Sao chép tuần
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="delete_sweep"
                          title="Đặt ngày này thành ngày nghỉ"
                          onClick={() => update(d.value, [])}
                        >
                          Nghỉ
                        </Button>
                      </div>
                    )}
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>

        {/* Footer bảng thời khóa biểu */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button icon="save" variant="primary" disabled={save.isPending} onClick={() => void submit()}>
              {save.isPending ? 'Đang lưu…' : 'Lưu thời khóa biểu riêng'}
            </Button>
            {(issue || (failure !== null && conflicts.length === 0)) && (
              <span className="flex items-center gap-1.5 text-meta font-medium text-danger" role="alert">
                <Icon name="error" className="shrink-0 text-[18px]" />
                {issue ?? errorMessage(failure)}
              </span>
            )}
          </div>
          <span className="text-meta text-fg-3">
            Lịch làm việc riêng có hiệu lực ngay sau khi lưu thành công
          </span>
        </div>
      </div>

      <ConflictList conflicts={conflicts} />
    </div>
  )
}

// Giờ làm theo tuần (giờ Việt Nam). Mặc định dùng giờ chung, "Giờ riêng" thay cả tuần
// Cần có hồ sơ nhận lịch trước (TECHNICIAN_PROFILE_REQUIRED)
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
            { value: 'custom', label: 'Giờ riêng (Thời khóa biểu)' },
          ]}
          className="w-fit"
        />
        {current === 'default' && !schedule.usesDefault && (
          <Button
            icon="restart_alt"
            variant="primary"
            size="sm"
            disabled={save.isPending}
            onClick={() => void switchToDefault()}
          >
            {save.isPending ? 'Đang lưu…' : 'Xác nhận dùng giờ chung'}
          </Button>
        )}
      </div>

      {current === 'default' ? (
        <div className="space-y-4">
          {schedule.usesDefault ? (
            <DefaultWeek schedule={schedule} />
          ) : (
            <div className="rounded-container border border-line bg-surface-1 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Icon name="info" className="text-accent text-[20px] mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-fg">Đang áp dụng giờ riêng</h4>
                  <p className="mt-1 text-meta text-fg-2">
                    Kỹ thuật viên này hiện đang sử dụng lịch làm việc riêng. Khi chuyển về giờ chung của hệ thống (mặc định 08:00-12:00 và 13:00-17:00 mỗi ngày), cấu hình giờ riêng sẽ được đặt lại.
                  </p>
                  <div className="mt-4">
                    <Button
                      icon="restart_alt"
                      variant="primary"
                      disabled={save.isPending}
                      onClick={() => void switchToDefault()}
                    >
                      {save.isPending ? 'Đang lưu…' : 'Chuyển về giờ chung'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <ConflictList conflicts={conflicts} />
        </div>
      ) : (
        <WeekForm
          key={formKey}
          initial={toWeek(schedule.periods)}
          technicianUserId={technicianUserId}
          onSaved={() => setMode(null)}
        />
      )}
    </div>
  )
}
