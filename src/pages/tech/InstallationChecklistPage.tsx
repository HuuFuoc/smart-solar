import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { ActionDock } from '@/components/common/tech/ActionDock'
import { ArrayTopologyMap } from '@/features/installations/ArrayTopologyMap'
import { ChecklistPhaseCard } from '@/features/installations/ChecklistPhaseCard'
import { ContactTile } from '@/features/installations/ContactTile'
import { EvidenceGroup } from '@/components/common/tech/EvidenceGallery'
import { MeasurementCard } from '@/components/common/tech/MeasurementCard'
import { SectionCard } from '@/components/common/tech/SectionCard'
import { SignatureDialog } from '@/features/installations/SignatureDialog'
import { Button, Card, Icon, ProgressRing, StatusBadge, Toast } from '@/components/common/stitch-ui'
import { cn } from '@/utils/cn'
import { getInstallationChecklist, getInstallationTask } from '@/data/installations'
import { notFound } from '@/routes/notFound'

const statToneClasses = {
  default: 'text-on-surface',
  primary: 'text-primary',
  secondary: 'text-secondary',
} as const

export function InstallationChecklistPage() {
  const { id } = useParams()
  const task = getInstallationTask(id)
  const checklist = getInstallationChecklist(id)
  if (!task || !checklist) notFound(`Không tìm thấy danh sách kiểm tra lắp đặt ${id ?? ''}`)

  return <InstallationChecklistView checklist={checklist} defaultNotes={task.fieldLog.notes} />
}

type ChecklistData = NonNullable<ReturnType<typeof getInstallationChecklist>>

function InstallationChecklistView({ checklist, defaultNotes }: { checklist: ChecklistData; defaultNotes: string }) {
  const allTasks = useMemo(() => checklist.phases.flatMap((phase) => phase.tasks), [checklist.phases])
  const [checkedIds, setCheckedIds] = useState(allTasks.filter((task) => task.defaultChecked).map((task) => task.id))
  const [notes, setNotes] = useState(defaultNotes)
  const [signOpen, setSignOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const toggleTask = (taskId: string, checked: boolean) =>
    setCheckedIds((current) => (checked ? [...current, taskId] : current.filter((value) => value !== taskId)))

  const doneCount = checkedIds.length
  const totalCount = allTasks.length
  const percent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2600)
  }

  return (
    <div className="flex w-full flex-col">
      {/* Banner phiên làm việc + trạng thái kết nối */}
      <div className="mb-space-md flex flex-col gap-space-xs rounded-xl bg-surface-container px-space-md py-space-xs shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-space-sm">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-primary-container" />
          <span className="text-label-sm font-bold text-primary">{checklist.session.label}</span>
          <span className="text-body-sm text-on-surface-variant">{checklist.session.mode}</span>
        </div>
        <div className="flex flex-wrap items-center gap-space-md text-on-surface-variant">
          <span className="flex items-center gap-1 text-label-sm">
            <Icon name="cloud_done" className="text-[16px] text-primary" />
            {checklist.session.database}
          </span>
          <span className="text-label-sm">{checklist.session.signal}</span>
        </div>
      </div>

      {/* Card ngữ cảnh job */}
      <Card padding="lg" className="relative mb-space-lg overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-fixed/20 blur-3xl"
        />
        <div className="relative z-10 flex flex-col gap-space-lg lg:flex-row lg:items-start lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-space-xs">
            <div className="mb-1 flex flex-wrap items-center gap-space-xs">
              <span className="rounded-full bg-surface-container px-space-xs py-0.5 text-label-sm font-bold tracking-tight text-primary">
                {checklist.header.projectCode}
              </span>
              <span className="text-body-sm font-semibold text-on-surface-variant">
                {checklist.header.customerLabel}
              </span>
              <StatusBadge variant={checklist.header.status.variant} className="font-semibold">
                {checklist.header.status.label}
              </StatusBadge>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-0.5 text-label-sm text-on-surface">
                <Icon name="timer" className="text-[14px] text-secondary" />
                <span className="font-bold">{checklist.header.timer}</span>
              </span>
            </div>

            <h1 className="text-headline-xl tracking-tight text-on-surface">{checklist.header.title}</h1>

            <div className="flex flex-wrap items-center gap-x-space-lg gap-y-2 pt-space-2xs text-on-surface-variant">
              <span className="flex items-center gap-1.5 text-body-md">
                <Icon name="pin_drop" className="text-[18px] text-primary" />
                {checklist.header.address}
              </span>
              <span className="flex items-center gap-1.5 text-body-md">
                <Icon name="perm_phone_msg" className="text-[18px] text-primary" />
                <a
                  href={checklist.header.phone.href}
                  className="font-medium text-on-surface underline hover:text-primary"
                >
                  {checklist.header.phone.label}
                </a>
              </span>
              <span className="flex items-center gap-1.5 text-body-md">
                <Icon name="event_upcoming" className="text-[18px] text-primary" />
                {checklist.header.window}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-space-xs self-start lg:self-center">
            {checklist.header.actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={cn(
                  'flex items-center gap-2 rounded-xl bg-surface-container px-space-md py-2.5 text-label-lg font-semibold shadow-sm transition-all hover:bg-surface-container-high',
                  action.tone === 'plain' ? 'text-on-surface' : 'text-primary',
                )}
              >
                <Icon name={action.icon} className={cn('text-[20px]', action.tone === 'plain' && 'text-secondary')} />
                {action.label}
              </button>
            ))}
            <Button size="lg" iconLeft="draw" onClick={() => setSignOpen(true)} className="py-2.5">
              Hoàn thành và bàn giao
            </Button>
          </div>
        </div>

        {/* Dải số liệu hệ thống */}
        <div className="mt-space-lg grid grid-cols-2 gap-space-sm rounded-xl bg-surface-container-low p-space-sm pt-space-md md:grid-cols-4">
          {checklist.header.stats.map((stat) => (
            <div key={stat.label} className="flex flex-col px-space-xs">
              <span className="text-label-sm font-semibold text-on-surface-variant">{stat.label}</span>
              <span className={cn('text-headline-md font-bold', statToneClasses[stat.tone ?? 'default'])}>
                {stat.value} <span className="text-label-md font-normal text-on-surface-variant">{stat.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
        {/* Cột trái: các phase checklist + ảnh kiểm chứng */}
        <div className="flex flex-col gap-space-lg lg:col-span-8">
          {checklist.phases.map((phase) => {
            const done = phase.tasks.filter((task) => checkedIds.includes(task.id)).length
            return (
              <ChecklistPhaseCard
                key={phase.id}
                icon={phase.icon}
                tone={phase.tone}
                title={phase.title}
                description={phase.description}
                badgeIcon={phase.badgeIcon}
                badgeLabel={`${done}/${phase.tasks.length} ${phase.badgeSuffix}`}
                tasks={phase.tasks}
                checkedIds={checkedIds}
                onToggle={toggleTask}
              />
            )
          })}

          <ChecklistPhaseCard
            icon={checklist.photos.icon}
            tone={checklist.photos.tone}
            title={checklist.photos.title}
            description={checklist.photos.description}
            badgeLabel={checklist.photos.badgeLabel}
          >
            <EvidenceGroup
              hideTitle
              aspect="square"
              columns={4}
              dropzoneVariant="dashed"
              title={checklist.photos.title}
              photos={checklist.photos.items}
              dropzones={checklist.photos.dropzones}
            />
          </ChecklistPhaseCard>
        </div>

        {/* Cột phải: số đo, ghi chú, hotline */}
        <div className="flex flex-col gap-space-lg lg:col-span-4">
          <SectionCard
            icon={checklist.measurements.icon}
            iconTone="plain"
            title={checklist.measurements.title}
            trailing={
              <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm font-bold text-on-primary-fixed-variant">
                {checklist.measurements.badge}
              </span>
            }
          >
            <div className="flex flex-col gap-space-sm">
              {checklist.measurements.readings.map((reading) => (
                <MeasurementCard key={reading.label} {...reading} />
              ))}
            </div>
            <ArrayTopologyMap {...checklist.measurements.topology} />
          </SectionCard>

          <SectionCard
            icon={checklist.notes.icon}
            iconTone="plain"
            title={checklist.notes.title}
            trailing={<span className="text-label-sm text-on-surface-variant">{checklist.notes.autosaveLabel}</span>}
          >
            <textarea
              rows={5}
              value={notes}
              placeholder={checklist.notes.placeholder}
              aria-label={checklist.notes.title}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full resize-none rounded-xl bg-surface-container-low p-space-sm text-body-md text-on-surface shadow-sm transition-all outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container"
            />
            <div className="flex items-center justify-between gap-space-sm pt-space-2xs">
              <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                <Icon name="person" className="text-[14px] text-primary" />
                {checklist.notes.techLead}
              </span>
              <button
                type="button"
                onClick={() => showToast(checklist.dock.savedMessage)}
                className="rounded-lg bg-surface-container px-space-sm py-1 text-label-sm font-semibold text-primary transition-all hover:bg-surface-container-high"
              >
                {checklist.notes.appendLabel}
              </button>
            </div>
          </SectionCard>

          <ContactTile
            eyebrow={checklist.hotline.eyebrow}
            icon={checklist.hotline.icon}
            name={checklist.hotline.name}
            note={checklist.hotline.note}
            phoneHref={checklist.hotline.phoneHref}
            callTone="solid"
            callLabel={`Gọi ${checklist.hotline.name}`}
          />
        </div>
      </div>

      {/* Thanh tiến độ dính đáy */}
      <ActionDock
        title={checklist.dock.title}
        leading={
          <div className="flex min-w-0 items-center gap-space-md">
            <ProgressRing value={percent} size={48} strokeWidth={4} label={`Hoàn thành ${percent}%`}>
              <span className="text-label-md font-bold text-primary">{percent}%</span>
            </ProgressRing>
            <div className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-label-lg font-bold text-on-surface">{checklist.dock.title}</span>
                <span className="rounded-full bg-secondary-fixed px-2 py-0.5 text-label-sm font-bold text-on-secondary-fixed">
                  {checklist.dock.stageLabel}
                </span>
              </div>
              <span className="truncate text-body-sm text-on-surface-variant">
                {checklist.dock.counterLabel(doneCount, totalCount)}
              </span>
            </div>
          </div>
        }
      >
        <Button variant="ghost" iconLeft="save" onClick={() => showToast(checklist.dock.savedMessage)}>
          {checklist.dock.saveLabel}
        </Button>
        <Button iconLeft="assignment_turned_in" onClick={() => setSignOpen(true)}>
          {checklist.dock.signLabel}
        </Button>
      </ActionDock>

      <SignatureDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        title={checklist.signature.title}
        subtitle={checklist.signature.subtitle}
        rows={checklist.signature.rows}
        consent={checklist.signature.consent}
        canvasLabel={checklist.signature.canvasLabel}
        hint={checklist.signature.hint}
        clearLabel={checklist.signature.clearLabel}
        cancelLabel={checklist.signature.cancelLabel}
        submitLabel={checklist.signature.submitLabel}
        onSubmit={() => showToast(checklist.signature.successMessage)}
      />

      <Toast open={toast !== null} message={toast ?? ''} />
    </div>
  )
}
