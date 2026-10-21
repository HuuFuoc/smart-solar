import { Icon } from '@/components/common/stitch-ui'
import { cn } from '@/utils/cn'

// Lưới ảnh hiện trường của các màn lắp đặt (khác PhotoGrid vì không có ô ghi chú)
export type EvidencePhotoItem = {
  src: string
  alt: string
  title: string
  /** "08:35 AM, Verified intact" */
  meta: string
  /** Dấu tích ở góc phải caption (lưới ảnh của màn checklist) */
  verified?: boolean
}

export type EvidenceDropzoneItem = {
  icon: string
  title: string
  hint: string
}

/** video = lưới 2 cột của installation_task; square = lưới ô vuông của màn checklist. */
export type EvidenceAspect = 'video' | 'square'

export type EvidenceGroupProps = {
  /** Nhãn in hoa của nhóm */
  title: string
  photos?: EvidencePhotoItem[]
  dropzones?: EvidenceDropzoneItem[]
  onSelectPhoto?: (photo: EvidencePhotoItem) => void
  onUpload?: (dropzone: EvidenceDropzoneItem) => void
  aspect?: EvidenceAspect
  /** Số cột của lưới: 2 (installation_task), 3 (maintenance_task) hoặc 4 (checklist) */
  columns?: 2 | 3 | 4
  /** dashed = ô tải ảnh viền đứt của màn checklist */
  dropzoneVariant?: 'plain' | 'dashed'
  /** Ẩn nhãn nhóm khi lưới nằm trong card đã có tiêu đề */
  hideTitle?: boolean
  className?: string
}

const columnClasses = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 md:grid-cols-4' } as const

export function EvidenceGroup({
  title,
  photos = [],
  dropzones = [],
  onSelectPhoto,
  onUpload,
  aspect = 'video',
  columns = 2,
  dropzoneVariant = 'plain',
  hideTitle = false,
  className,
}: EvidenceGroupProps) {
  const isSquare = aspect === 'square'

  return (
    <div className={cn('flex flex-col gap-space-xs', className)}>
      {!hideTitle && <span className="text-label-sm font-bold text-on-surface-variant">{title}</span>}
      <div className={cn('grid gap-space-sm', columnClasses[columns], isSquare && 'gap-space-md')}>
        {photos.map((photo) => (
          <button
            key={photo.title}
            type="button"
            onClick={() => onSelectPhoto?.(photo)}
            className={cn(
              'group relative overflow-hidden rounded-xl bg-surface-container text-left shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-tertiary-container/30',
              isSquare ? 'aspect-square' : 'aspect-video',
            )}
          >
            <img
              src={photo.src}
              alt={photo.alt}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-on-background/90 via-on-background/25 to-transparent p-space-xs text-surface">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-label-sm font-bold">{photo.title}</span>
                {photo.verified && <Icon name="check_circle" className="shrink-0 text-[16px] text-primary-fixed" />}
              </div>
              <span className="truncate text-body-sm opacity-80">{photo.meta}</span>
            </div>
          </button>
        ))}

        {dropzones.map((dropzone) => (
          <button
            key={dropzone.title}
            type="button"
            onClick={() => onUpload?.(dropzone)}
            className={cn(
              'group flex flex-col items-center justify-center rounded-xl bg-surface-container-low p-space-md text-center transition-all hover:bg-surface-container focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-tertiary-container/30',
              isSquare && 'aspect-square gap-space-2xs p-space-sm',
              dropzoneVariant === 'dashed' && 'border-2 border-dashed border-outline-variant hover:border-primary',
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center rounded-full text-primary transition-transform group-hover:scale-110',
                isSquare ? 'h-12 w-12 bg-primary-fixed' : 'h-10 w-10 bg-surface-container-lowest shadow-sm',
              )}
            >
              <Icon name={dropzone.icon} className={isSquare ? 'text-[26px]' : 'text-[20px]'} />
            </div>
            <span
              className={cn(
                'font-bold text-on-surface transition-colors group-hover:text-primary',
                isSquare ? 'text-label-md' : 'mt-2 text-label-sm',
              )}
            >
              {dropzone.title}
            </span>
            <span className="text-body-sm text-on-surface-variant">{dropzone.hint}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
