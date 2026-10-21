import { useState } from 'react'
import { useParams } from 'react-router'
import { EvidenceGroup } from '@/components/common/tech/EvidenceGallery'
import { ExecutionStepList } from '@/components/common/tech/ExecutionStepList'
import { JobHeaderCard } from '@/components/common/tech/JobHeaderCard'
import { SectionCard } from '@/components/common/tech/SectionCard'
import { StatTile } from '@/components/common/tech/StatTile'
import { YieldImpactChart } from '@/features/warranty/YieldImpactChart'
import { Icon, ProgressBar, Toast } from '@/components/common/stitch-ui'
import { cn } from '@/utils/cn'
import { getMaintenanceTask, protocolVerifiedLabel, type MaintenanceStep } from '@/data/maintenance'
import { notFound } from '@/routes/notFound'

/* Dựng từ maintenance_task/code.html + screen.png. Dữ liệu lấy từ data/maintenance.ts. */

const sensorToneClasses = { default: 'text-on-surface', secondary: 'text-secondary-container' } as const
const signOffToneClasses = { default: 'text-on-surface', primary: 'text-primary' } as const

export function MaintenanceTaskPage() {
  const { id } = useParams()
  const task = getMaintenanceTask(id)
  if (!task) notFound(`Không tìm thấy phiếu bảo trì ${id ?? ''}`)

  return <MaintenanceTaskView task={task} />
}

type Task = NonNullable<ReturnType<typeof getMaintenanceTask>>

function MaintenanceTaskView({ task }: { task: Task }) {
  const [checkedIds, setCheckedIds] = useState(
    task.protocol.steps.filter((step) => step.defaultChecked).map((step) => step.id),
  )
  const [readingsConfirmed, setReadingsConfirmed] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const toggleStep = (stepId: string, checked: boolean) =>
    setCheckedIds((current) => (checked ? [...current, stepId] : current.filter((value) => value !== stepId)))

  // Bước đang đo cũng tính vào tiến độ nên mở màn là 4/6
  const totalSteps = task.protocol.steps.length
  const doneSteps = task.protocol.steps.filter((step) => checkedIds.includes(step.id) || step.state === 'active').length
  const percent = totalSteps === 0 ? 0 : Math.round((doneSteps / totalSteps) * 100)

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2600)
  }

  const renderReadings = (step: MaintenanceStep) => {
    if (!step.readings) return null
    return (
      <div className="ml-9 flex flex-wrap items-center gap-space-md rounded-lg bg-surface-container-lowest p-space-sm">
        {step.readings.items.map((item) => (
          <div key={item.label} className="flex items-center gap-space-xs">
            <span className="text-label-sm text-on-surface-variant">{item.label}</span>
            <span
              className={cn('text-label-md font-bold', item.tone === 'primary' ? 'text-primary' : 'text-on-surface')}
            >
              {item.value}
            </span>
          </div>
        ))}
        <button
          type="button"
          disabled={readingsConfirmed}
          onClick={() => {
            setReadingsConfirmed(true)
            showToast(task.toasts.readingsConfirmed)
          }}
          className="ml-auto rounded bg-primary px-space-sm py-1 text-label-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-60"
        >
          {readingsConfirmed ? step.readings.confirmedLabel : step.readings.confirmLabel}
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-space-xl">
      {/* Banner ngữ cảnh work order */}
      <JobHeaderCard
        kindLabel={task.kindLabel}
        code={task.code}
        status={task.status}
        title={task.title}
        summary={task.summary}
        actions={task.headerActions.map((action) => ({
          ...action,
          onClick: () => showToast(action.tone === 'solid' ? task.toasts.completed : task.toasts.draftSaved),
        }))}
        meta={task.meta}
      />

      <div className="grid grid-cols-1 items-start gap-space-xl lg:grid-cols-12">
        {/* Cột trái: lịch sử bảo trì + checklist quy trình */}
        <div className="flex flex-col gap-space-xl lg:col-span-7">
          <SectionCard
            icon={task.history.icon}
            title={task.history.title}
            trailing={
              <span className="rounded-full bg-primary-fixed/40 px-space-sm py-0.5 text-label-sm font-semibold text-on-primary-fixed">
                {task.history.badge}
              </span>
            }
          >
            <div className="grid grid-cols-1 gap-space-sm md:grid-cols-3">
              {task.history.stats.map((stat) => (
                <StatTile key={stat.label} {...stat} className="p-space-md" />
              ))}
            </div>

            <div className="flex items-start gap-space-sm rounded-xl bg-surface-container-low p-space-md">
              <Icon name="info" className="mt-0.5 text-[22px] text-secondary" />
              <div className="flex flex-col">
                <span className="text-label-md font-bold text-on-surface">{task.history.note.title}</span>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">{task.history.note.quote}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={task.protocol.icon}
            title={task.protocol.title}
            subtitle={task.protocol.description}
            gap="lg"
            trailing={
              <span className="text-right text-label-sm font-bold text-primary">
                {protocolVerifiedLabel(doneSteps, totalSteps)} {task.protocol.verifiedSuffix}
              </span>
            }
          >
            <ProgressBar value={percent} tone="primary" size="sm" label={task.protocol.title} className="h-2" />

            <ExecutionStepList
              variant="protocol"
              steps={task.protocol.steps}
              checkedIds={checkedIds}
              onToggle={toggleStep}
              renderExtra={(step) => renderReadings(step as MaintenanceStep)}
            />
          </SectionCard>
        </div>

        {/* Cột phải: telemetry, ảnh hiện trường, kết luận ký nhận */}
        <div className="flex flex-col gap-space-xl lg:col-span-5">
          <SectionCard
            icon={task.telemetry.icon}
            title={task.telemetry.title}
            trailing={
              <span className="flex items-center gap-1.5 text-label-sm font-bold text-primary">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />
                {task.telemetry.liveLabel}
              </span>
            }
          >
            <div className="grid grid-cols-2 gap-space-sm">
              {task.telemetry.sensors.map((sensor) => (
                <div key={sensor.label} className="flex flex-col rounded-xl bg-surface-container-low p-space-md">
                  <span className="text-label-sm text-on-surface-variant">{sensor.label}</span>
                  <span className={cn('text-data-metric', sensorToneClasses[sensor.tone ?? 'default'])}>
                    {sensor.value}
                    <span className="text-headline-md font-normal text-on-surface"> {sensor.unit}</span>
                  </span>
                  <span className="text-body-sm text-on-surface-variant">{sensor.caption}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-space-xs rounded-xl bg-surface-container p-space-md">
              <div className="flex items-center justify-between gap-space-xs">
                <span className="text-label-md font-bold text-on-surface">{task.telemetry.yield.title}</span>
                <span className="rounded-md bg-primary-fixed/40 px-2 py-0.5 text-label-sm font-bold text-primary">
                  {task.telemetry.yield.badge}
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant">{task.telemetry.yield.description}</p>
              <YieldImpactChart {...task.telemetry.yield} />
            </div>
          </SectionCard>

          <SectionCard
            icon={task.photoLog.icon}
            title={task.photoLog.title}
            subtitle={task.photoLog.description}
            trailing={
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg bg-surface-container px-space-sm py-1 text-label-sm font-semibold text-on-surface transition-all hover:bg-surface-container-high"
              >
                <Icon name="add_a_photo" className="text-[16px]" />
                {task.photoLog.addLabel}
              </button>
            }
          >
            <EvidenceGroup
              hideTitle
              aspect="square"
              columns={3}
              title={task.photoLog.title}
              photos={task.photoLog.photos}
            />
          </SectionCard>

          <SectionCard icon={task.signOff.icon} title={task.signOff.title}>
            <div className="flex flex-col gap-space-xs rounded-xl bg-surface-container-low p-space-md">
              <div className="flex items-center justify-between gap-space-xs">
                <span className="text-label-sm text-on-surface-variant">{task.signOff.ratingLabel}</span>
                <span className="rounded-full bg-status-complete-bg px-2.5 py-0.5 text-label-sm font-bold text-status-complete">
                  {task.signOff.ratingBadge}
                </span>
              </div>
              <p className="mt-1 text-body-md font-semibold text-on-surface">{task.signOff.summary}</p>
            </div>

            <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">
              {task.signOff.cards.map((card) => (
                <div key={card.label} className="flex flex-col rounded-xl bg-surface-container p-space-sm">
                  <span className="text-label-sm text-on-surface-variant">{card.label}</span>
                  <span className={cn('mt-0.5 text-label-lg font-bold', signOffToneClasses[card.tone ?? 'default'])}>
                    {card.value}
                  </span>
                  <span className="text-body-sm text-on-surface-variant">{card.caption}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <Toast open={toast !== null} message={toast ?? ''} />
    </div>
  )
}
