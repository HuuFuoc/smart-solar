import { Icon } from '@/components/common/stitch-ui/Icon'
import type { Tone } from '@/components/common/ui/badge'
import { cx } from '@/utils/cx'

export type StatusBadgeProps = {
  label: string
  tone?: Tone
  icon?: string
  size?: 'sm' | 'md'
  className?: string
}

const TONE_MAP: Record<Tone, { surface: string; defaultIcon: string }> = {
  accent: { surface: 'border-accent-line/35 bg-accent-soft text-accent-fg', defaultIcon: 'calendar_today' },
  ok: { surface: 'border-ok/25 bg-ok-soft text-ok', defaultIcon: 'check_circle' },
  neutral: { surface: 'border-line bg-surface-2 text-fg-2', defaultIcon: 'schedule' },
  info: { surface: 'border-info/25 bg-info-soft text-info', defaultIcon: 'hourglass_top' },
  warn: { surface: 'border-warn/30 bg-warn-soft text-warn', defaultIcon: 'schedule' },
  danger: { surface: 'border-danger/30 bg-danger-soft text-danger', defaultIcon: 'warning' },
}

const SIZE_MAP = {
  sm: 'px-2 py-0.5 text-[12px] leading-4 gap-1',
  md: 'px-2.5 py-1 text-meta leading-5 gap-1.5',
} as const

/** Nhãn trạng thái dạng pill có icon, dùng token màu hệ thống đạt tương phản AA. */
export function StatusBadge({ label, tone = 'neutral', icon, size = 'md', className }: StatusBadgeProps) {
  const cfg = TONE_MAP[tone] ?? TONE_MAP.neutral
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center rounded-full border font-medium whitespace-nowrap',
        cfg.surface,
        SIZE_MAP[size],
        className,
      )}
    >
      <Icon name={icon ?? cfg.defaultIcon} className={size === 'sm' ? 'text-[14px]' : 'text-[16px]'} aria-hidden />
      <span>{label}</span>
    </span>
  )
}
