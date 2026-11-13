import { Link } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { CHAT_ROLES } from '@/common/chat'
import { answerStateMeta, citationMeta } from '@/features/chat/chatDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import type { ChatMessageView, CitationView } from '@/types/res/chatRes'
import { cx } from '@/utils/cx'

// Một tin nhắn trong cuộc trò chuyện. Trợ lý trả lời kèm biểu tượng, nhãn trạng thái và danh sách nguồn RAG.

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
    <li className={cx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <article
        aria-label={isUser ? 'Câu hỏi của bạn' : 'Trợ lý trả lời'}
        className={cx('min-w-0 max-w-full lg:max-w-2xl', isUser && 'text-right')}
      >
        {!isUser && (
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-control bg-accent-soft text-accent">
              <Icon name="smart_toy" className="text-[16px]" />
            </span>
            <span className="text-meta font-medium text-fg">Trợ lý Smart Solar</span>
          </div>
        )}

        <div
          className={cx(
            'inline-block max-w-full rounded-container px-4 py-3 text-left text-body break-words whitespace-pre-wrap',
            isUser ? 'bg-accent text-on-accent' : 'border border-line bg-canvas text-fg',
          )}
        >
          {message.content}
        </div>

        {state && (
          <div className="mt-2 text-left">
            <Badge tone={state.tone}>{state.label}</Badge>
          </div>
        )}

        {!isUser && message.citations.length > 0 && (
          <Citations citations={message.citations} documentHref={documentHref} />
        )}

        {notice && <p className="mt-2 text-meta text-fg-3">{notice}</p>}
        <p className="tnum mt-1.5 text-meta text-fg-3">{formatMoment(message.createdAt)}</p>
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
    <div className="mt-3 rounded-control border border-line bg-surface-2/40 p-3 text-left">
      <p className="flex items-center gap-1.5 text-meta font-medium text-fg-2">
        <Icon name="menu_book" className="text-[16px] text-accent" />
        <span>Nguồn tham chiếu ({citations.length})</span>
      </p>
      <ol className="mt-2 space-y-2">
        {citations.map((c) => (
          <li key={c.rank} className="text-meta text-fg-2">
            <span className="tnum font-semibold text-fg-3">[{c.rank}] </span>
            {documentHref ? (
              <Link to={documentHref(c.documentId)} className="ui-link font-medium">
                {c.documentTitle}
              </Link>
            ) : (
              <span className="font-medium text-fg">{c.documentTitle}</span>
            )}
            <span>, {citationMeta(c)}</span>
            {c.snippet && (
              <details className="mt-1">
                <summary className="tap inline-flex min-h-11 cursor-pointer items-center text-fg-2 hover:text-fg lg:min-h-0">
                  Trích đoạn
                </summary>
                <p className="mt-1 rounded-control border border-line bg-canvas px-3 py-2 break-words whitespace-pre-wrap text-fg-2">
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
