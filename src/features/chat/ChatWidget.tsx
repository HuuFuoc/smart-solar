import { useEffect, useRef, useState } from 'react'
import { Button, ButtonLink, IconButton } from '@/components/common/ui/button'
import { UnavailableState } from '@/components/common/ui/states'
import { useAuth } from '@/context/AuthProvider'
import { AdvisorInputs } from '@/features/chat/AdvisorInputs'
import { EMPTY_ADVISOR, advisorBody, advisorFormErrors } from '@/features/chat/advisorRules'
import { ChatComposer } from '@/features/chat/ChatComposer'
import { ChatSessionList } from '@/features/chat/ChatSessionList'
import { ChatThread } from '@/features/chat/ChatThread'
import { CHAT_UNAVAILABLE, CHAT_UNAVAILABLE_ADMIN, chatSendError } from '@/features/chat/chatDisplay'
import { chatMessageProblem, isSessionId, nextAttempt, type ChatAttempt } from '@/features/chat/chatRules'
import {
  useAskChatMutation,
  useChatAdvisors,
  useChatNotices,
  useChatSessionQuery,
  useChatSessionsQuery,
} from '@/hooks/useChat'
import { useLatest } from '@/hooks/useLatest'
import { useRetryCountdown } from '@/hooks/useRetryCountdown'
import { ROUTES, withId } from '@/routes/paths'
import { isApiError, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import { cx } from '@/utils/cx'

// Trợ lý hỏi đáp theo tài liệu đã công bố: ô chat nổi góc phải dưới trên mọi trang của 5 cổng (hai khung gắn sẵn).
// Nằm trong khung nên chuyển trang không mất cuộc trò chuyện; cuộc đang mở và trạng thái mở / đóng nhớ trong
// sessionStorage theo người dùng để tải lại trang vẫn đúng chỗ

const STORAGE_KEY = 'smart-solar.chat'

type Saved = { open: boolean; sessionId: string | null }

function readSaved(userKey: string): Saved {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(`${STORAGE_KEY}.${userKey}`) ?? 'null') as Partial<Saved>
    const id = saved?.sessionId ?? null
    return { open: saved?.open === true, sessionId: isSessionId(id) ? id : null }
  } catch {
    return { open: false, sessionId: null }
  }
}

function writeSaved(userKey: string, saved: Saved) {
  try {
    window.sessionStorage.setItem(`${STORAGE_KEY}.${userKey}`, JSON.stringify(saved))
  } catch {
    // Trình duyệt chặn lưu trữ: chỉ mất phần nhớ khi tải lại trang
  }
}

export function ChatWidget() {
  const { user } = useAuth()
  // Khung được vẽ làm màn chờ trước khi phiên khôi phục xong: chưa có người dùng thì chưa có trợ lý
  if (!user) return null
  const userKey = user.userId ?? user.email
  return <UserChatWidget key={userKey} userKey={userKey} isAdmin={user.role === 'admin'} />
}

function UserChatWidget({ userKey, isAdmin }: { userKey: string; isAdmin: boolean }) {
  const [saved] = useState(() => readSaved(userKey))
  const [open, setOpen] = useState(saved.open)
  // Mở lần đầu mới gọi API; đóng thì chỉ ẩn khung để cuộc trò chuyện và chữ đang gõ còn nguyên
  const [mounted, setMounted] = useState(saved.open)
  const [sessionId, setSessionId] = useState<string | null>(saved.sessionId)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef(false)

  useEffect(() => writeSaved(userKey, { open, sessionId }), [userKey, open, sessionId])

  useEffect(() => {
    if (open || !returnFocus.current) return
    returnFocus.current = false
    launcherRef.current?.focus()
  }, [open])

  return (
    <>
      {mounted && (
        <ChatPanel
          hidden={!open}
          isAdmin={isAdmin}
          sessionId={sessionId}
          onSessionChange={setSessionId}
          onClose={() => {
            returnFocus.current = true
            setOpen(false)
          }}
        />
      )}
      {!open && (
        <Button
          ref={launcherRef}
          data-chat-launcher
          variant="secondary"
          icon="smart_toy"
          aria-haspopup="dialog"
          className="fixed right-4 bottom-4 z-30 shadow-pop"
          onClick={() => {
            setMounted(true)
            setOpen(true)
          }}
        >
          Trợ lý
        </Button>
      )}
    </>
  )
}

function ChatPanel({
  hidden,
  isAdmin,
  sessionId,
  onSessionChange,
  onClose,
}: {
  hidden: boolean
  isAdmin: boolean
  sessionId: string | null
  onSessionChange: (sessionId: string | null) => void
  onClose: () => void
}) {
  const sessions = useChatSessionsQuery()
  const detail = useChatSessionQuery(sessionId)
  const notices = useChatNotices()
  const advisors = useChatAdvisors()
  const ask = useAskChatMutation()
  const [advisorForm, setAdvisorForm] = useState(EMPTY_ADVISOR)
  const [view, setView] = useState<'chat' | 'history'>('chat')
  const [draft, setDraft] = useState('')
  const [failure, setFailure] = useState<{ sessionId: string | null; message: string } | null>(null)
  const attemptRef = useRef<ChatAttempt | null>(null)
  const viewRef = useLatest(sessionId)
  const countdown = useRetryCountdown(() => setFailure(null))
  const panelRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const unavailable = [sessions.error, detail.error, ask.error].find((e) => isFeatureUnavailable(e))

  // Mở khung thì đưa con trỏ vào ô hỏi để gõ ngay; ô hỏi bị gỡ (trợ lý chưa bật) thì giữ con trỏ trong khung
  useEffect(() => {
    if (hidden) return
    const box = panelRef.current?.querySelector<HTMLElement>('#chat-message')
    ;(box ?? panelRef.current)?.focus()
  }, [hidden, view, unavailable])

  // Esc đóng khung kể cả khi con trỏ đang ở trang; có hộp thoại khác đang mở thì Esc là của hộp thoại đó
  const close = useLatest(onClose)
  useEffect(() => {
    if (hidden) return
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key !== 'Escape' ||
        e.defaultPrevented ||
        document.querySelector('dialog[open], [role=dialog]:not([data-chat-panel])')
      )
        return
      close.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hidden, close])

  const messageCount = detail.data?.messages.length ?? 0
  useEffect(() => {
    const box = scrollRef.current
    if (hidden || view !== 'chat' || !box || (messageCount === 0 && !ask.isPending)) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    box.scrollTo({ top: box.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [messageCount, ask.isPending, sessionId, hidden, view])

  function openSession(id: string | null) {
    onSessionChange(id)
    setView('chat')
    setFailure(null)
    attemptRef.current = null
  }

  function openNew() {
    openSession(null)
    setDraft('')
    void sessions.refetch()
  }

  function send() {
    if (ask.isPending || countdown.secondsLeft > 0) return
    const problem = chatMessageProblem(draft)
    if (problem) return setFailure({ sessionId, message: problem })
    if (Object.keys(advisorFormErrors(advisorForm)).length > 0)
      return setFailure({ sessionId, message: 'Sửa số liệu tư vấn cấu hình đang báo lỗi trước khi gửi.' })
    const { attempt, body } = nextAttempt(draft, sessionId, attemptRef.current)
    attemptRef.current = attempt
    setFailure(null)
    // Số liệu tư vấn gửi kèm câu này rồi xoá; các câu sau backend tự dùng lại số liệu đã nói trong phiên
    const advisor = advisorBody(advisorForm)
    ask.mutate(advisor ? { ...body, advisor } : body, {
      onSuccess: (answer) => {
        attemptRef.current = null
        setDraft((current) => (current.trim() === attempt.text ? '' : current))
        if (advisor) setAdvisorForm(EMPTY_ADVISOR)
        // Người dùng đã chuyển sang cuộc khác trong lúc chờ thì không kéo họ về
        if (attempt.sessionId === null && viewRef.current === null) onSessionChange(answer.sessionId)
      },
      onError: (error) => {
        if (isApiError(error) && error.status === 429 && error.retryAfter) countdown.start(error.retryAfter)
        setFailure({ sessionId: attempt.sessionId, message: chatSendError(error) })
      },
    })
  }

  const pendingHere = ask.isPending && (ask.variables?.sessionId ?? null) === sessionId
  const title = view === 'history' ? 'Cuộc trò chuyện trước' : (detail.data?.session.title ?? null)

  return (
    <section
      ref={panelRef}
      role="dialog"
      aria-label="Trợ lý"
      data-chat-panel
      tabIndex={-1}
      className={cx(
        hidden ? 'hidden' : 'flex',
        'fixed inset-x-2 top-14 bottom-2 z-30 flex-col overflow-hidden rounded-container border border-line bg-canvas shadow-pop',
        'sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[min(40rem,calc(100dvh-2rem))] sm:w-104',
      )}
    >
      <header className="flex shrink-0 items-center gap-1 border-b border-line py-2 pr-2 pl-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-body font-semibold text-fg">Trợ lý</h2>
          {title && <p className="truncate text-meta text-fg-2">{title}</p>}
        </div>
        {view === 'chat' ? (
          <IconButton
            icon="history"
            label="Cuộc trò chuyện trước"
            size="sm"
            disabled={ask.isPending}
            onClick={() => setView('history')}
          />
        ) : (
          <IconButton icon="chat" label="Về cuộc trò chuyện" size="sm" onClick={() => setView('chat')} />
        )}
        <IconButton icon="add" label="Cuộc trò chuyện mới" size="sm" disabled={ask.isPending} onClick={openNew} />
        <IconButton icon="close" label="Đóng trợ lý" size="sm" onClick={onClose} />
      </header>

      {unavailable ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <UnavailableState
            title="Trợ lý chưa sẵn sàng."
            message={isAdmin ? CHAT_UNAVAILABLE_ADMIN : CHAT_UNAVAILABLE}
            pendingMigrations={isAdmin ? pendingMigrationsOf(unavailable) : []}
          />
          {isAdmin && (
            <ButtonLink to={ROUTES.admin.knowledgeBase} variant="info" icon="menu_book" size="sm">
              Mở Kho tri thức AI
            </ButtonLink>
          )}
        </div>
      ) : view === 'history' ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          <ChatSessionList query={sessions} activeId={sessionId} locked={ask.isPending} onSelect={openSession} />
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <ChatThread
              sessionId={sessionId}
              badSessionParam={false}
              detail={detail}
              notices={notices}
              advisors={advisors}
              documentHref={isAdmin ? (id) => withId(ROUTES.admin.knowledgeDocument, id) : undefined}
              pendingQuestion={pendingHere ? (ask.variables?.message ?? '') : null}
              onOpenNew={openNew}
              onSelectPrompt={setDraft}
            />
          </div>
          {!(sessionId && detail.isError) && (
            <AdvisorInputs value={advisorForm} onChange={setAdvisorForm} disabled={ask.isPending} />
          )}
          {!(sessionId && detail.isError) && (
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
        </>
      )}
    </section>
  )
}
