import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { WEEK_DAYS } from '@/common/scheduling'
import { calculateDayHours, toWeek } from '@/features/scheduling/workingScheduleRules'
import type { WorkingScheduleView } from '@/types/res/adminTechniciansRes'

export function DefaultScheduleTimetable({ schedule }: { schedule: WorkingScheduleView }) {
  const week = toWeek(schedule.periods)
  const totalWeekHours = WEEK_DAYS.reduce((sum, d) => sum + calculateDayHours(week[d.value]), 0)
  const activeDaysCount = WEEK_DAYS.filter((d) => week[d.value].length > 0).length

  return (
    <div className="overflow-hidden rounded-container border border-line bg-canvas">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-4 py-2">
        <div>
          <h3 className="font-semibold text-fg">Giờ làm chung</h3>
        </div>
        <span className="tnum text-meta text-fg-2">Tổng {totalWeekHours} giờ / tuần</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-body">
          <thead>
            <tr className="border-b border-line-2 bg-surface-2/30 text-left text-meta font-semibold text-fg-2">
              <th className="w-40 border-r border-line px-4 py-2.5">Thứ trong tuần</th>
              <th className="border-r border-line px-4 py-2.5">Khung giờ làm việc (Các ca trong ngày)</th>
              <th className="w-24 border-r border-line px-3 py-2.5 text-center">Thời lượng</th>
              <th className="w-36 px-4 py-2.5 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {WEEK_DAYS.map((d) => {
              const periods = week[d.value]
              const hours = calculateDayHours(periods)
              const isWorking = periods.length > 0
              return (
                <tr key={d.value} className="transition-colors hover:bg-surface-2/50">
                  <td className="w-40 border-r border-line px-4 py-3 font-medium text-fg">
                    <div className="flex items-center gap-2">
                      <Icon name="calendar_today" className="text-accent-fg text-[16px]" />
                      <span className="font-semibold text-fg">{d.label}</span>
                    </div>
                  </td>
                  <td className="border-r border-line px-4 py-3">
                    {isWorking ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {periods.map((p, i) => (
                          <span
                            key={i}
                            className="tnum rounded-control border border-line bg-surface-2 px-2 py-0.5 text-meta text-fg"
                          >
                            <span>
                              {p.start}–{p.end}
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-meta text-fg-2">Nghỉ</span>
                    )}
                  </td>
                  <td className="w-24 border-r border-line px-3 py-3 text-center tnum">
                    {isWorking ? (
                      <span className="font-semibold text-fg">{hours} giờ</span>
                    ) : (
                      <span className="text-fg-3">—</span>
                    )}
                  </td>
                  <td className="w-36 px-4 py-3 text-center whitespace-nowrap">
                    {isWorking ? <Badge tone="ok">Làm việc</Badge> : <Badge tone="neutral">Nghỉ</Badge>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface-2/30 px-4 py-2.5 text-meta text-fg-3">
        <span>Tiêu chuẩn: {activeDaysCount} ngày làm việc mỗi tuần</span>
      </div>
    </div>
  )
}
