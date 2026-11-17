import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { CHAT_LIMITS } from '@/common/chat'
import { Button, ButtonLink, IconButton } from '@/components/common/ui/button'
import { UnavailableState } from '@/components/common/ui/states'
import { useAuth } from '@/context/AuthProvider'
import { AdvisorInputs } from '@/features/chat/AdvisorInputs'
import { EMPTY_ADVISOR, advisorBody, advisorFormErrors } from '@/features/chat/advisorRules'
import { ChatComposer } from '@/features/chat/ChatComposer'
import { ChatSessionList } from '@/features/chat/ChatSessionList'
import { ChatThread } from '@/features/chat/ChatThread'
import { CHAT_UNAVAILABLE, CHAT_UNAVAILABLE_ADMIN, chatSendError } from '@/features/chat/chatDisplay'
import {
  activeBlock,
  chatBlockOf,
  chatLimitState,
  chatMessageProblem,
  inProgressRetryDelay,
  isLastingBlock,
  isSessionId,
  messageMaxAfter,
  nextAttempt,
  type ChatAttempt,
  type ChatBlock,
} from '@/features/chat/chatRules'
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
import { isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import type { AskChatRequest } from '@/types/req/chatReq'
import { cx } from '@/utils/cx'

// Trợ lý hỏi đáp theo tài liệu đã công bố: ô chat nổi góc phải dưới trên mọi trang của 5 cổng (hai khung gắn sẵn).
// Nằm trong khung nên chuyển trang không mất cuộc trò chuyện; cuộc đang mở, trạng thái mở / đóng và giới hạn đang chặn (hết
// lượt, tạm ngưng) nhớ trong sessionStorage theo người dùng để tải lại trang vẫn đúng chỗ, không tưởng là đã hỏi lại được

const STORAGE_KEY = 'smart-solar.chat'

type Saved = { open: boolean; sessionId: string | null; block: ChatBlock | null }

function readSaved(userKey: string): Saved {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(`${STORAGE_KEY}.${userKey}`) ?? 'null') as Partial<Saved>
    const id = saved?.sessionId ?? null
    return {
      open: saved?.open === true,
      sessionId: isSessionId(id) ? id : null,
      block: activeBlock(saved?.block, Date.now()),
    }
  } catch {
    return { open: false, sessionId: null, block: null }
  }
}

function writeSaved(userKey: string, saved: Saved) {
  try {
    const block = saved.block && isLastingBlock(saved.block.kind) ? saved.block : null
    window.sessionStorage.setItem(`${STORAGE_KEY}.${userKey}`, JSON.stringify({ ...saved, block }))
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
  const [block, setBlock] = useState<ChatBlock | null>(saved.block)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef(false)

  useEffect(() => writeSaved(userKey, { open, sessionId, block }), [userKey, open, sessionId, block])

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
          block={block}
          onBlockChange={setBlock}
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
  block,
  onBlockChange,
  onClose,
}: {
  hidden: boolean
  isAdmin: boolean
  sessionId: string | null
  onSessionChange: (sessionId: string | null) => void
  /** Giới hạn backend vừa báo khi gửi câu; hết khi có câu trả lời hoặc hết giờ chờ */
  block: ChatBlock | null
  onBlockChange: Dispatch<SetStateAction<ChatBlock | null>>
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
  // Ngưỡng ký tự: mặc định của backend, hạ xuống khi backend báo ngưỡng quản trị đặt thấp hơn
  const [messageMax, setMessageMax] = useState<number>(CHAT_LIMITS.messageMax)
  // Đang chờ để tự gửi lại đúng câu backend báo là đang trả lời
  const [retrying, setRetrying] = useState(false)
  const retryTimer = useRef<number | null>(null)
  const attemptRef = useRef<ChatAttempt | null>(null)
  const viewRef = useLatest(sessionId)
  const countdown = useRetryCountdown(() => {
    setFailure(null)
    onBlockChange((b) => (b && !isLastingBlock(b.kind) ? null : b))
  })
  const panelRef = useRef<HTMLElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const unavailable = [sessions.error, detail.error, ask.error].find((e) => isFeatureUnavailable(e))
  const sending = ask.isPending || retrying

  useEffect(
    () => () => {
      if (retryTimer.current !== null) window.clearTimeout(retryTimer.current)
    },
    [],
  )

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
    if (hidden || view !== 'chat' || !box || (messageCount === 0 && !sending)) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    box.scrollTo({ top: box.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [messageCount, sending, sessionId, hidden, view])

  function stopRetry() {
    if (retryTimer.current !== null) window.clearTimeout(retryTimer.current)
    retryTimer.current = null
    setRetrying(false)
  }

  function openSession(id: string | null) {
    stopRetry()
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
    if (sending || countdown.secondsLeft > 0) return
    const problem = chatMessageProblem(draft, messageMax)
    if (problem) return setFailure({ sessionId, message: problem })
    if (Object.keys(advisorFormErrors(advisorForm)).length > 0)
      return setFailure({ sessionId, message: 'Sửa số liệu tư vấn cấu hình đang báo lỗi trước khi gửi.' })
    const { attempt, body } = nextAttempt(draft, sessionId, attemptRef.current)
    attemptRef.current = attempt
    setFailure(null)
    // Hết lượt / tạm ngưng không tự hết trên máy: gửi lại thì backend trả lời hoặc báo lại giới hạn
    onBlockChange(null)
    // Số liệu tư vấn gửi kèm câu này rồi xoá; các câu sau backend tự dùng lại số liệu đã nói trong phiên
    const advisor = advisorBody(advisorForm)
    submit(advisor ? { ...body, advisor } : body, attempt, 0)
  }

  // Mỗi lần chỉ một lệnh gửi; tự gửi lại (cùng body, cùng clientMessageId) chỉ sau khi lệnh trước đã trả lỗi
  function submit(body: AskChatRequest, attempt: ChatAttempt, retriesDone: number) {
    ask.mutate(body, {
      onSuccess: (answer) => {
        setRetrying(false)
        attemptRef.current = null
        setDraft((current) => (current.trim() === attempt.text ? '' : current))
        if (body.advisor) setAdvisorForm(EMPTY_ADVISOR)
        // Người dùng đã chuyển sang cuộc khác trong lúc chờ thì không kéo họ về
        if (attempt.sessionId === null && viewRef.current === null) onSessionChange(answer.sessionId)
      },
      onError: (error) => {
        const delay = inProgressRetryDelay(error, retriesDone)
        if (delay !== null) {
          setRetrying(true)
          retryTimer.current = window.setTimeout(() => {
            retryTimer.current = null
            // Đã chuyển cuộc trò chuyện trong lúc chờ thì thôi gửi lại
            if (attemptRef.current?.clientMessageId !== attempt.clientMessageId) return setRetrying(false)
            submit(body, attempt, retriesDone + 1)
          }, delay * 1000)
          return
        }
        setRetrying(false)
        setMessageMax((current) => messageMaxAfter(error, current))
        const now = Date.now()
        const limit = chatBlockOf(error, now)
        if (limit) {
          onBlockChange(limit)
          if (limit.until !== null && !isLastingBlock(limit.kind))
            countdown.start(Math.max(1, Math.ceil((limit.until - now) / 1000)))
        }
        setFailure({ sessionId: attempt.sessionId, message: chatSendError(error, now) })
      },
    })
  }

  const pendingHere = sending && (ask.variables?.sessionId ?? null) === sessionId
  const limit = chatLimitState({ text: draft, max: messageMax, block, waitSeconds: countdown.secondsLeft })
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
            disabled={sending}
            onClick={() => setView('history')}
          />
        ) : (
          <IconButton icon="chat" label="Về cuộc trò chuyện" size="sm" onClick={() => setView('chat')} />
        )}
        <IconButton icon="add" label="Cuộc trò chuyện mới" size="sm" disabled={sending} onClick={openNew} />
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
          <ChatSessionList query={sessions} activeId={sessionId} locked={sending} onSelect={openSession} />
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
            <AdvisorInputs value={advisorForm} onChange={setAdvisorForm} disabled={sending} />
          )}
          {!(sessionId && detail.isError) && (
            <ChatComposer
              value={draft}
              onChange={(value) => {
                setDraft(value)
                if (failure && countdown.secondsLeft === 0) setFailure(null)
              }}
              onSubmit={send}
              sending={sending}
              waitSeconds={countdown.secondsLeft}
              max={messageMax}
              limit={limit}
              error={failure && failure.sessionId === sessionId ? failure.message : null}
            />
          )}
        </>
      )}
    </section>
  )
}
