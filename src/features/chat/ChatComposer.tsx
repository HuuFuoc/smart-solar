import type { FormEvent } from 'react'
import { Button } from '@/components/common/ui/button'
import { Textarea } from '@/components/common/ui/field'
import { ChatLimitHint } from '@/features/chat/ChatLimitHint'
import { messageCounter } from '@/features/chat/chatDisplay'
import { chatMessageProblem, type ChatLimitState } from '@/features/chat/chatRules'
import { cx } from '@/utils/cx'

// Ô hỏi ở đáy khung trợ lý. Enter gửi, Shift + Enter xuống dòng (bỏ qua khi bộ gõ đang ghép chữ).
// Đang gửi thì khoá ô và nút, nội dung vẫn giữ: chỉ xoá khi backend đã trả lời; lỗi thì giữ để gửi lại.

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  sending,
  waitSeconds,
  max,
  limit,
  error,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  sending: boolean
  /** Còn phải chờ theo số giây backend trả (429) */
  waitSeconds: number
  /** Số ký tự tối đa đang áp dụng */
  max: number
  limit: ChatLimitState
  error: string | null
}) {
  const counter = messageCounter(value, max)
  const blocked = sending || waitSeconds > 0
  const invalid = chatMessageProblem(value, max) !== null

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!blocked) onSubmit()
  }

  let label = 'Gửi'
  if (sending) label = 'Đang gửi…'
  else if (waitSeconds > 0) label = `Chờ ${waitSeconds} giây`

  return (
    <form onSubmit={submit} className="shrink-0 border-t border-line bg-panel p-3">
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
          className="max-h-40 min-h-11 flex-1 resize-none"
        />
        <Button type="submit" variant="primary" icon="send" disabled={blocked || invalid} className="shrink-0">
          {label}
        </Button>
      </div>
      <div id="chat-message-msg" className="mt-2 flex items-start justify-between gap-x-4 gap-y-1">
        {error ? (
          <p role="alert" className="min-w-0 text-meta text-danger">
            {error}
          </p>
        ) : (
          <p className="min-w-0 text-meta text-fg-2">Enter để gửi, Shift + Enter để xuống dòng.</p>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {counter && (
            <p className={cx('tnum text-meta', counter.over ? 'text-danger' : 'text-fg-3')}>
              <span aria-hidden>{counter.text}</span>
              <span className="sr-only">{counter.label}</span>
            </p>
          )}
          <ChatLimitHint state={limit} />
        </div>
      </div>
    </form>
  )
}
