import { Link, useParams } from 'react-router'
import { FieldNoteComposer } from '@/features/tasks/FieldNoteComposer'
import { SectionCard } from '@/components/common/tech/SectionCard'
import { VerticalTimeline } from '@/features/tasks/VerticalTimeline'
import { WorkOrderHeaderCard } from '@/features/tasks/WorkOrderHeaderCard'
import { Avatar, Breadcrumb, Button, Card, Icon, StatusBadge, Timeline } from '@/components/common/stitch-ui'
import { ROUTES } from '@/routes/paths'
import { getTaskDetail, type TaskDetail } from '@/data/taskDetail'
import { notFound } from '@/routes/notFound'

/* Dựng từ task_detail_timeline/code.html + screen.png. */

export function TaskDetailPage() {
  const { id } = useParams()
  const detail = getTaskDetail(id)
  if (!detail) notFound()
  return <TaskDetailView detail={detail} />
}

function TaskDetailView({ detail }: { detail: TaskDetail }) {
  const { summary, lifecycle, auditLog, fieldNote, geolocation, signOff } = detail

  return (
    <div className="flex w-full flex-col gap-space-xl">
      {/* Điều hướng + hành động nhanh */}
      <div className="flex flex-col justify-between gap-space-md md:flex-row md:items-center">
        <div className="flex items-center gap-space-sm">
          <Link
            to={ROUTES.tech.tasks}
            aria-label="Quay lại danh sách phiếu công việc"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-lowest text-primary shadow-sm transition-all hover:bg-surface-container-high"
          >
            <Icon name="arrow_back" className="text-[20px]" />
          </Link>
          <Breadcrumb items={detail.breadcrumb} />
        </div>

        <div className="flex flex-wrap items-center gap-space-xs">
          <Button size="md" variant="tonal" iconLeft="share">
            {detail.actions.share}
          </Button>
          <Button size="md" variant="tonal" iconLeft="download">
            {detail.actions.export}
          </Button>
          <Button size="md" iconLeft={detail.actions.dossier.icon}>
            {detail.actions.dossier.label}
          </Button>
        </div>
      </div>

      <WorkOrderHeaderCard
        icon={summary.icon}
        code={detail.code}
        status={summary.status}
        syncLabel={summary.syncLabel}
        title={summary.title}
        facts={summary.facts}
        metrics={summary.metrics}
      />

      {/* Lifecycle Progression – stepper ngang dùng Timeline của components/common/stitch-ui */}
      <Card padding="lg">
        <div className="flex items-center justify-between gap-space-sm pb-space-md">
          <div>
            <h3 className="text-headline-md text-on-surface">{lifecycle.title}</h3>
          </div>
          <span className="hidden items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 text-label-md text-primary sm:flex">
            <Icon name="verified" className="text-[18px]" />
            {lifecycle.badge}
          </span>
        </div>
        <Timeline steps={lifecycle.steps} className="pt-space-xs" />
      </Card>

      {/* Nhật ký dọc + cột thao tác bên phải */}
      <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
        <section className="flex flex-col gap-space-md lg:col-span-7">
          <div className="flex items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-xs">
              <Icon name="history" className="text-[22px] text-primary" />
              <h3 className="text-headline-md text-on-surface">{auditLog.title}</h3>
            </div>
            <div className="flex items-center gap-space-xs text-label-sm text-on-surface-variant">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />
              <span>{auditLog.meta}</span>
            </div>
          </div>
          <VerticalTimeline entries={auditLog.entries} />
        </section>

        <aside className="flex flex-col gap-space-lg lg:col-span-5">
          <SectionCard
            icon="add_comment"
            iconTone="plain"
            title={fieldNote.title}
            trailing={<span className="text-label-sm text-on-surface-variant">{fieldNote.hint}</span>}
          >
            <FieldNoteComposer
              dictation={fieldNote.dictation}
              placeholder={fieldNote.placeholder}
              submitLabel={fieldNote.submitLabel}
            />
          </SectionCard>

          <SectionCard
            icon="map"
            iconTone="plain"
            title={geolocation.title}
            trailing={
              <StatusBadge variant="neutral" size="sm" dot={false}>
                {geolocation.precision}
              </StatusBadge>
            }
          >
            <div className="relative h-44 w-full overflow-hidden rounded-xl bg-surface-container shadow-inner">
              <img src={geolocation.map.src} alt={geolocation.map.alt} className="h-full w-full object-cover" />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-on-background/70 via-transparent to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-space-xs p-space-sm text-on-primary">
                <div className="flex items-center gap-space-xs">
                  <Icon name="location_on" className="text-[18px] text-secondary-container" />
                  <span className="text-label-sm font-semibold">{geolocation.map.address}</span>
                </div>
                <span className="text-label-sm opacity-80">{geolocation.map.coords}</span>
              </div>
            </div>

            <div className="flex flex-col gap-space-xs pt-space-xs">
              <span className="text-label-md font-semibold text-on-surface">{geolocation.checklistTitle}</span>
              <div className="grid grid-cols-2 gap-space-xs pt-1">
                {geolocation.checklist.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-space-xs rounded-xl bg-surface-container-low p-space-xs"
                  >
                    <Icon name="check_box" className="text-[18px] text-surface-tint" />
                    <span className="text-label-sm text-on-surface">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {signOff && (
            <Card padding="lg" className="flex flex-col gap-space-sm">
              <div className="flex flex-wrap items-center justify-between gap-space-xs">
                <span className="text-label-md font-semibold text-on-surface">{signOff.title}</span>
                <StatusBadge variant={signOff.badgeVariant} size="sm" dot={false} icon="draw" className="font-bold">
                  {signOff.badge}
                </StatusBadge>
              </div>

              <div className="flex items-center gap-space-md pt-space-xs">
                <Avatar size="lg" initials={signOff.initials} tone="neutral" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-label-lg font-bold text-on-surface">{signOff.name}</span>
                  <span className="truncate text-body-sm text-on-surface-variant">{signOff.contact}</span>
                  <span className="mt-0.5 text-label-sm text-surface-tint">{signOff.signedNote}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-space-xs rounded-xl bg-surface-container p-space-sm">
                <div className="flex items-center gap-space-xs">
                  <Icon name="verified" className="text-[20px] text-primary" />
                  <span className="text-label-sm font-semibold text-on-surface">{signOff.hash}</span>
                </div>
                <button type="button" className="text-label-sm font-bold text-primary hover:underline">
                  {signOff.verifyLabel}
                </button>
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}
