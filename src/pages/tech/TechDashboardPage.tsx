import { useNavigate } from 'react-router'
import { CompletedTaskCard } from '@/features/dashboard/CompletedTaskCard'
import { ScheduleList } from '@/features/dashboard/ScheduleList'
import { SectionHeading } from '@/features/dashboard/SectionHeading'
import { StatRibbon } from '@/features/dashboard/StatRibbon'
import { TaskCard } from '@/components/common/stitch-ui'
import { techTaskPath } from '@/routes/paths'
import {
  completedHeading,
  dailyStats,
  dispatchRibbon,
  recentlyCompleted,
  todayAssignments,
  todayHeading,
  upcomingHeading,
  upcomingSchedule,
} from '@/data/techDashboard'

/* Dựng từ technician_dashboard_1/code.html + screen.png. */
export function TechDashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="flex w-full flex-col gap-space-xl">
      {/* Dải số liệu trong ngày + trạng thái điều phối */}
      <StatRibbon stats={dailyStats} {...dispatchRibbon} />

      {/* Today's Assignments */}
      <section className="flex flex-col gap-space-md">
        <SectionHeading {...todayHeading} metaUppercase />
        <div className="grid grid-cols-1 gap-space-lg lg:grid-cols-2">
          {todayAssignments.map((task) => (
            <TaskCard
              key={task.id}
              accent={task.accent}
              type={task.type}
              priority={task.priority}
              meta={task.meta}
              title={task.title}
              address={task.address}
              phoneHref={task.phoneHref}
              specs={task.specs}
              primaryAction={{ ...task.primaryAction, onClick: () => navigate(techTaskPath(task.id)) }}
              secondaryAction={task.mapAction}
            />
          ))}
        </div>
      </section>

      {/* Upcoming Schedule + Recently Completed */}
      <div className="grid grid-cols-1 gap-space-lg xl:grid-cols-12">
        <section className="flex flex-col gap-space-md xl:col-span-7">
          <SectionHeading {...upcomingHeading} metaTone="muted" />
          <ScheduleList days={upcomingSchedule} />
        </section>

        <section className="flex flex-col gap-space-md xl:col-span-5">
          <SectionHeading {...completedHeading} />
          <div className="flex flex-col gap-space-sm">
            {recentlyCompleted.map((task) => (
              <CompletedTaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
