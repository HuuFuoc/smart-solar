import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { iconButtonClass } from '@/components/common/ui/button'
import { chatLimitText } from '@/features/chat/chatDisplay'
import { isLimitWarning, type ChatLimitState } from '@/features/chat/chatRules'
import { cx } from '@/utils/cx'

// Dấu "!" cuối dòng dưới ô hỏi: rê chuột, focus bằng bàn phím hoặc bấm / chạm để xem giới hạn đang áp dụng. Bấm thì giữ mở tới
// khi bấm lại, bấm ra ngoài hoặc Esc; điện thoại không có rê chuột nên chỉ dùng chạm

export function ChatLimitHint({ state }: { state: ChatLimitState }) {
  const [pinned, setPinned] = useState(false)
  const [peek, setPeek] = useState(false)
  const id = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  const open = pinned || peek
  const warning = isLimitWarning(state)

  useEffect(() => {
    if (!pinned) return
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setPinned(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [pinned])

  return (
    <div
      ref={boxRef}
      className="relative"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPeek(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setPeek(false)}
    >
      <button
        type="button"
        aria-label="Thông tin giới hạn sử dụng trợ lý"
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={open ? id : undefined}
        // Vùng bấm giữ 44px / 32px nhưng không làm dòng dưới ô hỏi cao thêm
        className={iconButtonClass('ghost', 'sm', '-my-3 lg:-my-1.5')}
        onClick={() => setPinned((p) => !p)}
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && setPeek(true)}
        onBlur={() => setPeek(false)}
        onKeyDown={(e) => {
          if (e.key !== 'Escape' || !open) return
          // Esc lần này chỉ đóng phần giới hạn, chưa đóng khung trợ lý
          e.preventDefault()
          setPinned(false)
          setPeek(false)
        }}
      >
        <Icon name={warning ? 'error' : 'info'} className={cx('text-[16px]', warning && 'text-warn')} />
      </button>
      <div
        id={id}
        role="tooltip"
        hidden={!open}
        className="absolute right-0 bottom-full z-10 mb-2 w-72 rounded-container border border-line bg-panel p-3 text-meta text-fg shadow-pop"
      >
        {chatLimitText(state)}
      </div>
    </div>
  )
}
