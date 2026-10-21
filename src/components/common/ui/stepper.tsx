import { Icon } from '@/components/common/stitch-ui/Icon'
import { cx } from '@/utils/cx'

export type Step = { label: string; meta?: string; state: 'done' | 'active' | 'upcoming' }

// Thanh tiến độ: giai đoạn đã xong và đang làm tô màu chính, sắp tới thì nhạt
export function Stepper({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cx('grid gap-3 md:grid-flow-col md:auto-cols-fr md:gap-4', className)}>
      {steps.map((step) => (
        <li
          key={step.label}
          aria-current={step.state === 'active' ? 'step' : undefined}
          className={cx(
            'border-l-[3px] pl-3 md:border-t-[3px] md:border-l-0 md:pt-3 md:pl-0',
            step.state === 'upcoming' ? 'border-line' : 'border-accent',
          )}
        >
          <p
            className={cx(
              'flex items-center gap-1.5 text-body',
              step.state === 'upcoming' && 'text-fg-3',
              step.state === 'done' && 'text-fg-2',
              step.state === 'active' && 'font-semibold text-fg',
            )}
          >
            {step.state === 'done' && (
              <Icon name="check_circle" className="icon-fill shrink-0 text-[20px] text-accent-fg" />
            )}
            {step.label}
            {step.state === 'done' && <span className="sr-only"> (đã xong)</span>}
          </p>
          {step.meta && <p className="mt-1 text-meta text-fg-3">{step.meta}</p>}
        </li>
      ))}
    </ol>
  )
}
