import { useId, type ReactNode, type Ref } from 'react'
import { WizardProgress, type WizardStep } from '@/components/common/ui/wizard-steps'
import { cx } from '@/utils/cx'

type Props = {
  steps: WizardStep[]
  /** Vị trí bước đang mở, tính từ 0 */
  index: number
  hint?: string
  /** Tiêu đề bước nhận focus khi chuyển bước (từ useWizardStep) */
  headingRef: Ref<HTMLHeadingElement>
  /** Hàng nút của bước, dính đáy màn hình khi khung cao hơn màn hình */
  footer: ReactNode
  children: ReactNode
  className?: string
}

// Khung của một bước đánh giá sơ bộ: tiêu đề bước, câu hướng dẫn, nội dung, hàng nút
// Điện thoại: khung tràn mép màn hình, đầu khung có thanh tiến độ thay cho thanh các bước
export function AssessmentStepCard({ steps, index, hint, headingRef, footer, children, className }: Props) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className={cx('-mx-4 border-y border-line bg-canvas sm:mx-0 sm:rounded-container sm:border-x', className)}
    >
      <header className="border-b border-line px-4 pt-4 pb-4 sm:px-6 sm:pt-5">
        <h2 ref={headingRef} id={headingId} tabIndex={-1} className="text-title font-semibold outline-none">
          <span className="block text-meta font-normal text-fg-2">
            Bước {index + 1}/{steps.length}
          </span>
          {steps[index]?.label}
        </h2>
        {hint && <p className="mt-1 max-w-prose text-body text-fg-2">{hint}</p>}
        <WizardProgress steps={steps} className="mt-4 md:hidden" />
      </header>

      <div className="px-4 py-5 sm:px-6">{children}</div>

      {/* Bo theo góc dưới của khung để nền không đè lên viền */}
      <footer
        data-sticky-bottom
        className="sticky bottom-0 z-10 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:rounded-b-[calc(var(--radius-container)-1px)] sm:px-6"
      >
        {footer}
      </footer>
    </section>
  )
}
