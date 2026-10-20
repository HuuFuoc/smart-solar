import { useState } from 'react'
import { useParams } from 'react-router'
import { ActionDock } from '@/components/common/tech/ActionDock'
import { ContactTile } from '@/features/installations/ContactTile'
import { EvidenceGroup } from '@/components/common/tech/EvidenceGallery'
import { ExecutionStepList } from '@/components/common/tech/ExecutionStepList'
import { JobHeaderCard } from '@/components/common/tech/JobHeaderCard'
import { PanelArrayGrid } from '@/features/installations/PanelArrayGrid'
import { SectionCard } from '@/components/common/tech/SectionCard'
import { StepperInput } from '@/components/common/tech/StepperInput'
import { Button, Icon, StatusBadge } from '@/components/common/stitch-ui'
import { cn } from '@/utils/cn'
import { executionCounterLabel, getInstallationTask, type InstallationStep } from '@/data/installations'
import { notFound } from '@/routes/notFound'

/* Dựng từ installation_task/code.html + screen.png. Mọi dữ liệu lấy từ data/installations.ts. */

type SyncState = 'idle' | 'syncing' | 'synced'

const syncIcon: Record<SyncState, string> = { idle: 'sync', syncing: 'refresh', synced: 'check' }

export function InstallationTaskPage() {
  const { id } = useParams()
  const task = getInstallationTask(id)
  if (!task) notFound(`Không tìm thấy công trình lắp đặt ${id ?? ''}`)

  return <InstallationTaskView task={task} />
}

function InstallationTaskView({ task }: { task: NonNullable<ReturnType<typeof getInstallationTask>> }) {
  const activeStep = task.execution.steps.find((step) => step.counter)
  const [checkedIds, setCheckedIds] = useState(
    task.execution.steps.filter((step) => step.defaultChecked).map((step) => step.id),
  )
  const [mountedPanels, setMountedPanels] = useState(activeStep?.counter?.initial ?? 0)
  const [notes, setNotes] = useState(task.fieldLog.notes)
  const [sync, setSync] = useState<SyncState>('idle')

  const toggleStep = (stepId: string, checked: boolean) =>
    setCheckedIds((current) =>
      checked ? [...current, stepId] : current.filter((value) => value !== stepId),
    )

  /*
   * Mốc mở màn lấy nguyên 65% của thiết kế. Khi kỹ thuật viên chỉnh bộ đếm panel thì tính lại
   * theo công thức trong code.html: 2 bước nền = 33%, bước "Racking & Panels" thêm tối đa 32%.
   */
  const initialPanels = activeStep?.counter?.initial ?? 0
  const totalPanels = activeStep?.counter?.total ?? 1
  const livePercent =
    mountedPanels === initialPanels
      ? task.progress.percent
      : Math.round(33 + (mountedPanels / totalPanels) * 32)

  const syncLabel =
    sync === 'syncing' ? task.footer.syncingLabel : sync === 'synced' ? task.footer.syncedLabel : task.footer.syncLabel

  const runSync = () => {
    setSync('syncing')
    window.setTimeout(() => {
      setSync('synced')
      window.setTimeout(() => setSync('idle'), 2000)
    }, 800)
  }

  const renderStepExtra = (step: InstallationStep) => {
    if (!step.counter) return null
    return (
      <div className="mt-space-sm flex flex-wrap items-center gap-space-md rounded-lg bg-surface-container-low p-space-sm pt-space-xs">
        <span className="text-label-sm font-semibold text-on-surface">{step.counter.label}</span>
        <StepperInput
          size="sm"
          value={mountedPanels}
          onChange={setMountedPanels}
          min={0}
          max={step.counter.total}
          precision={0}
          label="Số tấm pin đã lắp"
        />
        <span className="text-body-sm text-on-surface-variant">{step.counter.unitLabel}</span>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-space-xl">
      {/* Top command context bar */}
      <JobHeaderCard
        kindLabel={task.kindLabel}
        code={task.code}
        status={task.stage}
        summary={task.summary}
        actions={task.headerActions}
        meta={task.meta}
        progress={{ ...task.progress, percent: livePercent }}
      />

      <div className="grid grid-cols-1 items-start gap-space-xl lg:grid-cols-12">
        {/* Cột trái: thông số kỹ thuật, chuỗi thi công, nhật ký hiện trường */}
        <div className="flex flex-col gap-space-xl lg:col-span-7">
          <SpecsSection task={task} />

          <SectionCard
            icon={task.execution.icon}
            iconTone="plain"
            title={task.execution.title}
            trailing={
              <StatusBadge variant="neutral" dot={false} className="font-semibold">
                {executionCounterLabel(checkedIds.length, task.execution.steps.length)}
              </StatusBadge>
            }
          >
            <ExecutionStepList
              steps={task.execution.steps}
              checkedIds={checkedIds}
              onToggle={toggleStep}
              renderExtra={(step) => renderStepExtra(step as InstallationStep)}
            />
          </SectionCard>

          <SectionCard icon={task.fieldLog.icon} iconTone="plain" title={task.fieldLog.title}>
            <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
              {task.fieldLog.serials.map((serial) => (
                <div key={serial.id} className="flex flex-col gap-space-xs">
                  <label htmlFor={serial.id} className="text-label-sm font-semibold text-on-surface">
                    {serial.label}
                  </label>
                  <div className="flex h-12 items-center rounded-xl bg-surface-container-low px-space-sm">
                    <input
                      id={serial.id}
                      type="text"
                      defaultValue={serial.value}
                      className="flex-1 bg-transparent text-body-md text-on-surface outline-none"
                    />
                    <button type="button" title="Quét mã vạch" className="p-1 text-primary hover:text-primary-container">
                      <Icon name="barcode_scanner" className="text-[22px]" />
                    </button>
                  </div>
                  <span className="flex items-center gap-1 text-body-sm text-primary">{serial.confirmation}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-space-xs pt-space-xs">
              <label htmlFor="field-notes" className="text-label-sm font-semibold text-on-surface">
                {task.fieldLog.notesLabel}
              </label>
              <textarea
                id="field-notes"
                rows={3}
                value={notes}
                placeholder={task.fieldLog.notesPlaceholder}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full rounded-xl bg-surface-container-low p-space-sm text-body-md text-on-surface transition-all outline-none focus:bg-surface-container"
              />
            </div>
          </SectionCard>
        </div>

        {/* Cột phải: lưới mái, ảnh bằng chứng, liên hệ khách */}
        <div className="flex flex-col gap-space-xl lg:col-span-5">
          <SectionCard
            icon={task.arrayGrid.icon}
            iconTone="plain"
            title={task.arrayGrid.title}
            trailing={
              <StatusBadge variant="primary" size="sm" dot={false} className="font-bold">
                {task.arrayGrid.planLabel}
              </StatusBadge>
            }
          >
            <PanelArrayGrid cells={task.arrayGrid.cells} legend={task.arrayGrid.legend} />
          </SectionCard>

          <SectionCard
            icon={task.evidence.icon}
            iconTone="plain"
            title={task.evidence.title}
            trailing={<span className="text-label-sm font-bold text-primary">{task.evidence.uploadedLabel}</span>}
          >
            <div className="flex flex-col gap-space-sm">
              {task.evidence.phases.map((phase) => (
                <EvidenceGroup key={phase.title} title={phase.title} photos={phase.photos} />
              ))}
              <EvidenceGroup title={task.evidence.dropzoneTitle} dropzones={task.evidence.dropzones} />
            </div>
          </SectionCard>

          <ContactTile {...task.contact} callLabel={`Gọi ${task.contact.name}`} />
        </div>
      </div>

      {/* Thanh hành động dính đáy */}
      <ActionDock pulse title={task.footer.activeTime} description={task.footer.estimate}>
        <Button
          variant="ghost"
          onClick={runSync}
          disabled={sync !== 'idle'}
          iconLeft={syncIcon[sync]}
          className={cn('flex-1 sm:flex-none', sync === 'syncing' && '[&>span:first-child]:animate-spin')}
        >
          {syncLabel}
        </Button>
        <Button variant="accent" iconLeft="assignment_turned_in" className="flex-1 px-space-xl sm:flex-none">
          {task.footer.completeLabel}
        </Button>
      </ActionDock>
    </div>
  )
}

function SpecsSection({ task }: { task: NonNullable<ReturnType<typeof getInstallationTask>> }) {
  const [open, setOpen] = useState(true)

  return (
    <SectionCard
      icon={task.specs.icon}
      iconTone="plain"
      title={task.specs.title}
      trailing={
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-1 text-label-sm font-semibold text-primary hover:underline"
        >
          <span>{open ? task.specs.toggleLabels.collapse : task.specs.toggleLabels.expand}</span>
          <Icon name={open ? 'expand_less' : 'expand_more'} className="text-[16px]" />
        </button>
      }
    >
      {open && (
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-3">
          {task.specs.cards.map((card) => (
            <div key={card.title} className="flex flex-col gap-space-xs rounded-xl bg-surface-container-low p-space-md">
              <div
                className={cn(
                  'flex items-center gap-space-xs',
                  card.tone === 'secondary' ? 'text-secondary' : 'text-primary',
                )}
              >
                <Icon name={card.icon} className="text-[18px]" />
                <span className="text-label-md font-bold text-on-surface">{card.title}</span>
              </div>
              <p className="text-body-sm text-on-surface-variant">{card.description}</p>
              <span
                className={cn(
                  'w-fit rounded px-2 py-1 text-label-sm',
                  card.chipTone === 'warning'
                    ? 'bg-secondary-fixed font-bold text-on-secondary-fixed'
                    : 'bg-surface-container-highest font-semibold text-on-surface',
                )}
              >
                {card.chip}
              </span>
              <span className="text-body-sm text-on-surface-variant">{card.footnote}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-space-xs rounded-xl bg-surface-container-high p-space-sm">
        <div className="flex items-center gap-space-xs">
          <Icon name="info" className="text-[20px] text-secondary-container" />
          <span className="text-body-sm font-medium text-on-surface">{task.specs.request.text}</span>
        </div>
        <span className="text-label-sm font-bold text-primary">{task.specs.request.verdict}</span>
      </div>
    </SectionCard>
  )
}
