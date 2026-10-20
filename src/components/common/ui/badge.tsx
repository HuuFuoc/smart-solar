import type { ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cx } from '@/utils/cx'

export type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'accent'

// Nhãn trạng thái, màu theo nghĩa:
// ok: đang hoạt động, info: đang xử lý, danger: cần xử lý hoặc lỗi
// warn: lưu ý, accent: của người đang xem, neutral: đã xong / không hoạt động
const tones: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-fg-2',
  ok: 'bg-ok-soft text-ok',
  info: 'bg-info-soft text-info',
  accent: 'bg-accent-soft text-accent-fg',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
}

export function Badge({
  tone = 'neutral',
  icon,
  className,
  children,
}: {
  tone?: Tone
  /** Tên icon Material Symbols trước chữ, cho cảnh báo cần làm ngay. */
  icon?: string
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cx(
        'inline-flex min-h-6 items-center gap-1.5 rounded-control px-2 py-0.5 text-meta font-medium',
        tones[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} className="-ml-0.5 shrink-0 text-[16px]" />}
      {children}
    </span>
  )
}

// Số đếm cạnh mục menu / tab. `attention` là việc đang chờ người xem nên tô đỏ, còn lại nền xám
export function Count({ value, attention, className }: { value: number; attention?: boolean; className?: string }) {
  return (
    <span
      className={cx(
        'tnum inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-control px-1 text-meta font-semibold',
        attention ? 'bg-danger-fill text-on-danger' : 'bg-fg/8 text-fg-2',
        className,
      )}
    >
      {value}
    </span>
  )
}
