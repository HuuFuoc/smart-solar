import { Link } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { CHAT_ROLES } from '@/common/chat'
import { answerStateMeta, citationMeta } from '@/features/chat/chatDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import type { ChatMessageView, CitationView } from '@/types/res/chatRes'
import { cx } from '@/utils/cx'

// Một tin nhắn. Câu trả lời hiện đúng nội dung backend trả (chữ thường, giữ xuống dòng), nhãn khi chưa có tài liệu hỗ trợ,
// nguồn trích và `notice` nếu đã nhận. Nguồn chỉ có link khi người xem mở được tài liệu (quản trị)

export function ChatMessageItem({
  message,
  notice,
  documentHref,
}: {
  message: ChatMessageView
  notice?: string
  documentHref?: (documentId: string) => string
}) {
  const isUser = message.role === CHAT_ROLES.USER
  const state = isUser ? null : answerStateMeta(message)
  return (
    <li className={cx('flex', isUser && 'justify-end')}>
      <article
        aria-label={isUser ? 'Câu hỏi của bạn' : 'Trợ lý trả lời'}
        className={cx('min-w-0 max-w-full lg:max-w-prose', isUser && 'text-right')}
      >
        {!isUser && <p className="mb-1 text-meta font-medium text-fg-2">Trợ lý</p>}
        <div
          className={cx(
            'inline-block max-w-full rounded-container px-4 py-3 text-left text-body break-words whitespace-pre-wrap',
            isUser ? 'bg-accent text-on-accent' : 'border border-line bg-canvas text-fg',
          )}
        >
          {message.content}
        </div>
        {state && (
          <div className="mt-2">
            <Badge tone={state.tone}>{state.label}</Badge>
          </div>
        )}
        {!isUser && message.citations.length > 0 && (
          <Citations citations={message.citations} documentHref={documentHref} />
        )}
        {notice && <p className="mt-2 text-meta text-fg-3">{notice}</p>}
        <p className="tnum mt-1 text-meta text-fg-3">{formatMoment(message.createdAt)}</p>
      </article>
    </li>
  )
}

function Citations({
  citations,
  documentHref,
}: {
  citations: CitationView[]
  documentHref?: (documentId: string) => string
}) {
  return (
    <div className="mt-2 text-left">
      <p className="text-meta font-medium text-fg-2">Nguồn</p>
      <ol className="mt-1 space-y-2">
        {citations.map((c) => (
          <li key={c.rank} className="text-meta text-fg-2">
            <span className="tnum text-fg-3">[{c.rank}] </span>
            {documentHref ? (
              <Link to={documentHref(c.documentId)} className="ui-link font-medium">
                {c.documentTitle}
              </Link>
            ) : (
              <span className="font-medium text-fg">{c.documentTitle}</span>
            )}
            <span>. {citationMeta(c)}</span>
            {c.snippet && (
              <details className="mt-1">
                <summary className="tap inline-flex min-h-11 cursor-pointer items-center text-fg-2 hover:text-fg lg:min-h-0">
                  Trích đoạn
                </summary>
                <p className="mt-1 rounded-control bg-surface-2 px-3 py-2 break-words whitespace-pre-wrap text-fg-2">
                  {c.snippet}
                </p>
              </details>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
