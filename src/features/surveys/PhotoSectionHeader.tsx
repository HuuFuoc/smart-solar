import { Icon } from '@/components/common/stitch-ui/Icon'
import { StatusBadge } from '@/components/common/stitch-ui/StatusBadge'
import { cn } from '@/utils/cn'

/*
 * Hàng tiêu đề của từng nhóm ảnh trong survey_image_documentation:
 * ô icon 32px, tiêu đề + badge yêu cầu, mô tả, và số ảnh đã chụp ở mép phải.
 */
export type PhotoSectionIconTone = 'primary' | 'secondary' | 'tertiary' | 'neutral'
export type PhotoSectionRequirementTone = 'error' | 'success' | 'neutral'

export type PhotoSectionHeaderProps = {
  icon: string
  iconTone: PhotoSectionIconTone
  title: string
  description: string
  requirementLabel: string
  requirementTone: PhotoSectionRequirementTone
  countLabel: string
  /** Nhãn đếm đổi sang màu primary khi nhóm đã đủ ảnh */
  countFulfilled?: boolean
  className?: string
}

const iconToneClasses: Record<PhotoSectionIconTone, string> = {
  primary: 'bg-primary-container text-on-primary',
  secondary: 'bg-secondary text-on-secondary',
  tertiary: 'bg-tertiary-container text-on-tertiary',
  neutral: 'bg-surface-container-highest text-on-surface',
}

const requirementVariant = {
  error: 'error',
  success: 'success',
  neutral: 'neutral',
} as const

export function PhotoSectionHeader({
  icon,
  iconTone,
  title,
  description,
  requirementLabel,
  requirementTone,
  countLabel,
  countFulfilled = false,
  className,
}: PhotoSectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-space-sm', className)}>
      <div className="flex min-w-0 items-start gap-space-sm">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
            iconToneClasses[iconTone],
          )}
        >
          <Icon name={icon} className="text-[18px]" />
        </div>
        <div className="min-w-0">
          {/* Không flex-wrap: badge yêu cầu nằm cùng hàng với tiêu đề, tiêu đề tự xuống dòng */}
          <div className="flex items-center gap-space-xs">
            <h2 className="min-w-0 text-headline-md font-bold text-on-surface">{title}</h2>
            <StatusBadge
              variant={requirementVariant[requirementTone]}
              size="sm"
              dot={false}
              className={cn('shrink-0', requirementTone === 'success' && 'font-semibold')}
            >
              {requirementLabel}
            </StatusBadge>
          </div>
          <p className="text-body-sm text-on-surface-variant">{description}</p>
        </div>
      </div>
      <span
        className={cn(
          'shrink-0 text-label-sm font-semibold',
          countFulfilled ? 'text-primary' : 'text-on-surface-variant',
        )}
      >
        {countLabel}
      </span>
    </div>
  )
}
