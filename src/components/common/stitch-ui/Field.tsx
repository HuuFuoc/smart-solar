import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type FieldProps = {
  label: ReactNode
  htmlFor?: string
  /** default: nhãn đậm, caps: nhãn nhỏ in hoa */
  variant?: 'default' | 'caps'
  labelClassName?: string
  /** Chữ nhỏ bên phải nhãn, ví dụ "Clearance: Level 3" */
  hint?: ReactNode
  /** Chú thích dưới ô nhập */
  help?: ReactNode
  /** Lỗi validate; khi có lỗi thay cho help */
  error?: ReactNode
  children: ReactNode
  className?: string
}

/* Nhãn + ô nhập + chú thích/lỗi. */
export function Field({
  label,
  htmlFor,
  variant = 'default',
  labelClassName,
  hint,
  help,
  error,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col', variant === 'caps' ? 'gap-1' : 'gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className={cn(
          'flex items-center justify-between',
          variant === 'caps' ? 'text-label-sm text-outline' : 'text-label-md font-semibold text-on-surface',
          labelClassName,
        )}
      >
        <span>{label}</span>
        {hint && (
          <span className="text-label-sm font-medium normal-case tracking-normal text-tertiary-container">{hint}</span>
        )}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-label-sm font-medium text-error">
          {error}
        </p>
      ) : (
        help && <p className="text-label-sm text-outline">{help}</p>
      )}
    </div>
  )
}
