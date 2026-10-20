import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Textarea } from '@/components/common/ui/field'
import { KeyValueList } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { PlaceholderLink } from '@/components/common/ui/placeholder-link'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { assistant } from '@/data/customer'
import { cx } from '@/utils/cx'

type Message = { id: number; role: 'user' | 'assistant'; time: string; text: string }

export function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const streamRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight })
  }, [messages, typing])

  function send(text: string) {
    const t = text.trim()
    if (!t) return
    setMessages((m) => [...m, { id: Date.now(), role: 'user', time: 'Vừa xong', text: t }])
    setDraft('')
    setTyping(true)
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { id: Date.now() + 1, role: 'assistant', time: 'Vừa xong', text: assistant.cannedReply },
      ])
      setTyping(false)
    }, 850)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    send(draft)
  }

  return (
    <>
      <PageHeader
        title="Trợ lý điện mặt trời"
        actions={<Button onClick={() => setMessages([])}>Cuộc trò chuyện mới</Button>}
      />
      <div className="grid gap-x-12 gap-y-12 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="order-2 space-y-8 lg:order-1">
          <Panel>
            <PanelHeader title="Thông tin hệ thống" action={<Badge tone="ok">{assistant.profile.status}</Badge>} />
            <PanelBody>
              <KeyValueList
                items={[
                  { k: 'Hệ thống', v: assistant.profile.system },
                  { k: 'Hợp đồng', v: <span className="text-fg-2">{assistant.profile.contract}</span> },
                ]}
              />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Trợ lý am hiểu về" />
            <PanelBody>
              <p className="text-body text-fg-2">{assistant.domains.join(', ')}.</p>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Trò chuyện gần đây"
              action={
                <Button size="sm" variant="ghost">
                  Xem tất cả
                </Button>
              }
            />
            <PanelBody>
              <ul className="divide-y divide-line">
                {assistant.recent.map((r) => (
                  <li key={r.title}>
                    <button
                      type="button"
                      className="press -mx-2 w-full rounded-control px-2 py-3 text-left hover:bg-surface-2"
                    >
                      <p className="text-meta text-fg-3">{r.when}</p>
                      <p className="text-body font-medium">{r.title}</p>
                      <p className="text-meta text-fg-2">{r.meta}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </PanelBody>
          </Panel>
        </aside>

        <Panel className="order-1 flex min-h-[70dvh] flex-col border-t-0! pt-0! lg:order-2">
          <div ref={streamRef} className="flex-1 space-y-6 overflow-y-auto border-t border-line px-4 py-6 md:px-6">
            <div>
              <p className="mb-2 text-meta text-fg-3">Gợi ý cho nhà Oakwood</p>
              <ul className="flex flex-col items-start gap-2">
                {assistant.suggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => send(s)}
                      className="press inline-flex min-h-11 items-center text-left text-body text-fg-2 underline-offset-4 hover:text-fg hover:underline lg:min-h-8"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {messages.length === 0 && (
              <>
                <Bubble role="user" time={assistant.thread[0]!.time}>
                  {assistant.thread[0]!.text}
                </Bubble>
                <Bubble role="assistant" time={assistant.thread[1]!.time}>
                  <p className="font-medium">{assistant.thread[1]!.title}</p>
                  <p className="mt-1">{assistant.thread[1]!.text}</p>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                    {assistant.thread[1]!.tiers!.map((t) => (
                      <div key={t.name} className="rounded-container bg-surface-2 p-3">
                        <dt className="text-body font-medium">
                          <span className="tnum block text-meta text-fg-3">{t.years}</span>
                          {t.name}
                        </dt>
                        <dd className="mt-1 text-meta text-fg-2">{t.body}</dd>
                      </div>
                    ))}
                  </dl>
                  <PlaceholderLink className="mt-3 flex items-center gap-2 rounded-container border border-line px-3 py-2 text-body hover:bg-surface-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{assistant.thread[1]!.attachment!.name}</span>
                      <span className="block text-meta text-fg-3">{assistant.thread[1]!.attachment!.meta}</span>
                    </span>
                  </PlaceholderLink>
                  <p className="mt-3">{assistant.thread[1]!.footer}</p>
                </Bubble>
              </>
            )}

            {messages.map((m) => (
              <Bubble key={m.id} role={m.role} time={m.time}>
                {m.text}
              </Bubble>
            ))}
            {typing && (
              <p className="text-meta text-fg-3" aria-live="polite">
                Trợ lý đang trả lời
              </p>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-line px-4 py-4 md:px-6">
            <div className="flex items-end gap-3">
              <Button type="button" variant="ghost" size="sm">
                Đính kèm
              </Button>
              <Textarea
                aria-label="Tin nhắn"
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send(draft)
                  }
                }}
                placeholder="Hỏi bất cứ điều gì về lắp đặt, thiết bị hay thanh toán"
                className="min-h-11 resize-none lg:min-h-10"
              />
              <Button type="submit" variant="primary" disabled={!draft.trim()}>
                Gửi
              </Button>
            </div>
            <p className="mt-2 text-meta text-fg-3">{assistant.disclaimer}</p>
          </form>
        </Panel>
      </div>
    </>
  )
}

function Bubble({ role, time, children }: { role: 'user' | 'assistant'; time: string; children: React.ReactNode }) {
  const isUser = role === 'user'
  return (
    <div className={cx('flex gap-3', isUser && 'justify-end')}>
      {!isUser && <span className="hidden w-16 shrink-0 pt-3 text-meta text-fg-3 sm:block">Trợ lý</span>}
      <div className={cx('min-w-0 max-w-full lg:max-w-prose', isUser && 'text-right')}>
        <div
          className={cx(
            'inline-block max-w-full rounded-container px-4 py-3 text-left text-body',
            isUser ? 'bg-accent text-on-accent' : 'border border-line bg-canvas',
          )}
        >
          {children}
        </div>
        <p className="mt-1 text-meta text-fg-3">{time}</p>
      </div>
    </div>
  )
}
