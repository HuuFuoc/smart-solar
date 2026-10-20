import { Icon } from '@/components/common/stitch-ui/Icon'
import { cx } from '@/utils/cx'

export type WizardStep = {
  label: string
  state: 'done' | 'active' | 'upcoming'
  /** Một dòng tóm tắt điều đã nhập ở bước đã xong (vd. "30 x 15 m, 2 vật cản"). */
  summary?: string
  /** Có thì bước (đã xong) bấm được để quay lại sửa; không có thì chỉ hiển thị. */
  onSelect?: () => void
}

// Thanh các bước của form nhiều bước, bấm bước đã xong để quay lại
// Từ md: vòng số nối bằng đường. Điện thoại: khối gọn "Bước 3/5" + thanh tiến độ
export function WizardSteps({ steps, label, className }: { steps: WizardStep[]; label: string; className?: string }) {
  const activeIndex = steps.findIndex((s) => s.state === 'active')
  const current = steps[activeIndex]
  const next = steps[activeIndex + 1]

  return (
    <nav aria-label={label} className={className}>
      <ol className="hidden md:flex">
        {steps.map((step, i) => {
          const reached = step.state !== 'upcoming'
          const content = (
            <>
              <span
                aria-hidden
                className={cx(
                  'tnum relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-body font-semibold',
                  step.state === 'upcoming' ? 'border border-line-2 bg-canvas text-fg-3' : 'bg-accent text-on-accent',
                  step.state === 'active' && 'ring-4 ring-accent-soft',
                )}
              >
                {step.state === 'done' ? <Icon name="check" className="text-[20px]" /> : i + 1}
              </span>
              <span
                className={cx(
                  'mt-2 block text-body text-balance',
                  step.state === 'active' && 'font-semibold text-fg',
                  step.state === 'done' && 'text-fg',
                  step.state === 'upcoming' && 'text-fg-3',
                  step.onSelect && 'underline-offset-4 group-hover:underline',
                )}
              >
                <span className="sr-only">Bước {i + 1}: </span>
                {step.label}
                {step.state === 'done' && <span className="sr-only">, đã xong</span>}
              </span>
              {(step.summary || step.state === 'active') && (
                <span
                  className={cx(
                    'mt-0.5 block text-meta line-clamp-2',
                    step.state === 'active' ? 'text-accent-fg' : 'text-fg-3',
                  )}
                >
                  {step.state === 'active' ? 'Đang làm' : step.summary}
                </span>
              )}
            </>
          )
          return (
            <li
              key={step.label}
              aria-current={step.state === 'active' ? 'step' : undefined}
              className="relative min-w-0 flex-1 px-2 text-center"
            >
              {i < steps.length - 1 && (
                // Đường nối từ mép vòng này sang mép vòng sau (tâm vòng ở giữa cột, vòng rộng 2rem).
                <span
                  aria-hidden
                  className={cx(
                    'absolute top-4 left-[calc(50%+1.5rem)] h-0.5 w-[calc(100%-3rem)] -translate-y-1/2',
                    steps[i + 1]!.state !== 'upcoming' ? 'bg-accent' : 'bg-line-2',
                  )}
                />
              )}
              {step.onSelect && reached ? (
                <button
                  type="button"
                  onClick={step.onSelect}
                  className="group flex w-full flex-col items-center rounded-control pb-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {content}
                  <span className="sr-only">. Bấm để quay lại sửa.</span>
                </button>
              ) : (
                <div className="flex flex-col items-center pb-1">{content}</div>
              )}
            </li>
          )
        })}
      </ol>

      {current && (
        <div className="md:hidden">
          <p className="text-body text-fg-2">
            Bước {activeIndex + 1}/{steps.length}: <span className="font-semibold text-fg">{current.label}</span>
          </p>
          <div
            aria-hidden
            className="mt-2 grid gap-1"
            style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
          >
            {steps.map((step) => (
              <span
                key={step.label}
                className={cx('h-1.5 rounded-control', step.state === 'upcoming' ? 'bg-line' : 'bg-accent')}
              />
            ))}
          </div>
          {next && <p className="mt-2 text-meta text-fg-3">Tiếp theo: {next.label}</p>}
        </div>
      )}
    </nav>
  )
}
