import { Icon } from '@/components/common/stitch-ui/Icon'
import type { Tone } from '@/components/common/ui/badge'

interface RequestStatusBadgeProps {
  label: string
  tone: Tone
  className?: string
}

const TONE_CONFIG: Record<Tone, { bg: string; text: string; border: string; icon: string }> = {
  danger: {
    bg: 'bg-danger-soft/80',
    text: 'text-danger font-semibold',
    border: 'border-danger/30',
    icon: 'warning',
  },
  info: {
    bg: 'bg-info-soft/80',
    text: 'text-info font-semibold',
    border: 'border-info/30',
    icon: 'hourglass_top',
  },
  ok: {
    bg: 'bg-ok-soft/80',
    text: 'text-ok font-semibold',
    border: 'border-ok/30',
    icon: 'check_circle',
  },
  neutral: {
    bg: 'bg-surface-2',
    text: 'text-fg-2 font-medium',
    border: 'border-line',
    icon: 'schedule',
  },
  warn: {
    bg: 'bg-warn-soft/80',
    text: 'text-warn font-semibold',
    border: 'border-warn/30',
    icon: 'schedule',
  },
  accent: {
    bg: 'bg-accent-soft/80',
    text: 'text-accent-fg font-semibold',
    border: 'border-accent-line/30',
    icon: 'star',
  },
}

export function RequestStatusBadge({ label, tone, className = '' }: RequestStatusBadgeProps) {
  const cfg = TONE_CONFIG[tone] ?? TONE_CONFIG.neutral
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${cfg.bg} ${cfg.border} ${cfg.text} ${className}`}
    >
      <Icon name={cfg.icon} className="text-[14px]" />
      <span>{label}</span>
    </span>
  )
}

