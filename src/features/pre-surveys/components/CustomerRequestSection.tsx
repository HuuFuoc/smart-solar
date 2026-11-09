import { useState, type ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import type { Tone } from '@/components/common/ui/badge'

interface CustomerRequestSectionProps {
  title: string
  count: number
  tone: Tone
  description?: string
  defaultOpen?: boolean
  highlight?: boolean
  emptyMessage?: string
  children?: ReactNode
}

const TONE_STYLES: Record<Tone, { dot: string; countBadge: string }> = {
  danger: {
    dot: 'bg-danger',
    countBadge: 'bg-danger/15 text-danger border border-danger/30',
  },
  info: {
    dot: 'bg-info',
    countBadge: 'bg-info/15 text-info border border-info/30',
  },
  ok: {
    dot: 'bg-ok',
    countBadge: 'bg-ok/15 text-ok border border-ok/30',
  },
  neutral: {
    dot: 'bg-fg-3',
    countBadge: 'bg-surface-2 text-fg-2 border border-line',
  },
  warn: {
    dot: 'bg-warn',
    countBadge: 'bg-warn/15 text-warn border border-warn/30',
  },
  accent: {
    dot: 'bg-accent',
    countBadge: 'bg-accent-soft text-accent-fg border border-accent-line/30',
  },
}

export function CustomerRequestSection({
  title,
  count,
  tone,
  description,
  defaultOpen = true,
  highlight = false,
  emptyMessage,
  children,
}: CustomerRequestSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const styles = TONE_STYLES[tone] ?? TONE_STYLES.neutral

  return (
    <section
      className={`overflow-hidden rounded-xl border transition-all ${
        highlight
          ? 'border-amber-500/40 bg-surface-1 shadow-xs dark:border-amber-400/30'
          : 'border-line bg-surface-1 shadow-2xs'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-surface-2/40"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`} aria-hidden="true" />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-fg">{title}</h2>
              <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-micro font-semibold ${styles.countBadge}`}>
                {count}
              </span>
            </div>
            {description && <p className="mt-0.5 text-meta text-fg-3">{description}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-meta font-medium text-fg-3">
          <span className="hidden sm:inline">{open ? 'Thu gọn' : 'Mở rộng'}</span>
          <Icon
            name={open ? 'expand_less' : 'expand_more'}
            className="text-[20px] transition-transform"
          />
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-line/70 p-4">
          {count === 0 && emptyMessage ? (
            <p className="py-2 text-center text-meta italic text-fg-3">{emptyMessage}</p>
          ) : (
            children
          )}
        </div>
      )}
    </section>
  )
}

