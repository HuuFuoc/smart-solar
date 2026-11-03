import type { ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { cx } from '@/utils/cx'

export type TrackerStep = {
  label: string
  /** Giờ hoặc người của bước, vd. "08:34 21/10/2026", "Ky Su Du An" */
  detail?: string
  state: 'done' | 'current' | 'todo'
}

export type TrackerNext = {
  /** danger: người đang xem phải làm; info: đang chờ người khác; ok: đã ổn; neutral: không còn gì để làm */
  tone: 'danger' | 'info' | 'ok' | 'warn' | 'neutral'
  title: string
  body?: ReactNode
  /** Nút làm việc tiếp theo: cuộn tới khối có id `target` và đặt con trỏ vào ô đầu tiên */
  action?: { label: string; icon: string; target: string }
}

function goTo(target: string) {
  const block = document.getElementById(target)
  if (!block) return
  block.scrollIntoView({ behavior: 'smooth', block: 'start' })
  block.querySelector<HTMLElement>('input, textarea, select, button')?.focus({ preventScroll: true })
}

// Khối "Tình hình" ở đầu trang chi tiết: các bước của yêu cầu và việc tiếp theo là của ai.
// Từ sm các bước nằm ngang nối bằng đường; điện thoại thì xếp dọc
export function ProgressTracker({
  steps,
  next,
  title = 'Tình hình',
}: {
  steps: TrackerStep[]
  next: TrackerNext
  title?: string
}) {
  return (
    <Panel>
      <PanelHeader title={title} />
      <PanelBody className="space-y-5">
        <ol className="grid gap-4 sm:gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((step, i) => (
            <li key={step.label} className="relative min-w-0 max-sm:col-span-full max-sm:flex max-sm:gap-3">
              {/* Đường nối tới bước sau, chỉ khi các bước nằm ngang */}
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cx(
                    'absolute top-4 left-8 hidden h-0.5 w-[calc(100%-2rem)] sm:block',
                    step.state === 'done' ? 'bg-accent' : 'bg-line',
                  )}
                />
              )}
              <span
                aria-hidden
                className={cx(
                  'tnum relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-body font-semibold',
                  step.state === 'done' && 'bg-accent text-on-accent',
                  step.state === 'current' && 'border-2 border-accent bg-canvas text-accent-fg ring-4 ring-accent-soft',
                  step.state === 'todo' && 'border border-line-2 bg-canvas text-fg-3',
                )}
              >
                {step.state === 'done' ? <Icon name="check" className="text-[20px]" /> : i + 1}
              </span>
              <span className="block min-w-0 sm:mt-2 sm:pr-3">
                <span className={cx('block text-body', step.state === 'todo' ? 'text-fg-2' : 'font-semibold text-fg')}>
                  {step.label}
                  <span className="sr-only">
                    {step.state === 'done' ? ', đã xong' : step.state === 'current' ? ', đang ở bước này' : ''}
                  </span>
                </span>
                {step.detail && <span className="tnum mt-0.5 block text-meta text-fg-2">{step.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
        <Notice tone={next.tone} title={next.title}>
          {next.body}
          {next.action && (
            <div className="mt-3">
              <Button size="sm" variant="primary" icon={next.action.icon} onClick={() => goTo(next.action!.target)}>
                {next.action.label}
              </Button>
            </div>
          )}
        </Notice>
      </PanelBody>
    </Panel>
  )
}
