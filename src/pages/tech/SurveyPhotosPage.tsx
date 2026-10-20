import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { PhotoInspector } from '@/features/surveys/PhotoInspector'
import { PhotoSectionHeader } from '@/features/surveys/PhotoSectionHeader'
import { Button, Card, Icon, PhotoCard, PhotoDropzone, PhotoGrid, ProgressBar, StatusBadge, Toast } from '@/components/common/stitch-ui'
import { notFound } from '@/routes/notFound'
import {
  findSurveyPhotoById,
  getFirstSurveyPhoto,
  getSurveyPhotoDocById,
  getSurveyPhotoProgress,
  type SurveyPhotoDoc,
} from '@/data/surveyPhotos'
import { getSurveyById, type SurveyRecord } from '@/data/surveys'

/* Dựng từ survey_image_documentation/code.html + screen.png. */

export function SurveyPhotosPage() {
  const { id } = useParams()
  const survey = getSurveyById(id)
  const doc = getSurveyPhotoDocById(id)
  const firstPhoto = doc ? getFirstSurveyPhoto(doc) : undefined
  if (!survey || !doc || !firstPhoto) notFound()
  return <SurveyPhotosView survey={survey} doc={doc} firstPhotoId={firstPhoto.id} />
}

function SurveyPhotosView({
  survey,
  doc,
  firstPhotoId,
}: {
  survey: SurveyRecord
  doc: SurveyPhotoDoc
  firstPhotoId: string
}) {
  const progress = useMemo(() => getSurveyPhotoProgress(doc), [doc])
  const [selectedId, setSelectedId] = useState(firstPhotoId)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [captions, setCaptions] = useState<Record<string, string>>({})
  const [activeTool, setActiveTool] = useState(doc.inspector.tools[0]?.icon ?? 'edit')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  const selected = findSurveyPhotoById(doc, selectedId)
  if (!selected) notFound()

  const fill = (template: string, values: Record<string, string | number>) =>
    Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template)

  return (
    <div className="flex w-full flex-col gap-space-xl">
      {/* Header ngữ cảnh + chỉ báo bước 2/2 (thanh Audit Completeness Target) */}
      <Card padding="lg" className="flex w-full flex-col gap-space-md">
        <div className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-center">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-space-xs">
              <span className="rounded bg-surface-container-low px-2 py-0.5 text-label-sm text-on-surface-variant">
                {doc.header.projectRef}
              </span>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-outline-variant" />
              <span className="text-label-sm font-semibold text-primary">{doc.header.customer}</span>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-outline-variant" />
              <span className="text-label-sm text-on-surface-variant">{doc.header.address}</span>
            </div>
            {/* Không flex-wrap: badge phải nằm cùng hàng baseline với tiêu đề như thiết kế */}
            <div className="mt-1 flex items-baseline gap-space-sm">
              <h1 className="min-w-0 text-headline-xl font-bold text-on-surface">{doc.header.title}</h1>
              <StatusBadge variant="neutral" size="sm" dot={false} className="shrink-0 text-label-md">
                {doc.header.badge}
              </StatusBadge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            <Button
              variant="ghost"
              size="md"
              iconLeft="cloud_upload"
              className="font-normal hover:bg-surface-container"
              onClick={() => showToast(doc.toasts.saved)}
            >
              {doc.header.actions.batch}
            </Button>
            <Button
              variant="ghost"
              size="md"
              iconLeft="photo_camera"
              className="font-normal text-on-surface hover:bg-surface-container"
              onClick={() => showToast(doc.toasts.saved)}
            >
              {doc.header.actions.camera}
            </Button>
            <Button
              size="md"
              iconLeft="done_all"
              className="bg-primary shadow-sm hover:bg-tertiary-container"
              onClick={() => showToast(doc.toasts.verifiedAll)}
            >
              {doc.header.actions.verifyAll}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-space-xs rounded-xl bg-surface-container-low p-space-md">
          <div className="flex flex-wrap items-center justify-between gap-space-xs text-label-md">
            <div className="flex flex-wrap items-center gap-space-xs">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />
              <span className="font-semibold text-on-surface">{doc.progress.title}</span>
              <span className="font-normal text-on-surface-variant">
                {`${fill(doc.progress.capturedTemplate, {
                  captured: progress.captured,
                  required: progress.required,
                })}`}
              </span>
            </div>
            <div className="flex items-center gap-space-xs font-bold text-primary">
              <Icon name="verified" className="text-[16px]" />
              <span>{fill(doc.progress.completeTemplate, { percent: progress.percent })}</span>
            </div>
          </div>

          <ProgressBar value={progress.percent} tone="primary" size="sm" label={doc.progress.title} />

          <div className="flex flex-wrap items-center justify-between gap-space-xs pt-0.5 text-label-sm text-on-surface-variant">
            <span>{progress.breakdown}</span>
            {progress.remaining > 0 && (
              <span className="flex items-center gap-1 font-semibold text-secondary">
                <Icon name="info" className="text-[14px]" />
                {fill(doc.progress.remainingTemplate, { remaining: progress.remaining })}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/*
       * Thiết kế chia 8/4 từ xl trở lên, aside Photo Inspector bám dính bên phải.
       * Dưới xl (gồm cả dưới lg) xếp một cột, aside nằm sau nội dung chính trong DOM nên tự xuống dưới.
       */}
      <div className="grid grid-cols-1 items-start gap-space-xl xl:grid-cols-12">
        <div className="flex flex-col gap-space-xl xl:col-span-8">
          {doc.sections.map((section) => {
            const shots = section.photos.length
            const isOptional = section.requiredCount === 0
            const fulfilled = !isOptional && shots >= section.requiredCount
            const countLabel = isOptional
              ? `Đã ghi ${shots} ảnh`
              : fulfilled
                ? `Đã chụp ${shots}/${section.requiredCount}, 100%`
                : `Đã chụp ${shots}/${section.requiredCount}`

            return (
              <section key={section.id} className="flex flex-col gap-space-md">
                <PhotoSectionHeader
                  icon={section.icon}
                  iconTone={section.iconTone}
                  title={section.title}
                  description={section.description}
                  requirementLabel={section.requirementLabel}
                  requirementTone={section.requirementTone}
                  countLabel={countLabel}
                  countFulfilled={fulfilled}
                />

                <PhotoGrid columns={3}>
                  {section.photos.map((photo) => (
                    <PhotoCard
                      key={photo.id}
                      src={photo.src}
                      alt={photo.alt}
                      tag={{ label: photo.tag.label, icon: photo.tag.icon }}
                      time={photo.time}
                      gpsTagged={photo.gpsTagged}
                      title={photo.title}
                      note={captions[photo.id] ?? photo.note}
                      onNoteChange={(value) => setCaptions((prev) => ({ ...prev, [photo.id]: value }))}
                      onZoom={() => setSelectedId(photo.id)}
                      onReplace={() => showToast(doc.toasts.saved)}
                      className={photo.id === selected.id ? 'ring-2 ring-primary-container' : undefined}
                    />
                  ))}
                  {section.dropzones.map((zone) => (
                    <PhotoDropzone
                      key={zone.id}
                      icon={zone.icon}
                      title={zone.title}
                      requirement={zone.requirement}
                      required={zone.required}
                      hint={zone.hint}
                      actionLabel={zone.actionLabel}
                      actionIcon={zone.actionIcon}
                      onSelect={() => showToast(doc.toasts.saved)}
                    />
                  ))}
                </PhotoGrid>
              </section>
            )
          })}
        </div>

        <aside className="flex flex-col gap-space-md xl:sticky xl:top-20 xl:col-span-4">
          <PhotoInspector
            config={doc.inspector}
            tip={doc.tip}
            photo={selected}
            notes={notes[selected.id] ?? selected.inspector.notes}
            onNotesChange={(value) => setNotes((prev) => ({ ...prev, [selected.id]: value }))}
            onRemove={() => showToast(doc.toasts.saved)}
            onSave={() => showToast(doc.toasts.annotationSaved)}
            activeTool={activeTool}
            onToolChange={setActiveTool}
          />
        </aside>
      </div>

      {/* Dải hành động cuối trang */}
      <Card padding="lg" className="flex flex-col items-center justify-between gap-space-md shadow-level-2 md:flex-row">
        <div className="flex items-center gap-space-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-container-low text-primary">
            <Icon name={doc.dock.icon} className="text-[26px]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs">
              <span className="text-headline-md font-bold text-on-surface">{doc.dock.title}</span>
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />
            </div>
            <p className="text-body-sm text-on-surface-variant">
              {fill(doc.dock.descriptionTemplate, { total: progress.total, remaining: progress.remaining })}
            </p>
          </div>
        </div>

        <div className="flex w-full items-center justify-end gap-space-sm md:w-auto">
          <Button
            variant="ghost"
            className="px-space-lg font-normal text-on-surface hover:bg-surface-container"
            onClick={() => showToast(doc.toasts.saved)}
          >
            {doc.dock.saveDraft}
          </Button>
          <Button
            iconLeft="assignment_turned_in"
            className="bg-primary px-space-xl shadow-md hover:bg-tertiary-container"
            onClick={() => {
              console.info('[survey:photos] documentation completed', { surveyId: survey.id, ...progress })
              showToast(doc.toasts.completed)
            }}
          >
            {doc.dock.complete}
          </Button>
        </div>
      </Card>

      <Toast open={toast !== null} message={toast ?? ''} />
    </div>
  )
}
