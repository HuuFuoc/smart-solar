import { useEffect, useState, type DOMAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type TooltipHandlers = Partial<
  Pick<
    DOMAttributes<HTMLElement>,
    'onMouseEnter' | 'onMouseLeave' | 'onFocus' | 'onBlur' | 'onKeyDown' | 'onPointerDown'
  >
>

// Tooltip cho nút chỉ có icon, thay cho `title`: hiện cả khi focus bàn phím và vẽ vào body nên không bị khung cuộn cắt
// Rê chuột sang tooltip vẫn giữ nó (ẩn trễ 120ms)
export function WithTooltip({
  label,
  side = 'top',
  children,
}: {
  label: string | null
  /** `bottom` cho nút sát mép trên màn hình, hiện phía trên sẽ bị khuất */
  side?: 'top' | 'right' | 'bottom'
  children: (tip: TooltipHandlers) => ReactNode
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const [overTrigger, setOverTrigger] = useState(false)
  const [overTip, setOverTip] = useState(false)
  const [focused, setFocused] = useState(false)

  // Rời nút và không sang tooltip (cũng không còn focus bàn phím): ẩn sau 120ms.
  useEffect(() => {
    if (!anchor || overTrigger || overTip || focused) return
    const id = window.setTimeout(() => setAnchor(null), 120)
    return () => window.clearTimeout(id)
  }, [anchor, overTrigger, overTip, focused])

  const tip: TooltipHandlers = label
    ? {
        onMouseEnter: (e) => {
          setOverTrigger(true)
          setAnchor(e.currentTarget.getBoundingClientRect())
        },
        onMouseLeave: () => setOverTrigger(false),
        onFocus: (e) => {
          if (!e.currentTarget.matches(':focus-visible')) return
          setFocused(true)
          setAnchor(e.currentTarget.getBoundingClientRect())
        },
        onBlur: () => {
          setFocused(false)
          setAnchor(null)
        },
        onPointerDown: () => setAnchor(null),
        onKeyDown: (e) => {
          if (e.key === 'Escape') setAnchor(null)
        },
      }
    : {}

  const centerX = (anchor?.left ?? 0) + (anchor?.width ?? 0) / 2
  const position =
    side === 'right'
      ? {
          left: (anchor?.right ?? 0) + 8,
          top: (anchor?.top ?? 0) + (anchor?.height ?? 0) / 2,
          transform: 'translateY(-50%)',
        }
      : side === 'bottom'
        ? { left: centerX, top: (anchor?.bottom ?? 0) + 6, transform: 'translateX(-50%)' }
        : { left: centerX, top: (anchor?.top ?? 0) - 6, transform: 'translate(-50%, -100%)' }

  return (
    <>
      {children(tip)}
      {label &&
        anchor &&
        createPortal(
          <span
            role="tooltip"
            // Tràn mép màn hình thì dời ngược lại
            ref={(el) => {
              if (!el) return
              el.style.translate = ''
              const r = el.getBoundingClientRect()
              const shift =
                r.right > window.innerWidth - 8 ? window.innerWidth - 8 - r.right : r.left < 8 ? 8 - r.left : 0
              if (shift) el.style.translate = `${shift}px 0`
            }}
            onMouseEnter={() => setOverTip(true)}
            onMouseLeave={() => setOverTip(false)}
            className="fixed z-50 rounded-control bg-fg px-2.5 py-1 text-meta font-medium whitespace-nowrap text-canvas shadow-pop"
            style={position}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  )
}
