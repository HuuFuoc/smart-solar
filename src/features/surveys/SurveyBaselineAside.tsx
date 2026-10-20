import { Card } from '@/components/common/stitch-ui/Card'
import { Checkbox } from '@/components/common/stitch-ui/Checkbox'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ProgressBar } from '@/components/common/stitch-ui/ProgressBar'
import { StatusBadge } from '@/components/common/stitch-ui/StatusBadge'
import { cn } from '@/utils/cn'
import type { SurveyPhoto, SurveyVerification } from '@/data/surveys'

/*
 * Cột trái của site_survey_verification: dữ liệu chủ nhà tự khai (chỉ đọc) + checklist an toàn.
 * Card ngoài dùng nền surface-container-low, các ô bên trong nền surface-container-lowest như thiết kế.
 */
export type SurveyBaselineAsideProps = {
  data: SurveyVerification['baseline']
  safety: SurveyVerification['safety']
  /** Ảnh lấy từ homeowner.photos của cùng survey để hai màn không lệch dữ liệu */
  photos: SurveyPhoto[]
  checked: Record<string, boolean>
  onCheckedChange: (id: string, checked: boolean) => void
}

const innerCard = 'flex flex-col rounded-xl bg-surface-container-lowest p-space-sm shadow-sm'

export function SurveyBaselineAside({
  data,
  safety,
  photos,
  checked,
  onCheckedChange,
}: SurveyBaselineAsideProps) {
  return (
    <>
      <div className="flex flex-col gap-space-md rounded-2xl bg-surface-container-low p-space-lg shadow-level-1">
        <div className="flex items-center justify-between gap-space-sm">
          <div className="flex min-w-0 flex-1 items-center gap-space-xs">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-primary">
              <Icon name="person_pin_circle" className="text-[20px]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-headline-md text-on-surface">{data.title}</h2>
              <p className="text-body-sm text-on-surface-variant">{data.subtitle}</p>
            </div>
          </div>
          <StatusBadge variant="neutral" size="sm" dot={false} className="shrink-0 font-medium">
            {data.badge}
          </StatusBadge>
        </div>

        <div className={cn(innerCard, 'gap-space-xs')}>
          <span className="text-label-sm text-on-surface-variant">
            {data.blueprint.label}
          </span>
          <div className="flex items-baseline justify-between gap-space-xs">
            <span className="text-headline-lg font-bold text-on-surface">
              {data.blueprint.length} <span className="font-normal text-on-surface-variant">×</span>{' '}
              {data.blueprint.width}
            </span>
            <span className="text-label-lg font-semibold text-primary">{data.blueprint.area}</span>
          </div>
          <ProgressBar value={data.blueprint.progress} size="sm" label={data.blueprint.label} />
          <span className="text-body-sm text-on-surface-variant">{data.blueprint.caption}</span>
        </div>

        <div className="grid grid-cols-2 gap-space-xs">
          {data.metrics.map((metric) => (
            <div key={metric.label} className={cn(innerCard, 'gap-1')}>
              <div className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                <Icon name={metric.icon} className="text-[16px] text-secondary" />
                {metric.label}
              </div>
              <span className="text-headline-md font-bold text-on-surface">{metric.value}</span>
              <span className="text-body-sm text-on-surface-variant">{metric.caption}</span>
            </div>
          ))}
        </div>

        <div className={cn(innerCard, 'flex-row items-center justify-between gap-space-xs')}>
          <div className="flex min-w-0 items-center gap-space-xs">
            <Icon name={data.material.icon} className="text-[22px] text-primary-container" />
            <div className="flex min-w-0 flex-col">
              <span className="text-label-md font-semibold text-on-surface">{data.material.title}</span>
              <span className="text-body-sm text-on-surface-variant">{data.material.description}</span>
            </div>
          </div>
          <span className="shrink-0 rounded bg-surface-container-low px-2 py-0.5 text-label-sm font-bold text-primary">
            {data.material.badge}
          </span>
        </div>

        <div className="flex flex-col gap-space-xs pt-space-xs">
          <div className="flex items-center justify-between">
            <span className="text-label-md font-semibold text-on-surface">{data.photos.title}</span>
            <span className="text-label-sm text-on-surface-variant">{data.photos.count}</span>
          </div>
          <div className="grid grid-cols-2 gap-space-xs">
            {data.photos.items.map((item) => {
              const photo = photos.find((candidate) => candidate.id === item.photoId)
              if (!photo) return null
              return (
                <div
                  key={item.photoId}
                  className="group relative aspect-video overflow-hidden rounded-xl bg-surface-container shadow-sm"
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-inverse-surface/80 via-transparent to-transparent p-2">
                    <span className="truncate text-label-sm text-inverse-on-surface">{item.caption}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-start gap-space-xs rounded-xl bg-surface-container-highest p-space-sm text-on-surface">
          <Icon name="info" className="mt-0.5 shrink-0 text-[20px] text-primary" />
          <p className="text-body-sm leading-snug">{data.note}</p>
        </div>
      </div>

      <Card padding="lg" className="flex flex-col gap-space-sm">
        <span className="text-label-sm font-bold text-primary">{safety.title}</span>
        <div className="flex flex-col gap-2">
          {safety.items.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer select-none items-center gap-space-xs text-body-sm text-on-surface"
            >
              <Checkbox
                size="sm"
                checked={checked[item.id] ?? item.checked}
                onCheckedChange={(next) => onCheckedChange(item.id, next === true)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </Card>
    </>
  )
}
