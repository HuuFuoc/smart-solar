import type { FormEvent } from 'react'
import { Button } from '@/components/common/ui/button'
import { Textarea } from '@/components/common/ui/field'
import { messageCounter } from '@/features/chat/chatDisplay'
import { chatMessageProblem } from '@/features/chat/chatRules'
import { cx } from '@/utils/cx'

// Ô hỏi, dính đáy màn hình. Enter gửi, Shift + Enter xuống dòng (bỏ qua khi bộ gõ đang ghép chữ). Đang gửi thì khoá ô và nút,
// nội dung vẫn giữ: chỉ xoá khi backend đã trả lời; lỗi thì giữ để gửi lại

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  sending,
  waitSeconds,
  error,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  sending: boolean
  /** Còn phải chờ theo Retry-After (429) */
  waitSeconds: number
  error: string | null
}) {
  const counter = messageCounter(value)
  const blocked = sending || waitSeconds > 0
  const invalid = chatMessageProblem(value) !== null

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!blocked) onSubmit()
  }

  let label = 'Gửi'
  if (sending) label = 'Đang gửi…'
  else if (waitSeconds > 0) label = `Chờ ${waitSeconds} giây`

  return (
    <form
      onSubmit={submit}
      data-sticky-bottom
      className="sticky bottom-0 z-10 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur md:px-6"
    >
      <label htmlFor="chat-message" className="sr-only">
        Câu hỏi cho trợ lý
      </label>
      <div className="flex items-end gap-3">
        <Textarea
          id="chat-message"
          rows={2}
          value={value}
          readOnly={sending}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              if (!blocked) onSubmit()
            }
          }}
          placeholder="Hỏi về sản phẩm, lắp đặt, bảo hành, bảo trì…"
          aria-invalid={Boolean(error) || counter?.over || undefined}
          aria-describedby="chat-message-msg"
          className="max-h-60 min-h-11 flex-1 resize-y"
        />
        <Button type="submit" variant="primary" icon="send" disabled={blocked || invalid}>
          {label}
        </Button>
      </div>
      <div id="chat-message-msg" className="mt-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        {error ? (
          <p role="alert" className="text-meta text-danger">
            {error}
          </p>
        ) : (
          <p className="text-meta text-fg-3">Enter để gửi, Shift + Enter để xuống dòng.</p>
        )}
        {counter && <p className={cx('tnum text-meta', counter.over ? 'text-danger' : 'text-fg-3')}>{counter.text}</p>}
      </div>
    </form>
  )
}
