import type { UseQueryResult } from '@tanstack/react-query'
import { Button } from '@/components/common/ui/button'
import { Skeleton } from '@/components/common/ui/states'
import { sortSessions } from '@/features/chat/chatRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { errorMessage } from '@/services/api/errors'
import type { ChatSessionView } from '@/types/res/chatRes'
import { cx } from '@/utils/cx'

// Các cuộc trò chuyện của người đang đăng nhập (backend chỉ trả phiên của chính họ), mới cập nhật lên đầu.
// Đang gửi câu hỏi thì khoá chuyển phiên để câu trả lời về đúng chỗ

export function ChatSessionList({
  query,
  activeId,
  locked,
  onSelect,
}: {
  query: UseQueryResult<ChatSessionView[]>
  activeId: string | null
  locked: boolean
  onSelect: (sessionId: string) => void
}) {
  if (query.isPending)
    return (
      <div className="space-y-2 p-2" aria-busy>
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    )

  if (query.isError)
    return (
      <div role="alert" className="space-y-2 p-3 text-meta text-danger">
        <p>Không tải được các cuộc trò chuyện. {errorMessage(query.error)}</p>
        <Button size="sm" variant="secondary" icon="refresh" onClick={() => void query.refetch()}>
          Thử lại
        </Button>
      </div>
    )

  if (query.data.length === 0)
    return <p className="px-3 py-8 text-center text-meta text-fg-2">Chưa có cuộc trò chuyện nào.</p>

  return (
    <ul className="space-y-1" aria-label="Các cuộc trò chuyện">
      {sortSessions(query.data).map((s) => {
        const active = s.sessionId === activeId
        return (
          <li key={s.sessionId}>
            <button
              type="button"
              aria-current={active ? 'true' : undefined}
              disabled={locked && !active}
              onClick={() => onSelect(s.sessionId)}
              className={cx(
                'press block w-full rounded-control px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:text-fg-3',
                active ? 'bg-accent-soft' : 'not-disabled:hover:bg-hover',
              )}
            >
              <span
                className={cx(
                  'line-clamp-2 block text-body break-words',
                  active ? 'font-semibold text-accent-fg' : 'text-fg',
                )}
              >
                {s.title}
              </span>
              <span className="tnum mt-0.5 block text-meta text-fg-2">{formatMoment(s.updatedAt)}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
