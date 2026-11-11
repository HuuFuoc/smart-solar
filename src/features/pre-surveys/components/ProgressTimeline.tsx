import { useId, useState } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cx } from '@/utils/cx'

export type ProgressStepState = 'done' | 'current' | 'todo'

export type ProgressStep = {
  label: string
  detail?: string
  state: ProgressStepState
}

function summarizeSteps(steps: ProgressStep[]) {
  const currentIdx = steps.findIndex((s) => s.state === 'current')
  if (currentIdx !== -1) {
    return `Bước ${currentIdx + 1}/${steps.length} · ${steps[currentIdx]!.label}`
  }
  const doneCount = steps.filter((s) => s.state === 'done').length
  if (doneCount === steps.length && steps.length > 0) {
    return `${doneCount}/${steps.length} · Hoàn tất`
  }
  return `${doneCount}/${steps.length} bước đã qua`
}

function TimelineSteps({ steps }: { steps: ProgressStep[] }) {
  return (
    <ol>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        return (
          <li key={step.label} className={cx('relative flex gap-3', !isLast && 'pb-4')}>
            {!isLast && (
              <span
                aria-hidden
                className={cx(
                  'absolute top-6 bottom-0 left-3 w-px -translate-x-1/2',
                  step.state === 'done' ? 'bg-accent-line/55' : 'bg-line',
                )}
              />
            )}

            <span
              aria-hidden
              className={cx(
                'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full',
                step.state === 'done' && 'border border-ok/25 bg-ok-soft text-ok',
                step.state === 'current' && 'bg-accent text-on-accent ring-4 ring-accent-soft',
                step.state === 'todo' && 'border border-line-2 bg-canvas text-fg-3',
              )}
            >
              {step.state === 'done' ? (
                <Icon name="check" className="text-[15px]" />
              ) : step.state === 'current' ? (
                <span className="size-2 rounded-full bg-on-accent" />
              ) : (
                <span className="size-1.5 rounded-full bg-fg-3/50" />
              )}
            </span>

            <div className="min-w-0 pt-0.5">
              <p
                className={cx(
                  'text-body leading-5',
                  step.state === 'done' && 'font-medium text-fg',
                  step.state === 'current' && 'font-semibold text-accent-fg',
                  step.state === 'todo' && 'text-fg-2',
                )}
              >
                {step.label}
                <span className="sr-only">
                  {step.state === 'done' ? ', đã xong' : step.state === 'current' ? ', bước hiện tại' : ', chưa tới'}
                </span>
              </p>
              {step.detail && <p className="tnum mt-0.5 text-meta text-fg-2">{step.detail}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Cột Tiến độ gọn nhẹ: desktop hiển thị đầy đủ; mobile thu gọn kèm thanh stepper nhanh. */
export function ProgressTimeline({ steps, title = 'Tiến độ' }: { steps: ProgressStep[]; title?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const listId = useId()
  const summary = summarizeSteps(steps)

  return (
    <section aria-labelledby={`${listId}-heading`}>
      {/* Tiêu đề cố định trên desktop */}
      <div className="mb-3 hidden items-center justify-between gap-2 lg:flex">
        <h2 id={`${listId}-heading`} className="text-title font-semibold text-fg">
          {title}
        </h2>
      </div>

      {/* Thanh thu gọn + stepper gọn cho mobile/tablet (< lg) */}
      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls={listId}
          onClick={() => setMobileOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 rounded-control py-1 text-left transition-colors hover:text-accent-fg"
        >
          <div className="min-w-0">
            <span className="text-title font-semibold text-fg">{title}</span>
            <p className="mt-0.5 truncate text-meta text-fg-2">{summary}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-control px-2 py-1 text-meta font-medium text-fg-2">
            <span>{mobileOpen ? 'Thu gọn' : 'Chi tiết'}</span>
            <Icon name={mobileOpen ? 'expand_less' : 'expand_more'} className="text-[18px]" aria-hidden />
          </span>
        </button>

        {!mobileOpen && (
          <div aria-hidden className="mt-3 flex gap-1.5">
            {steps.map((step) => (
              <span
                key={step.label}
                className={cx(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  step.state === 'done' && 'bg-ok/65',
                  step.state === 'current' && 'bg-accent',
                  step.state === 'todo' && 'bg-line',
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div id={listId} className={cx('mt-3 lg:mt-0 lg:block', mobileOpen ? 'block' : 'hidden')}>
        <TimelineSteps steps={steps} />
      </div>
    </section>
  )
}
