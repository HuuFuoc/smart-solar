import { useState, type ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'

interface CustomerRequestSectionProps {
  title: string
  count: number
  description?: string
  defaultOpen?: boolean
  highlight?: boolean
  emptyMessage?: string
  children?: ReactNode
}

export function CustomerRequestSection({
  title,
  count,
  description,
  defaultOpen = true,
  highlight = false,
  emptyMessage,
  children,
}: CustomerRequestSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section
      className={`transition-all ${
        highlight
          ? 'border-l-[3px] border-amber-500 pl-3.5 sm:pl-4'
          : 'border-l-[3px] border-transparent pl-3.5 sm:pl-4'
      }`}
    >
      {/* Tiêu đề ngắn gọn + số lượng + toggle */}
      <div className="flex items-center justify-between pb-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="group flex items-center gap-2 text-left focus:outline-none"
        >
          <h2 className="text-base font-semibold text-fg transition-colors group-hover:text-accent">
            {title}
          </h2>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-2 px-1.5 text-xs font-semibold text-fg-2">
            {count}
          </span>
          <Icon
            name={open ? 'expand_less' : 'expand_more'}
            className="text-[18px] text-fg-3 transition-transform group-hover:text-fg"
          />
        </button>
      </div>

      {/* Dòng hướng dẫn chỉ hiển thị 1 lần duy nhất bên dưới tiêu đề */}
      {description && <p className="mb-3 text-meta text-fg-3">{description}</p>}

      {/* Danh sách các card */}
      {open && (
        <div className="space-y-2 pt-1">
          {count === 0 && emptyMessage ? (
            <p className="py-2 text-meta italic text-fg-3">{emptyMessage}</p>
          ) : (
            children
          )}
        </div>
      )}
    </section>
  )
}
