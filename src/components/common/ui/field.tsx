import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useState } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cx } from '@/utils/cx'

/* `required`: dấu * màu đỏ sau nhãn (chỉ để nhìn; ô nhập tự đặt aria-required). */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  required,
  children,
  className,
}: {
  label: ReactNode
  hint?: string
  error?: string
  htmlFor?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <label htmlFor={htmlFor} className="text-body font-medium text-fg">
        {label}
        {required && (
          <span aria-hidden className="text-danger">
            {' *'}
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p className="text-meta text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-meta text-fg-3">{hint}</p>
      ) : null}
    </div>
  )
}

type ControlSize = 'sm' | 'md'

// Trạng thái ô nhập: hover viền đậm, focus một vòng 2px màu chính, lỗi viền đỏ, disabled nền xám
// Màu chữ, viền, nền không để trong `shape` vì cx không gộp class trùng nhau
const shape =
  'rounded-control border text-body placeholder:text-fg-3 disabled:border-line disabled:bg-surface-2 disabled:text-fg-3'
const states =
  'not-disabled:hover:border-fg-3 focus:border-accent focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent aria-invalid:border-danger aria-invalid:outline-danger not-disabled:aria-invalid:hover:border-danger'
const control = cx(shape, states, 'border-line-2 bg-canvas text-fg')
// Bộ lọc đang áp dụng thì tô màu chính
const controlActive = cx(shape, states, 'border-accent-line bg-accent-soft font-medium text-accent-fg')

// Cao bằng Button: 44px dưới breakpoint desktop
const heights: Record<ControlSize, string> = {
  sm: 'h-11 lg:h-8',
  md: 'h-11 lg:h-10',
}

/* Controls fill their container unless the caller sets a width. */
const width = (className?: string) => (className && /(^|\s)w-/.test(className) ? undefined : 'w-full')

export function Input({
  className,
  size = 'md',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & { size?: ControlSize }) {
  return <input className={cx(control, width(className), heights[size], 'px-3', className)} {...rest} />
}

/** Đổi "2026-10-15" thành "15/10/2026", rỗng thì trả rỗng */
const toVnDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : ''
}

/** Đổi "15/10/2026", "5/10/2026", "15-10-2026", "15.10.2026" thành "2026-10-15", ngày không có thật (31/02) thì trả null */
function parseVnDate(text: string): string | null {
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text.trim())
  if (!match) return null
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Ô ngày dạng dd/mm/yyyy, vì ô date gốc hiện theo ngôn ngữ trình duyệt (bản tiếng Anh ra mm/dd/yyyy)
// Ô chữ để gõ ngày, icon lịch bên phải là một ô date gốc trong suốt để mở lịch của trình duyệt
export function DateField({
  id,
  value,
  onChange,
  label,
  min,
  max,
  className,
  size = 'md',
  disabled,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size' | 'type' | 'min' | 'max'> & {
  /** Không có nhãn thì truyền `label` cho trình đọc màn hình */
  id?: string
  /** YYYY-MM-DD */
  value: string
  onChange: (value: string) => void
  label?: string
  min?: string
  max?: string
  size?: ControlSize
}) {
  const [text, setText] = useState(() => toVnDate(value))
  // Giá trị đổi từ ngoài (nút ngày trước / sau, lịch chọn, form đặt lại): hiện theo giá trị mới.
  const [shown, setShown] = useState(value)
  if (value !== shown) {
    setShown(value)
    setText(toVnDate(value))
  }

  const commit = () => {
    if (text.trim() === '') {
      if (value) onChange('')
      // Không nhận ngày rỗng thì giữ ngày cũ
      setText(toVnDate(value))
      return
    }
    const iso = parseVnDate(text)
    if (iso && (!min || iso >= min) && (!max || iso <= max)) {
      setText(toVnDate(iso))
      if (iso !== value) onChange(iso)
    } else setText(toVnDate(value))
  }

  return (
    <span className={cx('relative block', width(className), className)}>
      <input
        {...rest}
        id={id}
        type="text"
        autoComplete="off"
        placeholder="dd/mm/yyyy"
        maxLength={10}
        aria-label={label}
        disabled={disabled}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          // Không gửi form khi ngày còn chưa đọc xong.
          e.preventDefault()
          commit()
        }}
        className={cx(control, 'tnum w-full pr-10 pl-3', heights[size])}
      />
      <input
        type="date"
        tabIndex={-1}
        aria-label="Chọn ngày trên lịch"
        disabled={disabled}
        min={min}
        max={max}
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        onClick={(e) => {
          // Firefox / Safari cần gọi showPicker(), Chrome đã tự mở
          try {
            e.currentTarget.showPicker()
          } catch {
            /* Lịch đang mở hoặc trình duyệt chưa có showPicker. */
          }
        }}
        className="peer absolute inset-y-0 right-0 w-10 cursor-pointer opacity-0 disabled:pointer-events-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:size-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
      />
      <Icon
        name="calendar_month"
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[20px] text-fg-3 peer-hover:text-fg"
      />
    </span>
  )
}

/* Ô tìm kiếm: icon kính lúp ở đầu ô để nhận ra ngay là ô tìm, không chỉ dựa vào chữ gợi ý. */
export function SearchInput({
  className,
  size = 'md',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> & { size?: ControlSize }) {
  return (
    <span className={cx('relative block', width(className), className)}>
      <Icon
        name="search"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[20px] text-fg-3"
      />
      <input type="search" className={cx(control, 'w-full pr-3 pl-10', heights[size])} {...rest} />
    </span>
  )
}

export function Textarea({ className, rows = 4, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cx(control, width(className), 'px-3 py-2', className)} {...rest} />
}

/** `active`: ô lọc đang có giá trị khác "Tất cả...", tô màu để thấy bộ lọc đang áp dụng. */
export function Select({
  className,
  size = 'md',
  active,
  children,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & { size?: ControlSize; active?: boolean }) {
  return (
    <select
      className={cx(
        active ? controlActive : control,
        width(className),
        heights[size],
        'cursor-pointer px-3 pr-8',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  )
}

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const timeOf = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

// Ô chọn giờ 24h, vì ô time gốc hiện theo ngôn ngữ trình duyệt (01:00 PM)
// Giá trị lệch bước vẫn được thêm vào danh sách để không bị đổi ngầm
export function TimeSelect({
  value,
  onChange,
  from = '00:00',
  to = '23:30',
  step = 30,
  emptyLabel,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'size'> & {
  /** HH:mm (HH:mm:ss cũng đọc được) */
  value: string
  onChange: (value: string) => void
  from?: string
  to?: string
  step?: number
  emptyLabel?: string
  size?: ControlSize
  active?: boolean
}) {
  const current = value.slice(0, 5)
  const times: string[] = []
  for (let m = minutesOf(from); m <= minutesOf(to); m += step) times.push(timeOf(m))
  if (current && !times.includes(current)) times.push(current)
  times.sort()
  return (
    <Select value={current} onChange={(e) => onChange(e.target.value)} {...rest}>
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {times.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </Select>
  )
}

type ChoiceProps = InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }

export function Checkbox({ label, description, className, ...rest }: ChoiceProps) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-3 text-body', className)}>
      <input type="checkbox" className="mt-1 size-4 shrink-0 accent-accent" {...rest} />
      <span>
        <span className="text-fg">{label}</span>
        {description && <span className="block text-meta text-fg-3">{description}</span>}
      </span>
    </label>
  )
}

export function Radio({ label, description, className, ...rest }: ChoiceProps) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-3 text-body', className)}>
      <input type="radio" className="mt-1 size-4 shrink-0 accent-accent" {...rest} />
      <span>
        <span className="text-fg">{label}</span>
        {description && <span className="block text-meta text-fg-3">{description}</span>}
      </span>
    </label>
  )
}

/** Ô nhập kèm đơn vị đứng sau, ví dụ [ 12,5 ] m */
export function WithUnit({ unit, children }: { unit: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {children}
      <span className="text-body text-fg-2">{unit}</span>
    </div>
  )
}
