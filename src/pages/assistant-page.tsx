import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { EmptyState, ErrorState, Skeleton, UnavailableState } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { useAuth } from '@/context/AuthProvider'
import { ChatComposer } from '@/features/chat/ChatComposer'
import { ChatMessageItem } from '@/features/chat/ChatMessageItem'
import { ChatSessionList } from '@/features/chat/ChatSessionList'
import { CHAT_UNAVAILABLE, CHAT_UNAVAILABLE_ADMIN, chatSendError } from '@/features/chat/chatDisplay'
import { chatMessageProblem, isSessionId, nextAttempt, type ChatAttempt } from '@/features/chat/chatRules'
import { useAskChatMutation, useChatNotices, useChatSessionQuery, useChatSessionsQuery } from '@/hooks/useChat'
import { useLatest } from '@/hooks/useLatest'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useRetryCountdown } from '@/hooks/useRetryCountdown'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage, isApiError, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'

// Trợ lý hỏi đáp theo tài liệu đã công bố, dùng chung mọi cổng (backend cho mọi người đăng nhập, chỉ đọc phiên của mình).
// Cuộc trò chuyện đang mở nằm trên địa chỉ (?phien=<mã>) nên tải lại trang hay Back vẫn đúng chỗ. Không có ?phien là cuộc
// trò chuyện mới: backend mở phiên khi nhận câu hỏi đầu tiên. Lịch sử chỉ gồm tin backend đã lưu

const SESSION_PARAM = 'phien'

export function AssistantPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [params, setParams] = useSearchParams()
  const raw = params.get(SESSION_PARAM)
  const sessionId = isSessionId(raw) ? raw : null
  const badSessionParam = raw !== null && sessionId === null

  const sessions = useChatSessionsQuery()
  const detail = useChatSessionQuery(sessionId)
  const notices = useChatNotices()
  const ask = useAskChatMutation()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  usePageCrumb(detail.data?.session.title ?? null)

  const [draft, setDraft] = useState('')
  // Lỗi gắn với phiên lúc gửi: chuyển phiên thì không hiện lỗi của phiên khác
  const [failure, setFailure] = useState<{ sessionId: string | null; message: string } | null>(null)
  const attemptRef = useRef<ChatAttempt | null>(null)
  const viewRef = useLatest(sessionId)
  const countdown = useRetryCountdown(() => setFailure(null))

  const endRef = useRef<HTMLDivElement>(null)
  const messageCount = detail.data?.messages.length ?? 0
  useEffect(() => {
    if (messageCount === 0 && !ask.isPending) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    endRef.current?.scrollIntoView({ block: 'end', behavior: smooth ? 'smooth' : 'auto' })
  }, [messageCount, ask.isPending, sessionId])

  function openNew() {
    setParams({})
    setFailure(null)
  }

  function send() {
    if (ask.isPending || countdown.secondsLeft > 0) return
    const problem = chatMessageProblem(draft)
    if (problem) return setFailure({ sessionId, message: problem })
    const { attempt, body } = nextAttempt(draft, sessionId, attemptRef.current)
    attemptRef.current = attempt
    setFailure(null)
    ask.mutate(body, {
      onSuccess: (answer) => {
        attemptRef.current = null
        setDraft((current) => (current.trim() === attempt.text ? '' : current))
        // Câu đầu của cuộc trò chuyện mới: mở phiên backend vừa tạo, nếu người dùng vẫn ở màn đó
        if (attempt.sessionId === null && viewRef.current === null)
          setParams({ [SESSION_PARAM]: answer.sessionId }, { replace: true })
      },
      onError: (error) => {
        if (isApiError(error) && error.status === 429 && error.retryAfter) countdown.start(error.retryAfter)
        setFailure({ sessionId: attempt.sessionId, message: chatSendError(error) })
      },
    })
  }

  const unavailableError = [sessions.error, detail.error, ask.error].find((e) => isFeatureUnavailable(e))
  if (unavailableError)
    return (
      <>
        <PageHeader title="Trợ lý" />
        <UnavailableState
          title="Trợ lý chưa sẵn sàng."
          message={isAdmin ? CHAT_UNAVAILABLE_ADMIN : CHAT_UNAVAILABLE}
          pendingMigrations={pendingMigrationsOf(unavailableError)}
        />
        {isAdmin && (
          <ButtonLink to={ROUTES.admin.knowledgeBase} variant="info" icon="menu_book" className="mt-4">
            Mở Kho tri thức AI
          </ButtonLink>
        )}
      </>
    )

  const pendingHere = ask.isPending && (ask.variables?.sessionId ?? null) === sessionId
  const list = <ChatSessionList query={sessions} activeId={sessionId} locked={ask.isPending} />

  return (
    <>
      <PageHeader
        title="Trợ lý"
        actions={
          <Button
            variant="soft"
            icon="add"
            disabled={ask.isPending || (sessionId === null && !badSessionParam)}
            onClick={openNew}
          >
            Cuộc trò chuyện mới
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {isDesktop ? (
          <aside aria-label="Các cuộc trò chuyện">{list}</aside>
        ) : (
          <details className="group rounded-container border border-line px-3 py-2">
            <summary className="tap flex min-h-11 cursor-pointer items-center justify-between gap-3 text-body font-medium text-fg">
              Cuộc trò chuyện trước{sessions.data ? ` (${sessions.data.length})` : ''}
              <Icon name="expand_more" className="text-[20px] text-fg-2 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-2">{list}</div>
          </details>
        )}

        <section aria-label="Cuộc trò chuyện" className="min-w-0 rounded-container border border-line">
          <div className="min-h-[50dvh] px-4 py-6 md:px-6">
            <Thread
              sessionId={sessionId}
              badSessionParam={badSessionParam}
              detail={detail}
              notices={notices}
              documentHref={isAdmin ? (id) => withId(ROUTES.admin.knowledgeDocument, id) : undefined}
              pendingQuestion={pendingHere ? (ask.variables?.message ?? '') : null}
              onOpenNew={openNew}
            />
            <div ref={endRef} />
          </div>
          {!(sessionId && detail.isError) && !badSessionParam && (
            <ChatComposer
              value={draft}
              onChange={(value) => {
                setDraft(value)
                if (failure && countdown.secondsLeft === 0) setFailure(null)
              }}
              onSubmit={send}
              sending={ask.isPending}
              waitSeconds={countdown.secondsLeft}
              error={failure && failure.sessionId === sessionId ? failure.message : null}
            />
          )}
        </section>
      </div>
    </>
  )
}

function Thread({
  sessionId,
  badSessionParam,
  detail,
  notices,
  documentHref,
  pendingQuestion,
  onOpenNew,
}: {
  sessionId: string | null
  badSessionParam: boolean
  detail: ReturnType<typeof useChatSessionQuery>
  notices: Record<string, string>
  documentHref?: (documentId: string) => string
  pendingQuestion: string | null
  onOpenNew: () => void
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
      {messages.length === 0 && pendingQuestion === null && (
        <div className="max-w-prose space-y-2">
          <p className="text-body font-medium text-fg">Hỏi trợ lý Smart Solar</p>
          <p className="text-body text-fg-2">
            Trợ lý trả lời về sản phẩm, lắp đặt, bảo hành, bảo trì và chính sách theo tài liệu Smart Solar đã công bố,
            kèm nguồn. Câu nào chưa có tài liệu hỗ trợ thì trợ lý nói rõ. Câu trả lời không thay thế tư vấn kỹ thuật hay
            điều khoản hợp đồng.
          </p>
        </div>
      )}
      <ol className="space-y-6" aria-label="Nội dung cuộc trò chuyện">
        {messages.map((m) => (
          <ChatMessageItem key={m.messageId} message={m} notice={notices[m.messageId]} documentHref={documentHref} />
        ))}
        {pendingQuestion !== null && (
          <li className="flex justify-end">
            <div className="min-w-0 max-w-full text-right lg:max-w-prose">
              <div className="inline-block max-w-full rounded-container bg-accent px-4 py-3 text-left text-body break-words whitespace-pre-wrap text-on-accent opacity-70">
                {pendingQuestion}
              </div>
              <p className="mt-1 text-meta text-fg-3">Đang gửi</p>
            </div>
          </li>
        )}
      </ol>
      {pendingQuestion !== null && (
        <p role="status" aria-live="polite" className="mt-6 text-meta text-fg-2">
          Trợ lý đang trả lời…
        </p>
      )}
    </>
  )
}
