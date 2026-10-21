import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

// Khối field: nhãn, gợi ý, nội dung và chú thích
export type FieldSectionHintTone = 'tint' | 'primary' | 'muted' | 'error'

export type FieldSectionProps = {
  label: ReactNode
  /** Có id thì dùng <label htmlFor>, không thì <span> */
  htmlFor?: string
  hint?: ReactNode
  hintTone?: FieldSectionHintTone
  /** strong: nhãn đậm, muted: nhãn nhạt */
  labelTone?: 'strong' | 'muted'
  /** Dòng chú thích dưới nội dung */
  footnote?: ReactNode
  /** Lỗi validate; khi có lỗi thì thay cho footnote */
  error?: ReactNode
  children: ReactNode
  className?: string
}

const hintToneClasses: Record<FieldSectionHintTone, string> = {
  tint: 'text-surface-tint',
  primary: 'text-primary',
  muted: 'text-on-surface-variant',
  error: 'text-error',
}

export function FieldSection({
  label,
  htmlFor,
  hint,
  hintTone = 'muted',
  labelTone = 'strong',
  footnote,
  error,
  children,
  className,
}: FieldSectionProps) {
  const labelContent = (
    <>
      <span>{label}</span>
      {hint && <span className={cn('text-label-sm font-normal', hintToneClasses[hintTone])}>{hint}</span>}
    </>
  )
  const labelClass = cn(
    'flex items-center justify-between gap-space-sm text-label-md',
    labelTone === 'strong' ? 'font-semibold text-on-surface' : 'font-normal text-on-surface-variant',
  )

  return (
    <div className={cn('flex flex-col', labelTone === 'strong' ? 'gap-space-xs' : 'gap-1.5', className)}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {labelContent}
        </label>
      ) : (
        <span className={labelClass}>{labelContent}</span>
      )}
      {children}
      {error ? (
        <span role="alert" className="text-body-sm font-semibold text-error">
          {error}
        </span>
      ) : (
        footnote && <span className="text-body-sm text-on-surface-variant">{footnote}</span>
      )}
    </div>
  )
}
