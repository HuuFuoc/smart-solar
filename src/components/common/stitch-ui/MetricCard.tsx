import type { ReactNode } from 'react'
import { Card } from '@/components/common/stitch-ui/Card'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

// Ba kiểu thẻ KPI: stacked (delta dưới giá trị), inline (delta cạnh giá trị), compact (thẻ ngang có icon)
export type MetricTone = 'primary' | 'secondary' | 'tertiary' | 'error' | 'muted'
export type MetricLayout = 'stacked' | 'inline' | 'compact'

const iconToneClasses: Record<MetricTone, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  tertiary: 'text-tertiary-container',
  error: 'text-error',
  muted: 'text-outline',
}

const valueToneClasses: Record<'default' | MetricTone, string> = {
  default: 'text-on-surface',
  primary: 'text-primary',
  secondary: 'text-secondary',
  tertiary: 'text-tertiary-container',
  error: 'text-error',
  muted: 'text-on-surface-variant',
}

const labelToneClasses: Record<MetricTone, string> = {
  primary: 'font-bold text-primary',
  secondary: 'font-bold text-secondary',
  tertiary: 'font-bold text-tertiary-container',
  error: 'font-bold text-error',
  muted: 'text-outline',
}

export type MetricDelta = {
  text: string
  /** Quyết định icon: up/down có mũi tên, flat không icon */
  direction?: 'up' | 'down' | 'flat'
  /** Màu chữ; mặc định suy từ direction (up = positive, down = negative, flat = neutral) */
  tone?: 'positive' | 'negative' | 'neutral'
  /** Thay icon mặc định */
  icon?: string
  /** Chấm ping/pulse thay icon (số liệu realtime) */
  live?: boolean
}

export type MetricCardProps = {
  label: string
  value: ReactNode
  icon: string
  tone?: MetricTone
  /** Màu nhãn; mặc định theo layout */
  labelTone?: 'default' | MetricTone
  valueTone?: 'default' | MetricTone
  /** metric: số lớn, headline: giá trị dạng chữ */
  valueSize?: 'metric' | 'headline'
  delta?: MetricDelta
  description?: string
  descriptionTone?: 'default' | 'muted'
  layout?: MetricLayout
  /** Slot dưới cùng: chip phân bố, progress... (stacked / inline) */
  children?: ReactNode
  className?: string
}

const deltaToneClasses = {
  positive: 'text-tertiary-container font-semibold',
  negative: 'text-error font-semibold',
  neutral: 'text-on-surface-variant',
} as const

const deltaIcons = {
  stacked: { up: 'trending_up', down: 'trending_down' },
  inline: { up: 'arrow_upward', down: 'arrow_downward' },
  compact: { up: 'trending_up', down: 'trending_down' },
} as const

export function MetricCard({
  label,
  value,
  icon,
  tone = 'primary',
  labelTone = 'default',
  valueTone = 'default',
  valueSize = 'metric',
  delta,
  description,
  descriptionTone = 'default',
  layout = 'stacked',
  children,
  className,
}: MetricCardProps) {
  const direction = delta?.direction ?? 'flat'
  const deltaTone = delta?.tone ?? (direction === 'up' ? 'positive' : direction === 'down' ? 'negative' : 'neutral')
  const deltaIcon = delta?.icon ?? (direction === 'flat' ? undefined : deltaIcons[layout][direction])

  if (layout === 'compact') {
    return (
      <Card padding="md" className={cn('flex items-center justify-between gap-space-sm', className)}>
        <div className="flex min-w-0 flex-col">
          <span className={cn('text-label-sm', labelTone === 'default' ? 'text-outline' : labelToneClasses[labelTone])}>
            {label}
          </span>
          <span className={cn('mt-1 text-headline-lg font-bold', valueToneClasses[valueTone])}>{value}</span>
          {delta ? (
            <span className="mt-0.5 flex items-center gap-1 text-body-sm text-on-surface-variant">
              {delta.live ? (
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-tertiary-container" />
              ) : (
                deltaIcon && <Icon name={deltaIcon} className={cn('text-[16px]', deltaToneClasses[deltaTone])} />
              )}
              <span>{delta.text}</span>
            </span>
          ) : (
            description && (
              <span
                className={cn('text-body-sm', descriptionTone === 'muted' ? 'text-outline' : 'text-on-surface-variant')}
              >
                {description}
              </span>
            )
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container-low',
            iconToneClasses[tone],
          )}
        >
          <Icon name={icon} className="text-[24px]" />
        </div>
      </Card>
    )
  }

  const inline = layout === 'inline'

  const deltaNode = delta && (
    <span
      className={cn(
        'flex items-center gap-1 text-label-sm',
        deltaToneClasses[deltaTone],
        inline && 'font-semibold',
        !inline && 'mt-1 gap-1.5',
      )}
    >
      {delta.live ? (
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-tertiary-container" />
      ) : (
        deltaIcon && <Icon name={deltaIcon} className={inline ? 'text-[14px]' : 'text-[16px]'} />
      )}
      <span>{delta.text}</span>
    </span>
  )

  const valueNode = (
    <span
      className={cn(
        valueSize === 'metric' ? 'text-data-metric tracking-tight' : 'text-headline-lg leading-tight',
        inline && valueSize === 'metric' && 'leading-none',
        valueToneClasses[valueTone],
      )}
    >
      {value}
    </span>
  )

  const labelClasses =
    labelTone === 'default'
      ? inline
        ? 'text-label-md font-semibold text-on-surface-variant'
        : 'text-label-sm text-outline'
      : cn(inline ? 'text-label-md' : 'text-label-sm', labelToneClasses[labelTone])

  return (
    <Card interactive className={cn('relative flex flex-col justify-between overflow-hidden', className)}>
      <div>
        <div className={cn(inline && 'mb-space-xs')}>
          <span className={labelClasses}>{label}</span>
        </div>

        {inline ? (
          <>
            <div className="mb-space-xs flex items-baseline gap-space-xs">
              {valueNode}
              {deltaNode}
            </div>
            {description && <p className="mb-space-md text-body-sm text-outline">{description}</p>}
          </>
        ) : (
          <div className="mt-space-md">
            <div>{valueNode}</div>
            {deltaNode}
            {description && (
              <p
                className={cn(
                  'mt-1 text-body-sm',
                  descriptionTone === 'muted' ? 'text-outline' : 'text-on-surface-variant',
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}
      </div>

      {children && <div className={cn(!inline && 'mt-space-md')}>{children}</div>}
    </Card>
  )
}
