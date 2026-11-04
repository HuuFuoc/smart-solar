import type { ReactNode } from 'react'
import { cx } from '@/utils/cx'

export type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'accent'

// Trạng thái là chữ có màu theo nghĩa, không nền, không viền:
// ok: đang hoạt động, info: đang xử lý, danger: cần xử lý hoặc lỗi
// warn: lưu ý, accent: của người đang xem, neutral: đã xong / không hoạt động
const tones: Record<Tone, string> = {
  neutral: 'text-fg-2',
  ok: 'text-ok',
  info: 'text-info',
  accent: 'text-accent-fg',
  warn: 'text-warn',
  danger: 'text-danger',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: ReactNode
}) {
  return <span className={cx('text-meta font-semibold', tones[tone], className)}>{children}</span>
}

// Số đếm cạnh mục menu / tab. `attention` là việc đang chờ người xem nên tô đỏ, còn lại là số xám không nền
export function Count({ value, attention, className }: { value: number; attention?: boolean; className?: string }) {
  return (
    <span
      className={cx(
        'tnum inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-control px-1 text-meta font-semibold',
        attention ? 'bg-danger-fill text-on-danger' : 'text-fg-2',
        className,
      )}
    >
      {value}
    </span>
  )
}
