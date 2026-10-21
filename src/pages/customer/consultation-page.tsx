import { useState } from 'react'
import { Avatar } from '@/components/common/ui/avatar'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Field, Textarea } from '@/components/common/ui/field'
import { ActivityList, KeyValueList, Notice, Photo } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { Stepper } from '@/components/common/ui/stepper'
import { ROUTES } from '@/routes/paths'
import { advisor, consultation } from '@/data/customer'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

export function ConsultationPage() {
  const query = useMockQuery(['customer', 'consultation', consultation.id], consultation)
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState<string[]>([])

  return (
    <QueryBoundary query={query}>
      {(data) => (
        <>
          <PageHeader
            back={{ to: ROUTES.customer.home, label: 'Tổng quan' }}
            meta={
              <>
                <Badge>{data.type}</Badge>
                <span>Gửi lúc {data.submitted}</span>
              </>
            }
            title={`Yêu cầu ${data.id}`}
            actions={<Button>Tải bản tóm tắt</Button>}
          />

          <Panel className="mb-12">
            <PanelHeader title={data.status} description={`Dự kiến xong bước này: ${data.estimatedCompletion}`} />
            <PanelBody>
              <Stepper steps={data.steps} />
            </PanelBody>
          </Panel>

          <div className="grid gap-x-12 gap-y-12 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <Panel>
                <PanelHeader title="Chuyên viên phụ trách" />
                <PanelBody className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={advisor.name} size="lg" />
                    <div className="min-w-0">
                      <p className="font-medium">{advisor.name}</p>
                      <p className="text-meta text-fg-3">
                        {advisor.title}, {advisor.team}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body">
                        <a href={`tel:${advisor.phone}`} className="tap text-fg-2 hover:text-fg">
                          {advisor.phone}
                        </a>
                        <a href={`mailto:${advisor.email}`} className="tap text-fg-2 hover:text-fg">
                          {advisor.email}
                        </a>
                      </div>
                    </div>
                  </div>
                  <Notice tone="ok" title="Đã xác nhận lịch kiểm tra">
                    {advisor.name.split(' ')[0]} đã hẹn kiểm tra mái tại nhà vào {data.inspection.when}.{' '}
                    {data.inspection.scope}
                  </Notice>
                </PanelBody>
                <PanelFooter>
                  <Button>Đổi lịch hẹn</Button>
                </PanelFooter>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Thông tin nhà đã gửi"
                  action={
                    <Button size="sm" variant="ghost">
                      Sửa thông tin nhà
                    </Button>
                  }
                />
                <PanelBody>
                  <KeyValueList columns={2} items={data.propertyData} />
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Ảnh đã gửi"
                  action={
                    <Button size="sm" variant="ghost">
                      Tải thêm ảnh
                    </Button>
                  }
                />
                <PanelBody>
                  <ul className="grid gap-4 sm:grid-cols-3">
                    {data.photos.map((p) => (
                      <li key={p.name}>
                        <Photo src={p.src} alt={p.name} caption={p.name} meta={p.meta} />
                      </li>
                    ))}
                  </ul>
                </PanelBody>
              </Panel>
            </div>

            <div className="space-y-8 lg:border-l lg:border-line lg:pl-8">
              <Panel>
                <PanelHeader title="Ngày 24/10 sẽ làm gì?" />
                <PanelBody className="space-y-4 text-body">
                  <p className="text-fg-2">
                    Buổi khảo sát mất {data.inspection.duration}. {data.inspection.access}
                  </p>
                  <ul className="space-y-2">
                    {data.inspection.checklist.map((c) => (
                      <li key={c} className="flex gap-2">
                        <span aria-hidden className="mt-2 size-1 shrink-0 rounded-control bg-fg-3" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </PanelBody>
                <PanelFooter>
                  <Button size="sm">Thêm vào lịch</Button>
                </PanelFooter>
              </Panel>

              <Panel>
                <PanelHeader title="Hoạt động" description={`${data.activity.length} cập nhật`} />
                <PanelBody>
                  <ActivityList items={data.activity} />
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title="Ghi chú cho người khảo sát" />
                <PanelBody className="space-y-4">
                  <blockquote className="border-l-2 border-line-2 pl-3 text-body text-fg-2">
                    <p>{data.homeownerNote}</p>
                    <footer className="mt-1 text-meta text-fg-3">{data.homeownerNoteMeta}</footer>
                  </blockquote>
                  {notes.map((n, i) => (
                    <blockquote key={i} className="border-l-2 border-accent pl-3 text-body text-fg-2">
                      <p>{n}</p>
                      <footer className="mt-1 text-meta text-fg-3">Eleanor V., vừa xong</footer>
                    </blockquote>
                  ))}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!note.trim()) return
                      setNotes((list) => [...list, note.trim()])
                      setNote('')
                    }}
                    className="space-y-2"
                  >
                    <Field label={`Thêm ghi chú cho ${advisor.name.split(' ')[0]}`} htmlFor="note">
                      <Textarea
                        id="note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Mã cổng, chỗ đỗ xe, thú cưng"
                        rows={3}
                      />
                    </Field>
                    <Button type="submit" size="sm" variant="primary" disabled={!note.trim()}>
                      Gửi ghi chú
                    </Button>
                  </form>
                </PanelBody>
              </Panel>
            </div>
          </div>

          <p className="mt-6 border-t border-line pt-4 text-body text-fg-2">
            Cần hỗ trợ về lịch hẹn này? {data.support}{' '}
            <a href="tel:18005557652" className="text-accent-fg hover:underline">
              Gọi bộ phận hỗ trợ
            </a>
          </p>
        </>
      )}
    </QueryBoundary>
  )
}
