import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
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
}: {
  query: UseQueryResult<ChatSessionView[]>
  activeId: string | null
  locked: boolean
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
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-control bg-accent-soft text-accent">
          <Icon name="chat_bubble_outline" className="text-[24px]" />
        </div>
        <p className="text-meta text-fg-3">Chưa có cuộc trò chuyện nào.</p>
      </div>
    )

  return (
    <ul className="space-y-1.5 p-1" aria-label="Các cuộc trò chuyện">
      {sortSessions(query.data).map((s) => {
        const active = s.sessionId === activeId
        return (
          <li key={s.sessionId}>
            <Link
              to={{ search: `?phien=${s.sessionId}` }}
              aria-current={active ? 'page' : undefined}
              aria-disabled={locked || undefined}
              tabIndex={locked && !active ? -1 : undefined}
              onClick={(e) => locked && e.preventDefault()}
              className={cx(
                'press flex items-start gap-2.5 rounded-control px-3 py-2.5 transition-colors',
                active ? 'bg-accent-soft text-accent font-semibold' : 'text-fg hover:bg-hover',
                locked && !active && 'cursor-not-allowed opacity-60',
              )}
            >
              <Icon
                name="chat_bubble_outline"
                className={cx('mt-0.5 shrink-0 text-[16px]', active ? 'text-accent' : 'text-fg-3')}
              />
              <div className="min-w-0 flex-1">
                <span
                  className={cx(
                    'block text-body break-words line-clamp-2',
                    active ? 'text-accent font-semibold' : 'text-fg',
                  )}
                >
                  {s.title}
                </span>
                <span className="tnum mt-0.5 block text-meta text-fg-3">{formatMoment(s.updatedAt)}</span>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
