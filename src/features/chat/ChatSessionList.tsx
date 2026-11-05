import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Button } from '@/components/common/ui/button'
import { Skeleton } from '@/components/common/ui/states'
import { sortSessions } from '@/features/chat/chatRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { errorMessage } from '@/services/api/errors'
import type { ChatSessionView } from '@/types/res/chatRes'
import { cx } from '@/utils/cx'

// Các cuộc trò chuyện của người đang đăng nhập (backend chỉ trả phiên của chính họ), mới cập nhật lên đầu. Đang gửi câu hỏi thì
// khoá chuyển phiên để câu trả lời về đúng chỗ

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
      <div className="space-y-2" aria-busy>
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    )
  if (query.isError)
    return (
      <div role="alert" className="space-y-2 text-meta text-danger">
        <p>Không tải được các cuộc trò chuyện. {errorMessage(query.error)}</p>
        <Button size="sm" variant="secondary" icon="refresh" onClick={() => void query.refetch()}>
          Thử lại
        </Button>
      </div>
    )
  if (query.data.length === 0) return <p className="text-meta text-fg-2">Chưa có cuộc trò chuyện nào.</p>

  return (
    <ul className="space-y-1" aria-label="Các cuộc trò chuyện">
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
                'press block rounded-control px-3 py-2',
                active ? 'bg-accent-soft' : 'hover:bg-hover',
                locked && !active && 'cursor-not-allowed opacity-60',
              )}
            >
              <span className={cx('block text-body break-words text-fg', active ? 'font-semibold' : 'font-medium')}>
                {s.title}
              </span>
              <span className="tnum block text-meta text-fg-3">{formatMoment(s.updatedAt)}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
