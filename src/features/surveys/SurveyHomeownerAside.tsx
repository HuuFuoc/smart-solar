import { Icon } from '@/components/common/stitch-ui/Icon'
import { StatusBadge } from '@/components/common/stitch-ui/StatusBadge'
import { SectionCard } from '@/components/common/tech/SectionCard'
import { StatTile } from '@/components/common/tech/StatTile'
import { SunPathChart } from '@/features/surveys/components/SunPathChart'
import type { SurveyRecord } from '@/data/surveys'

/*
 * Aside phụ của luồng khảo sát: dữ liệu chủ nhà tự khai (chỉ đọc).
 * Dựng từ cột trái của site_survey_task; màn survey_image_documentation dùng lại nguyên khối này.
 */
export type SurveyHomeownerAsideProps = {
  data: SurveyRecord['homeowner']
  /** Bấm vào một ảnh tự đánh giá (mở lightbox ở bản thật) */
  onPhotoClick?: (photoId: string) => void
}

export function SurveyHomeownerAside({ data, onPhotoClick }: SurveyHomeownerAsideProps) {
  return (
    <SectionCard
      icon="assignment"
      title={data.title}
      subtitle={data.subtitle}
      trailing={
        <StatusBadge variant="neutral" size="sm" dot={false} className="shrink-0">
          {data.badge}
        </StatusBadge>
      }
    >
      <div className="grid grid-cols-2 gap-space-sm">
        {data.tiles.map((tile) => (
          <StatTile key={tile.label} {...tile} />
        ))}
      </div>

      <div className="flex flex-col gap-1.5 rounded-xl bg-surface-container p-space-sm">
        <div className="flex items-center gap-1 text-label-md text-on-surface">
          <Icon name="sticky_note_2" className="text-[16px] text-secondary" />
          <span>{data.notes.title}</span>
        </div>
        <p className="text-body-sm italic text-on-surface">{data.notes.text}</p>
      </div>

      <div className="flex flex-col gap-space-xs pt-space-xs">
        <div className="flex items-center justify-between">
          <span className="text-label-md font-semibold text-on-surface">{data.photos.title}</span>
          <span className="text-label-sm text-surface-tint">{data.photos.hint}</span>
        </div>
        <div className="grid grid-cols-3 gap-space-xs">
          {data.photos.items.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => onPhotoClick?.(photo.id)}
              className="group relative aspect-square overflow-hidden rounded-xl bg-surface-container focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-tertiary-container/30"
            >
              <img
                src={photo.src}
                alt={photo.alt}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-on-background/20 transition-colors group-hover:bg-on-background/10"
              />
              <span className="absolute bottom-1 left-1.5 rounded bg-on-background/80 px-1.5 py-0.5 text-label-sm font-semibold tracking-wide text-surface">
                {photo.tag}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-space-xs pt-space-xs">
        <div className="flex items-center justify-between">
          <span className="text-label-md font-semibold text-on-surface">{data.gis.title}</span>
          <span className="text-label-sm text-on-surface-variant">{data.gis.yield}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-space-sm">
          <SunPathChart />
        </div>
      </div>
    </SectionCard>
  )
}
