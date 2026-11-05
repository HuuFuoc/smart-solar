import { useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { ConflictList } from '@/features/scheduling/ConflictList'
import { conflictsOf } from '@/features/scheduling/schedulingDisplay'
import { WEEK_DAYS } from '@/common/scheduling'
import { CustomTimetableDayRow } from '@/features/scheduling/CustomTimetableDayRow'
import {
  calculateDayHours,
  STANDARD_DAY_PERIODS,
  weekIssue,
  type Day,
  type Period,
  type Week,
} from '@/features/scheduling/workingScheduleRules'
import { useSetWorkingScheduleMutation } from '@/hooks/useTechnicianAdmin'
import { errorMessage } from '@/services/api/errors'

interface CustomScheduleTimetableProps {
  initial: Week
  technicianUserId: string
  onSaved: () => void
}

export function CustomScheduleTimetable({
  initial,
  technicianUserId,
  onSaved,
}: CustomScheduleTimetableProps) {
  const [week, setWeek] = useState<Week>(initial)
  const [issue, setIssue] = useState<string | null>(null)
  const [failure, setFailure] = useState<unknown>(null)
  const save = useSetWorkingScheduleMutation()

  const update = (day: Day, periods: Period[]) => {
    setWeek((w) => ({ ...w, [day]: periods }))
    setIssue(null)
    setFailure(null)
  }

  const applyStandardWeek = () => {
    setWeek({
      MONDAY: [...STANDARD_DAY_PERIODS],
      TUESDAY: [...STANDARD_DAY_PERIODS],
      WEDNESDAY: [...STANDARD_DAY_PERIODS],
      THURSDAY: [...STANDARD_DAY_PERIODS],
      FRIDAY: [...STANDARD_DAY_PERIODS],
      SATURDAY: [],
      SUNDAY: [],
    })
    setIssue(null)
    toast.success('Đã áp dụng giờ chuẩn hành chính (T2 đến T6: 8h-12h, 13h-17h; T7-CN nghỉ).')
  }

  const applyFullWeek = () => {
    setWeek({
      MONDAY: [...STANDARD_DAY_PERIODS],
      TUESDAY: [...STANDARD_DAY_PERIODS],
      WEDNESDAY: [...STANDARD_DAY_PERIODS],
      THURSDAY: [...STANDARD_DAY_PERIODS],
      FRIDAY: [...STANDARD_DAY_PERIODS],
      SATURDAY: [...STANDARD_DAY_PERIODS],
      SUNDAY: [...STANDARD_DAY_PERIODS],
    })
    setIssue(null)
    toast.success('Đã áp dụng lịch làm việc cho tất cả 7 ngày trong tuần.')
  }

  const setWeekendOff = () => {
    setWeek((w) => ({ ...w, SATURDAY: [], SUNDAY: [] }))
    setIssue(null)
    toast.success('Đã chuyển Thứ Bảy và Chủ Nhật sang ngày nghỉ.')
  }

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
      {/* Thanh công cụ mẫu lịch nhanh */}
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

      {/* Bảng Thời khóa biểu tuần cố định cột */}
      <div className="overflow-x-auto rounded-container border border-line bg-surface-1 shadow-sm">
        <table className="w-full table-fixed border-collapse text-body">
          <thead>
            <tr className="border-b border-line-2 bg-surface-2/40 text-left text-meta font-semibold text-fg-2">
              <th className="w-44 border-r border-line px-4 py-3">Thứ trong tuần</th>
              <th className="border-r border-line px-4 py-3">Thời khóa biểu các ca làm việc</th>
              <th className="w-28 border-r border-line px-3 py-3 text-center">Thời lượng</th>
              <th className="w-44 px-4 py-3 text-right">Thao tác nhanh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {WEEK_DAYS.map((d) => (
              <CustomTimetableDayRow
                key={d.value}
                dayLabel={d.label}
                periods={week[d.value]}
                onUpdate={(periods) => update(d.value, periods)}
                onCopyAll={() => copyDayToAll(d.value)}
              />
            ))}
          </tbody>
        </table>

        {/* Footer lưu cấu hình */}
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
