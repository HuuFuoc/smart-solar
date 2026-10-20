import { Button } from '@/components/common/stitch-ui/Button'
import { Card } from '@/components/common/stitch-ui/Card'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { StatusBadge } from '@/components/common/stitch-ui/StatusBadge'
import { cn } from '@/utils/cn'
import type { SurveyPhotoAsset, SurveyPhotoDoc } from '@/data/surveyPhotos'

/*
 * Aside phải của survey_image_documentation: xem lại ảnh đang chọn, lớp chú thích, EXIF và ghi chú.
 * Lớp SVG annotation vẽ lại từ code.html, màu đổi sang token secondary-container / on-surface.
 */
export type PhotoInspectorProps = {
  config: SurveyPhotoDoc['inspector']
  tip: SurveyPhotoDoc['tip']
  photo: SurveyPhotoAsset
  notes: string
  onNotesChange: (notes: string) => void
  onRemove: () => void
  onSave: () => void
  /** Công cụ đang chọn trong bảng công cụ nổi */
  activeTool: string
  onToolChange: (icon: string) => void
}

export function PhotoInspector({
  config,
  tip,
  photo,
  notes,
  onNotesChange,
  onRemove,
  onSave,
  activeTool,
  onToolChange,
}: PhotoInspectorProps) {
  const metadata = [
    { label: config.coordinatesLabel, value: photo.inspector.coordinates },
    { label: config.timestampLabel, value: photo.inspector.timestamp },
    { label: config.elevationLabel, value: photo.inspector.elevation },
    { label: config.lensLabel, value: photo.inspector.lens },
  ]

  return (
    <>
      <Card padding="lg" className="flex flex-col gap-space-md">
        <div className="flex items-center justify-between gap-space-sm pb-space-sm">
          <div className="flex items-center gap-space-xs">
            <Icon name="draw" className="text-[22px] text-primary" />
            <span className="text-headline-md font-bold text-on-surface">{config.title}</span>
          </div>
          <StatusBadge
            variant="success"
            size="sm"
            dot={false}
            className="shrink-0 bg-primary-fixed font-semibold text-on-primary-fixed"
          >
            {config.badge}
          </StatusBadge>
        </div>

        <div className="relative w-full overflow-hidden rounded-xl bg-surface-container shadow-inner">
          <img src={photo.src} alt={photo.alt} className="h-64 w-full object-cover" />

          {photo.inspector.annotations > 0 && (
            <svg viewBox="0 0 400 256" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
              <defs>
                <marker
                  id="inspector-arrow"
                  markerWidth={6}
                  markerHeight={6}
                  refX={5}
                  refY={5}
                  orient="auto-start-reverse"
                  viewBox="0 0 10 10"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--color-secondary-container)" />
                </marker>
              </defs>
              <circle
                cx={140}
                cy={110}
                r={18}
                fill="none"
                stroke="var(--color-secondary-container)"
                strokeDasharray="4,4"
                strokeWidth={2.5}
              />
              <line
                x1={220}
                y1={160}
                x2={165}
                y2={120}
                stroke="var(--color-secondary-container)"
                strokeWidth={2.5}
                markerEnd="url(#inspector-arrow)"
              />
              <rect x={220} y={150} width={130} height={26} rx={6} fill="var(--color-on-surface)" fillOpacity={0.85} />
              <text x={228} y={167} fontSize={11} fontWeight={600} fill="var(--color-on-primary)">
                {config.annotationText}
              </text>
            </svg>
          )}

          <div className="absolute right-3 top-3 flex flex-col gap-1 rounded-xl bg-surface-container-lowest/90 p-1 shadow-md backdrop-blur-md">
            {config.tools.map((tool) => {
              const isDestructive = tool.icon === 'delete'
              const isActive = tool.icon === activeTool
              return (
                <button
                  key={tool.icon}
                  type="button"
                  title={tool.label}
                  aria-label={tool.label}
                  aria-pressed={isActive}
                  onClick={() => onToolChange(tool.icon)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                    isDestructive
                      ? 'text-error hover:bg-error-container'
                      : isActive
                        ? 'bg-primary-container text-on-primary'
                        : 'text-on-surface hover:bg-surface-container-high',
                  )}
                >
                  <Icon name={tool.icon} className="text-[18px]" />
                </button>
              )
            })}
          </div>

          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-surface-container-lowest/90 px-2.5 py-1 backdrop-blur-md">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-label-sm font-semibold text-on-surface">
              {config.annotationLabel.replace('{count}', String(photo.inspector.annotations))}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between gap-space-sm">
            <span className="min-w-0 text-headline-md font-bold text-on-surface">{photo.title}</span>
            <button
              type="button"
              className="flex shrink-0 items-center gap-0.5 text-label-sm text-primary hover:text-tertiary"
            >
              <Icon name="edit_note" className="text-[16px]" />
              {config.editTitleLabel}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-space-xs rounded-xl bg-surface-container-low p-space-sm text-label-sm">
            {metadata.map((item) => (
              <div key={item.label} className="flex flex-col">
                <span className="font-normal text-on-surface-variant">{item.label}</span>
                <span className="font-semibold text-on-surface">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-1 flex flex-col gap-1">
            <label htmlFor="inspector-notes" className="text-label-sm font-bold text-on-surface">
              {config.notesLabel}
            </label>
            <textarea
              id="inspector-notes"
              rows={3}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="w-full resize-none rounded-xl bg-surface-container-low p-2.5 text-body-sm text-on-surface focus:bg-surface-container-lowest focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-space-xs">
            <Button
              size="sm"
              variant="ghost"
              iconLeft="delete_forever"
              onClick={onRemove}
              className="bg-surface-container-high font-normal text-error hover:bg-error-container hover:text-on-error-container"
            >
              {config.removeLabel}
            </Button>
            <Button size="sm" iconLeft="save" onClick={onSave} className="px-space-md font-normal">
              {config.saveLabel}
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex items-start gap-space-sm rounded-2xl bg-surface-container-low p-space-md">
        <Icon name={tip.icon} className="mt-0.5 shrink-0 text-[22px] text-secondary" />
        <div className="flex flex-col">
          <span className="text-label-md font-bold text-on-surface">{tip.title}</span>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">{tip.text}</p>
        </div>
      </div>
    </>
  )
}
