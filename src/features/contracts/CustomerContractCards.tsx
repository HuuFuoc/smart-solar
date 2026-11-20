import type { ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge, type Tone } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import type { TrackerNext, TrackerStep } from '@/components/common/ui/progress-tracker'
import { parseTerms } from '@/features/contracts/contractTerms'
import { goToBlock } from '@/features/contracts/goToBlock'
import { openAssistant } from '@/features/chat/openAssistant'
import { cx } from '@/utils/cx'

// Các khối kiểu thẻ của trang hợp đồng phía khách (/customer/contracts/:id), theo thiết kế 19/11/2026. Kiểu ở contract-detail.css,
// chỉ có hiệu lực trong `.ct-page`

/** Thẻ trắng bo góc bọc một Panel; Panel không vẽ gì thì thẻ ẩn theo */
export function ContractCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('ct-card', className)}>{children}</div>
}

/** Tiêu đề khối IN HOA, có icon hoặc chấm trạng thái, kẻ ngăn bên dưới nếu `rule` */
export function CardHeading({
  id,
  icon,
  iconClass = 'text-accent-fg',
  dot,
  rule,
  children,
}: {
  id?: string
  icon?: string
  iconClass?: string
  dot?: Tone
  rule?: boolean
  children: ReactNode
}) {
  return (
    <h2
      id={id}
      className={cx(
        'ct-eyebrow ct-eyebrow-lg flex items-center gap-2 text-fg',
        rule && 'mb-4 border-b border-line pb-3',
      )}
    >
      {icon && <Icon name={icon} className={cx('text-[20px]', iconClass)} />}
      {children}
      {dot && <span className="ct-dot" data-tone={dot} aria-hidden />}
    </h2>
  )
}

const CALLOUT_ICONS: Record<TrackerNext['tone'], string> = {
  ok: 'check_circle',
  info: 'info',
  warn: 'warning',
  danger: 'error',
  neutral: 'info',
}

/** Thẻ thông báo lớn có ô icon (việc tiếp theo, khoản tiền đến hạn…). `action`: nút đặt dưới nội dung */
export function CalloutCard({
  tone,
  title,
  children,
  action,
}: {
  tone: TrackerNext['tone']
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="ct-callout flex gap-4 p-4 sm:px-5" data-tone={tone}>
      <span aria-hidden className="ct-callout-icon flex size-10 shrink-0 items-center justify-center">
        <Icon name={CALLOUT_ICONS[tone]} className="text-[24px]" />
      </span>
      <div className="min-w-0 self-center">
        <p className="text-body font-semibold text-fg">{title}</p>
        {children && <div className="mt-0.5 text-meta text-fg-2">{children}</div>}
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  )
}

/** Khối Tình hình kiểu thẻ: các bước căn giữa nối bằng đường, tiêu đề IN HOA có chấm trạng thái. Việc tiếp theo nằm ở CalloutCard */
export function StepsCard({ steps, title = 'Tình hình thực hiện' }: { steps: TrackerStep[]; title?: string }) {
  const allDone = steps.length > 0 && steps.every((s) => s.state === 'done')
  return (
    <section aria-label={title}>
      <CardHeading dot={allDone ? 'ok' : steps.some((s) => s.state === 'current') ? 'info' : undefined}>
        {title}
      </CardHeading>
      <ol
        className="mt-6 grid gap-4 sm:gap-0"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((step, i) => (
          <li
            key={step.label}
            className="relative min-w-0 max-sm:col-span-full max-sm:flex max-sm:items-center max-sm:gap-3 sm:text-center"
          >
            {/* Đường nối chạy hết bề ngang của bước, nằm sau vòng tròn */}
            <span
              aria-hidden
              className={cx(
                'absolute top-5 right-0 left-0 hidden h-0.5 sm:block',
                step.state === 'done' ? 'bg-accent' : 'bg-line',
              )}
            />
            <span
              aria-hidden
              className={cx(
                'tnum relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full text-body font-semibold sm:mx-auto',
                step.state === 'done' && 'bg-accent text-on-accent ring-4 ring-accent-soft',
                step.state === 'current' && 'border-2 border-accent bg-panel text-accent-fg ring-4 ring-accent-soft',
                step.state === 'todo' && 'border border-line-2 bg-panel text-fg-3 ring-4 ring-panel',
              )}
            >
              {step.state === 'done' ? <Icon name="check" className="text-[20px]" /> : i + 1}
            </span>
            <span className="block min-w-0 sm:mt-3 sm:px-2">
              <span className={cx('block text-body', step.state === 'todo' ? 'text-fg-2' : 'font-semibold text-fg')}>
                {step.label}
                <span className="sr-only">
                  {step.state === 'done' ? ', đã xong' : step.state === 'current' ? ', đang ở bước này' : ''}
                </span>
              </span>
              {step.detail && <span className="tnum mt-0.5 block text-meta text-fg-3">{step.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

const WELL_TONES: Record<TrackerNext['tone'], string> = {
  neutral: 'ct-well',
  ok: 'ct-well',
  info: 'bg-info-soft',
  warn: 'bg-warn-soft',
  danger: 'bg-danger-soft',
}

/**
 * "Tình hình thực hiện": các bước có vòng tròn, nhãn trạng thái ở góc, dòng "Trạng thái hiện hành" và giờ của mốc gần nhất.
 * Việc tiếp theo của khách (tone danger) tô nền đỏ nhạt và có nút cuộn tới khối làm việc
 */
export function ContractTracker({
  steps,
  next,
  updatedAt,
}: {
  steps: TrackerStep[]
  next: TrackerNext
  /** Giờ của mốc gần nhất, đã định dạng */
  updatedAt: string | null
}) {
  const allDone = steps.length > 0 && steps.every((s) => s.state === 'done')
  const badge: { tone: Tone; label: string } | null = allDone
    ? { tone: 'ok', label: 'Tiến độ hoàn tất' }
    : next.tone === 'danger'
      ? { tone: 'danger', label: 'Cần bạn xử lý' }
      : steps.some((s) => s.state === 'current')
        ? { tone: 'info', label: 'Đang thực hiện' }
        : null
  const tone = allDone ? 'ok' : next.tone
  return (
    <Panel>
      <PanelHeader title="Tình hình thực hiện" action={badge && <Badge tone={badge.tone}>{badge.label}</Badge>} />
      <PanelBody className="space-y-5">
        <ol className="grid gap-4 sm:gap-3" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((step, i) => (
            <li key={step.label} className="min-w-0 max-sm:col-span-full max-sm:flex max-sm:items-center max-sm:gap-3">
              <span
                aria-hidden
                className={cx(
                  'tnum flex size-9 shrink-0 items-center justify-center rounded-full text-body font-semibold',
                  step.state === 'done' && 'bg-accent text-on-accent',
                  step.state === 'current' && 'border-2 border-accent bg-panel text-accent-fg ring-4 ring-accent-soft',
                  step.state === 'todo' && 'border border-line-2 bg-panel text-fg-3',
                )}
              >
                {step.state === 'done' ? <Icon name="check" className="text-[20px]" /> : i + 1}
              </span>
              <span className="block min-w-0 sm:mt-3">
                <span className={cx('block text-meta', step.state === 'todo' ? 'text-fg-2' : 'font-semibold text-fg')}>
                  {step.label}
                  <span className="sr-only">
                    {step.state === 'done' ? ', đã xong' : step.state === 'current' ? ', đang ở bước này' : ''}
                  </span>
                </span>
                {step.detail ? (
                  <span className="tnum mt-0.5 block text-meta text-fg-3">{step.detail}</span>
                ) : step.state === 'done' ? (
                  <span className="mt-0.5 block text-meta font-medium text-ok">Hoàn tất</span>
                ) : step.state === 'current' ? (
                  <span className="mt-0.5 block text-meta font-medium text-accent-fg">Đang thực hiện</span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
        <div className={cx('rounded-control px-4 py-3', WELL_TONES[tone])}>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
            <p className="flex min-w-0 items-center gap-2 text-meta text-fg-2">
              <span className="ct-dot" data-tone={tone} aria-hidden />
              Trạng thái hiện hành:
              <span className={cx('font-semibold', tone === 'ok' ? 'text-accent-fg' : 'text-fg')}>{next.title}</span>
            </p>
            {updatedAt && <p className="ct-code tnum text-meta text-fg-3">Cập nhật: {updatedAt}</p>}
          </div>
          {next.body && <div className="mt-2 text-meta text-fg-2">{next.body}</div>}
          {next.action && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="secondary"
                icon={next.action.icon}
                onClick={() => goToBlock(next.action!.target)}
              >
                {next.action.label}
              </Button>
            </div>
          )}
        </div>
      </PanelBody>
    </Panel>
  )
}

/** Điều khoản trong khung chữ đơn cách: mục IN HOA ngăn bằng đường kẻ, điều đánh số thụt đầu dòng. Không đổi chữ nào */
export function ContractTerms({ terms }: { terms: string | null }) {
  const sections = parseTerms(terms)
  return (
    <div className="ct-terms ct-code">
      <h3>Điều khoản</h3>
      {sections.length === 0 ? (
        <p className="mt-1">Chưa có điều khoản.</p>
      ) : (
        <div className="mt-1">
          {sections.map((s, i) => (
            <section key={`${i}-${s.heading ?? ''}`}>
              {s.heading && <h4>{s.heading}</h4>}
              <div className="mt-1 space-y-1.5">
                {s.lines.map((l, j) =>
                  l.kind === 'item' ? (
                    <p key={j} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
                      <span className="tnum">{l.number}.</span>
                      <span className="whitespace-pre-line">{l.text}</span>
                    </p>
                  ) : (
                    <p key={j} className="whitespace-pre-line">
                      {l.text}
                    </p>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

/** Thẻ tối "Bạn cần hỗ trợ thêm?" dưới cột thông tin: mở khung Trợ lý của cổng */
export function ContractHelpCard() {
  return (
    <section
      aria-labelledby="contract-help-title"
      className="ct-help bg-fg p-5 text-canvas dark:border dark:border-line dark:bg-surface-3 dark:text-fg"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-canvas/10 text-canvas dark:bg-accent-soft dark:text-accent-fg"
        >
          <Icon name="support_agent" className="text-[20px]" />
        </span>
        <div className="min-w-0">
          <h2 id="contract-help-title" className="text-body font-semibold">
            Bạn cần hỗ trợ thêm?
          </h2>
          <p className="text-meta text-canvas/70 dark:text-fg-2">Trợ lý Smart Solar trả lời ngay trong ứng dụng</p>
        </div>
      </div>
      <p className="mt-3 text-meta text-canvas/85 dark:text-fg-2">
        Mọi thắc mắc về nghiệm thu hay vận hành hệ thống pin mặt trời, hỏi trợ lý ngay tại đây.
      </p>
      <button
        type="button"
        onClick={openAssistant}
        className="press mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-control border border-canvas/25 bg-canvas/5 text-body font-medium text-canvas hover:bg-canvas/10 lg:h-10 dark:border-line-2 dark:bg-transparent dark:text-fg dark:hover:bg-hover"
      >
        Hỏi trợ lý
        <Icon name="chevron_right" className="text-[20px]" />
      </button>
    </section>
  )
}
