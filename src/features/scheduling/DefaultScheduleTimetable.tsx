import { Icon } from '@/components/common/stitch-ui/Icon'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { WEEK_DAYS } from '@/common/scheduling'
import { calculateDayHours, toWeek } from '@/features/scheduling/workingScheduleRules'
import type { WorkingScheduleView } from '@/types/res/adminTechniciansRes'

export function DefaultScheduleTimetable({ schedule }: { schedule: WorkingScheduleView }) {
  const week = toWeek(schedule.periods)
  const totalWeekHours = WEEK_DAYS.reduce((sum, d) => sum + calculateDayHours(week[d.value]), 0)
  const activeDaysCount = WEEK_DAYS.filter((d) => week[d.value].length > 0).length

  return (
    <div className="overflow-hidden rounded-container border border-line bg-surface-1 shadow-sm">
      <div className="flex items-center justify-between border-b border-line bg-surface-2/40 px-4 py-3">
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
            <Th className="w-44 border-r border-line">Thứ trong tuần</Th>
            <Th className="border-r border-line">Khung giờ làm việc (Các ca trong ngày)</Th>
            <Th className="w-36 border-r border-line text-center">Thời lượng</Th>
            <Th className="w-36 text-center">Trạng thái</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {WEEK_DAYS.map((d) => {
            const periods = week[d.value]
            const hours = calculateDayHours(periods)
            const isWorking = periods.length > 0
            return (
              <Tr key={d.value} className="transition-colors hover:bg-surface-2/50">
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
                          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-3 py-1 font-mono text-meta font-medium text-fg shadow-2xs"
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
                  {isWorking ? <span className="font-semibold text-fg">{hours} giờ</span> : <span className="text-fg-3">—</span>}
                </Td>
                <Td label="Trạng thái" className="whitespace-nowrap text-center">
                  {isWorking ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-meta font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Làm việc
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/30 bg-slate-500/15 px-2.5 py-0.5 text-meta font-medium text-slate-500 dark:text-slate-400">
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
      <div className="flex items-center justify-between border-t border-line bg-surface-2/30 px-4 py-2.5 text-meta text-fg-3">
        <span>Tiêu chuẩn: {activeDaysCount} ngày làm việc mỗi tuần</span>
        <span className="tnum">SmartSolar System Timetable</span>
      </div>
    </div>
  )
}

