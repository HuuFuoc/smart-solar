import { cx } from '@/utils/cx'
import { workflow } from '@/data/landing'
import { Reveal } from './reveal'
import { Section, SectionTitle } from './section'

// Quy trình bốn bước, nối bằng đường kẻ dọc trên điện thoại và ngang từ lg
// Màu trung tính vì đây là thứ tự các bước, không phải tiến độ
export function WorkflowSection() {
  return (
    <Section id={workflow.id} space="far" titleId="workflow-title">
      <Reveal>
        <SectionTitle id="workflow-title">{workflow.title}</SectionTitle>
      </Reveal>
      <ol className="mt-10 grid gap-y-8 lg:mt-14 lg:grid-cols-4 lg:gap-x-6">
        {workflow.steps.map((step, i) => (
          <li key={step.title}>
            <Reveal
              delay={110 * i}
              className={cx(
                'relative h-full pl-16 lg:pt-16 lg:pl-0',
                // Đường nối tới bước sau, cách mỗi điểm mốc 16px
                i < workflow.steps.length - 1 &&
                  'after:absolute after:top-14 after:-bottom-4 after:left-5 after:w-px after:bg-line-2 after:content-[""] lg:after:top-5 lg:after:-right-2 lg:after:bottom-auto lg:after:left-14 lg:after:h-px lg:after:w-auto',
              )}
            >
              <span
                aria-hidden
                className="absolute top-0 left-0 flex size-10 items-center justify-center rounded-full border border-line-2 bg-surface-2 ld-action text-fg tnum"
              >
                {i + 1}
              </span>
              <h3 className="ld-sub text-fg">{step.title}</h3>
              <p className="mt-2 max-w-copy ld-body text-pretty text-fg-2">{step.text}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  )
}
