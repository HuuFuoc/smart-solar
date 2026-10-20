import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

/*
 * Nhãn label-md + gợi ý bên phải + nội dung + chú thích dưới.
 * Bảy field của site_survey_task và các nhóm của site_survey_verification đều dùng khối này.
 */
export type FieldSectionHintTone = 'tint' | 'primary' | 'muted' | 'error'

export type FieldSectionProps = {
  label: ReactNode
  /** Có giá trị thì render <label htmlFor>, không thì render <span> để tránh label rỗng control */
  htmlFor?: string
  hint?: ReactNode
  hintTone?: FieldSectionHintTone
  /** strong = label-md đậm màu on-surface (site_survey_task); muted = nhãn nhạt (site_survey_verification) */
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
