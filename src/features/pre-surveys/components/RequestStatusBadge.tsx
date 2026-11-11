import type { Tone } from '@/components/common/ui/badge'
import { StatusBadge } from '@/features/pre-surveys/components/StatusBadge'

interface RequestStatusBadgeProps {
  label: string
  tone: Tone
  className?: string
}

export function RequestStatusBadge({ label, tone, className = '' }: RequestStatusBadgeProps) {
  return <StatusBadge label={label} tone={tone} size="sm" className={className} />
}
