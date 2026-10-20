import { Icon, ProgressBar } from '@/components/common/stitch-ui'
import { cn } from '@/utils/cn'

// Thẻ số đo: nhãn, ngưỡng, giá trị và thanh so ngưỡng. Đo trượt ngưỡng thì tô đỏ
export type MeasurementReading = {
  label: string
  /** Ngưỡng bên phải nhãn, ví dụ "Target: 405-418 V" */
  target?: string
  value: string
  unit: string
  /** Cỡ giá trị: metric = 36px (số đo), headline = 32px (">100") */
  valueSize?: 'metric' | 'headline'
  verdict: { label: string; icon?: string }
  /** Vị trí trong dải mục tiêu, 0-100; bỏ trống thì không có thanh */
  scale?: number
  /** Icon trước nhãn (warranty_request) */
  icon?: string
  /** error = thẻ đỏ cho phép đo trượt ngưỡng */
  tone?: 'default' | 'error'
  /** Hai chú thích dưới giá trị: chuẩn bên trái, kết luận bên phải */
  footer?: { left: string; right: string }
}

export function MeasurementCard({
  label,
  target,
  value,
  unit,
  valueSize = 'metric',
  verdict,
  scale,
  icon,
  tone = 'default',
  footer,
}: MeasurementReading) {
  const isError = tone === 'error'

  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-xl p-space-sm',
        isError ? 'bg-error-container/40 p-space-md' : 'bg-surface-container-low',
      )}
    >
      <div className="flex items-center justify-between gap-space-xs">
        <span
          className={cn(
            'flex items-center gap-space-xs',
            isError
              ? 'text-label-md font-bold text-error'
              : icon
                ? 'text-label-md font-bold text-on-surface'
                : 'text-label-sm font-semibold text-on-surface-variant',
          )}
        >
          {icon && <Icon name={icon} className={cn('text-[20px]', isError ? 'text-error' : 'text-primary')} />}
          {label}
        </span>
        {target && <span className="shrink-0 text-label-sm font-bold text-primary">{target}</span>}
        {!target && (
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-label-sm',
              isError ? 'bg-error font-bold text-on-error' : 'bg-surface-container-highest font-semibold text-primary',
            )}
          >
            {verdict.label}
          </span>
        )}
      </div>

      <div className={cn('flex items-baseline gap-space-xs', footer ? 'my-space-sm justify-start' : 'justify-between')}>
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              'font-bold',
              valueSize === 'metric' ? 'text-data-metric' : 'text-headline-xl',
              isError ? 'text-error' : valueSize === 'metric' ? 'text-on-surface' : 'text-primary',
            )}
          >
            {value}
          </span>
          <span
            className={cn(
              'font-semibold',
              footer ? 'text-body-md' : 'text-label-lg',
              isError ? 'text-error' : 'text-on-surface-variant',
            )}
          >
            {unit}
          </span>
        </div>
        {target && (
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-primary-container px-2 py-0.5 text-label-sm font-bold text-on-primary">
            {verdict.icon && <Icon name={verdict.icon} className="text-[14px]" />}
            {verdict.label}
          </span>
        )}
      </div>

      {footer && (
        <div
          className={cn(
            'flex items-center justify-between gap-space-xs text-label-sm',
            isError ? 'text-error' : 'text-on-surface-variant',
          )}
        >
          <span>{footer.left}</span>
          <span className={isError ? 'font-bold' : 'font-semibold text-primary'}>{footer.right}</span>
        </div>
      )}

      {scale !== undefined && (
        <ProgressBar
          value={scale}
          size="sm"
          tone={isError ? 'error' : 'primary'}
          label={label}
          className={cn('mt-1', footer && 'mt-2 h-2')}
        />
      )}
    </div>
  )
}
