import { useId, type HTMLAttributes, type ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import type { Tone } from '@/components/common/ui/badge'
import { TONE_TEXT } from '@/features/contracts/tech-contract/techContractDisplay'
import { cx } from '@/utils/cx'

// Phần dùng chung của các thẻ trên trang hợp đồng 30/70 phía kỹ thuật viên (thiết kế 26/11/2026). Kiểu thẻ ở contract-detail.css
// (.ct-card, .ct-box, .ct-well, .ct-eyebrow), chỉ đúng trong trang bọc `.ct-page`

/** Thẻ trắng bo góc của một khối */
export function TechCard({ className, children, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cx('ct-card min-w-0', className)} {...rest}>
      {children}
    </section>
  )
}

/** Tiêu đề thẻ: icon, tên khối, phần phụ bên phải (nhãn trạng thái, tab, giờ) */
export function CardTitle({
  id,
  icon,
  aside,
  children,
}: {
  id?: string
  icon: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <h2 id={id} className="flex min-w-0 items-center gap-2 text-body font-bold text-fg">
        <Icon name={icon} className="shrink-0 text-[20px] text-fg-2" />
        <span className="min-w-0">{children}</span>
      </h2>
      {aside && <div className="flex min-w-0 flex-wrap items-center gap-2 text-meta text-fg-2">{aside}</div>}
    </header>
  )
}

export type CardTab<T extends string> = { value: T; label: ReactNode }

/** Tab chữ trong tiêu đề thẻ, gạch chân tab đang mở. `panelId`: id của vùng nội dung tab */
export function CardTabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  panelId,
}: {
  label: string
  tabs: CardTab<T>[]
  value: T
  onChange: (value: T) => void
  panelId: string
}) {
  const base = useId()
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1">
      {tabs.map((t) => {
        const selected = t.value === value
        return (
          <button
            key={t.value}
            id={`${base}-${t.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            onClick={() => onChange(t.value)}
            className={cx(
              'press tap min-h-11 border-b-2 px-2 text-meta lg:min-h-8',
              selected ? 'border-accent font-semibold text-fg' : 'border-transparent text-fg-2 hover:text-fg',
            )}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

/** Một ô số liệu: nhãn nhỏ, số đậm */
export function Stat({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: Tone }) {
  return (
    <div className="min-w-0">
      <dt className="text-meta text-fg-2">{label}</dt>
      <dd className={cx('tnum mt-0.5 text-body font-bold wrap-break-word', tone ? TONE_TEXT[tone] : 'text-fg')}>
        {value}
      </dd>
    </div>
  )
}

/** Dòng nhãn, giá trị của cột thông tin */
export function InfoRow({ k, v, stack }: { k: ReactNode; v: ReactNode; stack?: boolean }) {
  return stack ? (
    <div className="py-2.5 first:pt-0 last:pb-0">
      <dt className="text-fg-2">{k}</dt>
      <dd className="mt-1 font-semibold wrap-break-word text-fg">{v}</dd>
    </div>
  ) : (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-fg-2">{k}</dt>
      <dd className="min-w-0 text-right font-semibold wrap-break-word text-fg">{v}</dd>
    </div>
  )
}

const NOTICE_ICONS: Record<Tone, string> = {
  ok: 'verified_user',
  info: 'info',
  accent: 'info',
  warn: 'warning',
  danger: 'error',
  neutral: 'info',
}

/** Thông báo một dòng trong thẻ đầu trang: icon theo nghĩa, tiêu đề đậm nối liền câu giải thích */
export function NoticeRow({
  tone,
  title,
  children,
  action,
}: {
  tone: Tone
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div data-tone={tone} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
      <Icon name={NOTICE_ICONS[tone]} className={cx('mt-px shrink-0 text-[20px]', TONE_TEXT[tone])} />
      <div className="min-w-0 text-body text-fg-2">
        <p>
          <span className="font-semibold text-fg">{title}</span>
          {children && <> {children}</>}
        </p>
        {action && <div className="mt-2 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  )
}
