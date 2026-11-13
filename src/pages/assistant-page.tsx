import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { UnavailableState } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { useAuth } from '@/context/AuthProvider'
import { ChatComposer } from '@/features/chat/ChatComposer'
import { ChatSessionList } from '@/features/chat/ChatSessionList'
import { ChatThread } from '@/features/chat/ChatThread'
import { CHAT_UNAVAILABLE, CHAT_UNAVAILABLE_ADMIN, chatSendError } from '@/features/chat/chatDisplay'
import { chatMessageProblem, isSessionId, nextAttempt, type ChatAttempt } from '@/features/chat/chatRules'
import { useAskChatMutation, useChatNotices, useChatSessionQuery, useChatSessionsQuery } from '@/hooks/useChat'
import { useLatest } from '@/hooks/useLatest'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useRetryCountdown } from '@/hooks/useRetryCountdown'
import { ROUTES, withId } from '@/routes/paths'
import { isApiError, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'

// Trợ lý hỏi đáp theo tài liệu đã công bố, dùng chung mọi cổng.
// Cuộc trò chuyện đang mở nằm trên địa chỉ (?phien=<mã>) nên tải lại trang hay Back vẫn đúng chỗ.

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
    setDraft('')
    setFailure(null)
    attemptRef.current = null
    void sessions.refetch()
  }

  function send(customText?: string) {
    const textToSend = customText ?? draft
    if (ask.isPending || countdown.secondsLeft > 0) return
    const problem = chatMessageProblem(textToSend)
    if (problem) return setFailure({ sessionId, message: problem })
    const { attempt, body } = nextAttempt(textToSend, sessionId, attemptRef.current)
    attemptRef.current = attempt
    setFailure(null)
    ask.mutate(body, {
      onSuccess: (answer) => {
        attemptRef.current = null
        setDraft((current) => (current.trim() === attempt.text ? '' : current))
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
          <Button variant="soft" icon="add" disabled={ask.isPending} onClick={openNew}>
            Cuộc trò chuyện mới
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {isDesktop ? (
          <aside aria-label="Các cuộc trò chuyện">
            <div className="flex h-full min-h-[580px] flex-col rounded-container border border-line bg-canvas p-3">
              <div className="mb-2 px-3 pt-2">
                <h2 className="text-meta font-semibold text-fg-2">Lịch sử trò chuyện</h2>
              </div>
              <div className="flex-1 overflow-y-auto">{list}</div>
            </div>
          </aside>
        ) : (
          <details className="group rounded-container border border-line bg-canvas px-3 py-2">
            <summary className="tap flex min-h-11 cursor-pointer items-center justify-between gap-3 text-body font-medium text-fg">
              Cuộc trò chuyện trước{sessions.data ? ` (${sessions.data.length})` : ''}
              <Icon name="expand_more" className="text-[20px] text-fg-2 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-2 border-t border-line pt-2">{list}</div>
          </details>
        )}

        <section
          aria-label="Cuộc trò chuyện"
          className="flex min-h-[580px] min-w-0 flex-col overflow-hidden rounded-container border border-line bg-canvas"
        >
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
            <ChatThread
              sessionId={sessionId}
              badSessionParam={badSessionParam}
              detail={detail}
              notices={notices}
              documentHref={isAdmin ? (id) => withId(ROUTES.admin.knowledgeDocument, id) : undefined}
              pendingQuestion={pendingHere ? (ask.variables?.message ?? '') : null}
              onOpenNew={openNew}
              onSelectPrompt={(prompt) => {
                setDraft(prompt)
              }}
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
              onSubmit={() => send()}
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
