import { Icon } from '@/components/common/stitch-ui/Icon'
import type { Tone } from '@/components/common/ui/badge'

interface RequestStatusBadgeProps {
  label: string
  tone: Tone
  className?: string
}

const TONE_MAP: Record<Tone, { bg: string; text: string; icon: string }> = {
  info: { bg: 'bg-info-soft text-info', text: 'text-info', icon: 'hourglass_top' },
  ok: { bg: 'bg-ok-soft text-ok', text: 'text-ok', icon: 'check_circle' },
  danger: { bg: 'bg-danger-soft text-danger', text: 'text-danger', icon: 'warning' },
  warn: { bg: 'bg-warn-soft text-warn', text: 'text-warn', icon: 'schedule' },
  neutral: { bg: 'bg-surface-2 text-fg-3', text: 'text-fg-3', icon: 'schedule' },
  accent: { bg: 'bg-accent-soft text-accent-fg', text: 'text-accent-fg', icon: 'star' },
}

export function RequestStatusBadge({ label, tone, className = '' }: RequestStatusBadgeProps) {
  const cfg = TONE_MAP[tone] ?? TONE_MAP.neutral
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.bg} ${className}`}
    >
      <Icon name={cfg.icon} className="text-[13px]" />
      <span>{label}</span>
    </span>
  )
}
