import type { CSSProperties } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

// Stepper ngang, mỗi giai đoạn là một ô
export type TimelineStepState = 'done' | 'current' | 'upcoming'

export type TimelineStepProps = {
  /** Số thứ tự 1-based, hiển thị "Stage 01" */
  index: number
  title: string
  description?: string
  timestamp?: string
  state: TimelineStepState
  /** Thay nhãn "Stage 0N" */
  stageLabel?: string
  /** Thay icon mặc định của state */
  icon?: string
}

const stateClasses: Record<
  TimelineStepState,
  { box: string; iconBox: string; icon: string; stage: string; title: string; text: string }
> = {
  done: {
    box: 'bg-surface-container-low',
    iconBox: 'bg-primary text-on-primary',
    icon: 'check',
    stage: 'text-surface-tint',
    title: 'text-on-surface',
    text: 'text-on-surface-variant',
  },
  current: {
    box: 'bg-primary-container text-on-primary shadow-level-2',
    iconBox: 'bg-surface-container-lowest text-primary',
    icon: 'verified',
    stage: 'text-primary-fixed',
    title: 'text-on-primary',
    text: 'text-primary-fixed',
  },
  upcoming: {
    box: 'bg-surface-container-low',
    iconBox: 'bg-surface-container-highest text-outline',
    icon: 'radio_button_unchecked',
    stage: 'text-outline',
    title: 'text-on-surface-variant',
    text: 'text-outline',
  },
}

export function TimelineStep({ index, title, description, timestamp, state, stageLabel, icon }: TimelineStepProps) {
  const s = stateClasses[state]
  return (
    <li
      aria-current={state === 'current' ? 'step' : undefined}
      className={cn('relative flex flex-col gap-space-xs rounded-xl p-space-sm', s.box)}
    >
      <div className="flex items-center justify-between">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', s.iconBox)}>
          <Icon name={icon ?? s.icon} className="text-[16px]" />
        </div>
        <span className={cn('text-label-sm font-bold', s.stage)}>
          {stageLabel ?? `Giai đoạn ${String(index).padStart(2, '0')}`}
        </span>
      </div>
      <span className={cn('text-label-lg font-bold', s.title)}>{title}</span>
      {description && <p className={cn('text-body-sm leading-tight', s.text)}>{description}</p>}
      {timestamp && <span className={cn('mt-1 text-label-sm', s.text)}>{timestamp}</span>}
    </li>
  )
}

export type TimelineProps = {
  steps: Omit<TimelineStepProps, 'index'>[]
  className?: string
}

/** Xếp dọc trên mobile, từ md trở lên chia đều theo số bước. */
export function Timeline({ steps, className }: TimelineProps) {
  return (
    <ol
      className={cn(
        'grid grid-cols-1 gap-space-sm md:[grid-template-columns:repeat(var(--steps),minmax(0,1fr))]',
        className,
      )}
      style={{ '--steps': steps.length } as CSSProperties}
    >
      {steps.map((step, i) => (
        <TimelineStep key={`${i}-${step.title}`} index={i + 1} {...step} />
      ))}
    </ol>
  )
}
