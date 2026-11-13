import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { ChatMessageItem } from '@/features/chat/ChatMessageItem'
import { ChatWelcomeBanner } from '@/features/chat/ChatWelcomeBanner'
import type { useChatSessionQuery } from '@/hooks/useChat'
import { errorMessage, isApiError } from '@/services/api/errors'

export function ChatThread({
  sessionId,
  badSessionParam,
  detail,
  notices,
  documentHref,
  pendingQuestion,
  onOpenNew,
  onSelectPrompt,
}: {
  sessionId: string | null
  badSessionParam: boolean
  detail: ReturnType<typeof useChatSessionQuery>
  notices: Record<string, string>
  documentHref?: (documentId: string) => string
  pendingQuestion: string | null
  onOpenNew: () => void
  onSelectPrompt: (prompt: string) => void
}) {
  const notFound =
    badSessionParam || (detail.isError && isApiError(detail.error) && detail.error.code === 'RAG_SESSION_NOT_FOUND')

  if (notFound)
    return (
      <EmptyState
        title="Không tìm thấy cuộc trò chuyện"
        description="Cuộc trò chuyện này không có hoặc không thuộc tài khoản của bạn."
        action={
          <Button variant="soft" icon="add" onClick={onOpenNew}>
            Cuộc trò chuyện mới
          </Button>
        }
      />
    )

  if (sessionId && detail.isError)
    return (
      <ErrorState
        title="Không tải được cuộc trò chuyện."
        message={errorMessage(detail.error)}
        onRetry={() => void detail.refetch()}
      />
    )

  if (sessionId && detail.isPending)
    return (
      <div className="space-y-4" aria-busy>
        <Skeleton className="ml-auto h-12 w-2/3" />
        <Skeleton className="h-24 w-3/4" />
      </div>
    )

  const messages = sessionId ? (detail.data?.messages ?? []) : []

  return (
    <>
      {messages.length === 0 && pendingQuestion === null && <ChatWelcomeBanner onSelectPrompt={onSelectPrompt} />}
      <ol className="space-y-6" aria-label="Nội dung cuộc trò chuyện">
        {messages.map((m) => (
          <ChatMessageItem key={m.messageId} message={m} notice={notices[m.messageId]} documentHref={documentHref} />
        ))}
        {pendingQuestion !== null && (
          <li className="flex justify-end">
            <div className="min-w-0 max-w-full text-right lg:max-w-2xl">
              <div className="inline-block max-w-full rounded-container bg-accent px-4 py-3 text-left text-body break-words whitespace-pre-wrap text-on-accent opacity-75">
                {pendingQuestion}
              </div>
              <p className="mt-1 text-meta text-fg-3">Đang gửi…</p>
            </div>
          </li>
        )}
      </ol>
      {pendingQuestion !== null && (
        <div className="mt-6 flex items-center gap-2 text-meta text-fg-2" role="status" aria-live="polite">
          <Icon name="auto_awesome" className="text-[16px] text-accent" />
          <span>Trợ lý đang tìm kiếm tài liệu và trả lời…</span>
        </div>
      )}
    </>
  )
}
