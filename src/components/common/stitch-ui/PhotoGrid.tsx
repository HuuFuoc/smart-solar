import type { ReactNode } from 'react'
import { Button } from '@/components/common/stitch-ui/Button'
import { Card } from '@/components/common/stitch-ui/Card'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

// Lưới ảnh có tag, giờ, GPS, ghi chú và ô thêm ảnh
export type PhotoCardProps = {
  src: string
  alt: string
  /** Nhãn góc trái trên ảnh, ví dụ "South Face" */
  tag?: { label: string; icon?: string }
  time?: string
  gpsTagged?: boolean
  title: string
  note?: string
  onNoteChange?: (note: string) => void
  onZoom?: () => void
  onReplace?: () => void
  className?: string
}

const overlayButton =
  'flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-lowest/90 text-on-surface shadow-sm backdrop-blur-md transition-all hover:bg-surface-container-lowest'

export function PhotoCard({
  src,
  alt,
  tag,
  time,
  gpsTagged = false,
  title,
  note,
  onNoteChange,
  onZoom,
  onReplace,
  className,
}: PhotoCardProps) {
  return (
    <Card padding="sm" interactive className={cn('group flex flex-col gap-space-xs', className)}>
      <div className="relative h-44 w-full overflow-hidden rounded-xl bg-surface-container">
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {tag && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-on-background/70 px-2 py-0.5 text-label-sm text-surface backdrop-blur-md">
            <Icon name={tag.icon ?? 'verified'} className="text-[12px] text-primary-fixed" />
            <span>{tag.label}</span>
          </div>
        )}
        {(onZoom || onReplace) && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            {onZoom && (
              <button
                type="button"
                aria-label="Phóng to"
                onClick={onZoom}
                className={cn(overlayButton, 'hover:text-primary')}
              >
                <Icon name="zoom_in" className="text-[18px]" />
              </button>
            )}
            {onReplace && (
              <button
                type="button"
                aria-label="Thay ảnh"
                onClick={onReplace}
                className={cn(overlayButton, 'hover:text-secondary')}
              >
                <Icon name="swap_horiz" className="text-[18px]" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 px-1 pt-1">
        {(time || gpsTagged) && (
          <div className="flex items-center justify-between text-label-sm text-on-surface-variant">
            {time && (
              <span className="flex items-center gap-0.5">
                <Icon name="schedule" className="text-[14px]" /> {time}
              </span>
            )}
            {gpsTagged && (
              <span className="flex items-center gap-0.5 font-medium text-primary">
                <Icon name="pin_drop" className="text-[14px]" /> GPS Tagged
              </span>
            )}
          </div>
        )}
        <span className="truncate text-label-md font-semibold text-on-surface">{title}</span>
        {note !== undefined && (
          <input
            type="text"
            value={note}
            readOnly={!onNoteChange}
            onChange={(e) => onNoteChange?.(e.target.value)}
            aria-label={`Ghi chú cho ${title}`}
            className="h-8 w-full rounded-lg bg-surface-container-low px-2 text-body-sm text-on-surface focus:bg-surface-container-lowest focus:outline-none"
          />
        )}
      </div>
    </Card>
  )
}

export type PhotoDropzoneProps = {
  icon?: string
  title: string
  /** Dòng đỏ khi còn ảnh bắt buộc, ví dụ "1 mandatory angle needed" */
  requirement?: string
  required?: boolean
  hint?: string
  actionLabel?: string
  /** Icon trong nút hành động: upload_file cho ô bắt buộc, add_circle/add cho ô tuỳ chọn */
  actionIcon?: string
  onSelect?: () => void
  className?: string
}

export function PhotoDropzone({
  icon = 'add_a_photo',
  title,
  requirement,
  required = false,
  hint,
  actionLabel = 'Chọn tệp',
  actionIcon,
  onSelect,
  className,
}: PhotoDropzoneProps) {
  return (
    <Card
      padding="md"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.()
        }
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-space-xs text-center transition-all',
        required ? 'hover:bg-surface-container-low' : 'bg-surface-container-low hover:bg-surface-container',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full',
          required
            ? 'bg-error-container text-on-error-container'
            : 'bg-surface-container-lowest text-on-surface-variant shadow-sm',
        )}
      >
        <Icon name={icon} className="text-[24px]" />
      </div>
      <div className="flex flex-col">
        <span className="text-label-md font-bold text-on-surface">{title}</span>
        {requirement && (
          <span className={cn('text-body-sm font-semibold', required ? 'text-error' : 'text-on-surface-variant')}>
            {requirement}
          </span>
        )}
        {hint && <span className="mt-1 text-label-sm text-on-surface-variant">{hint}</span>}
      </div>
      <Button
        size="sm"
        variant={required ? 'primary' : 'tonal'}
        iconLeft={actionIcon ?? 'upload_file'}
        className={cn('mt-2', !required && 'text-on-surface hover:bg-surface-container-high')}
        onClick={(e) => {
          e.stopPropagation()
          onSelect?.()
        }}
      >
        {actionLabel}
      </Button>
    </Card>
  )
}

export type PhotoGridProps = {
  columns?: 2 | 3 | 4
  children: ReactNode
  className?: string
}

const columnClasses = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
} as const

export function PhotoGrid({ columns = 3, children, className }: PhotoGridProps) {
  return <div className={cn('grid grid-cols-1 gap-space-md', columnClasses[columns], className)}>{children}</div>
}
