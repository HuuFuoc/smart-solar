import { useRef, useState } from 'react'
import { Avatar } from '@/components/common/ui/avatar'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Dialog, DialogFooter, DialogTitle } from '@/components/common/ui/dialog'
import { Field, Textarea } from '@/components/common/ui/field'
import { KeyValueList, Notice, Photo } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { PlaceholderLink } from '@/components/common/ui/placeholder-link'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { Stepper } from '@/components/common/ui/stepper'
import { ROUTES } from '@/routes/paths'
import { warrantyRequest } from '@/data/customer'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

type Modal = { title: string; description: string; placeholder: string }

const MODALS: Record<'message' | 'reschedule', Modal> = {
  message: {
    title: 'Nhắn cho Alex',
    description: 'Alex sẽ nhận ghi chú này trên thiết bị hiện trường khi đang di chuyển tới nhà Oakwood.',
    placeholder: 'Cổng bên không khoá. Trong nhà có chó golden hiền.',
  },
  reschedule: {
    title: 'Yêu cầu đổi khung giờ',
    description: 'Cho biết các ngày thay thế bạn muốn và buổi sáng hay chiều tiện hơn.',
    placeholder: 'Muốn sáng Thứ Tư 13/11 hoặc sáng Thứ Năm 14/11.',
  },
}

export function WarrantyRequestPage() {
  const query = useMockQuery(['customer', 'warranty-request', warrantyRequest.id], warrantyRequest)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [modal, setModal] = useState<keyof typeof MODALS>('message')
  const [text, setText] = useState('')
  const [sent, setSent] = useState<string | null>(null)

  function open(kind: keyof typeof MODALS) {
    setModal(kind)
    setText('')
    dialogRef.current?.showModal()
  }

  return (
    <QueryBoundary query={query}>
      {(data) => (
        <>
          <PageHeader
            back={{ to: ROUTES.customer.warranty, label: 'Bảo hành & bảo trì' }}
            meta={
              <>
                <span className="text-fg-2">{data.id}</span>
                <Badge tone="warn">{data.status}</Badge>
                <span>{data.tier}</span>
              </>
            }
            title={data.title}
            description={data.site}
            actions={
              <>
                <Button>Xuất bản tóm tắt</Button>
                <Button variant="primary" onClick={() => open('message')}>
                  Nhắn kỹ thuật viên
                </Button>
              </>
            }
          />

          {sent && (
            <Notice tone="ok" className="mb-8">
              {sent}
            </Notice>
          )}

          <Panel className="mb-12">
            <PanelBody className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
              <div>
                <p className="mb-3 text-body font-medium">Tiến trình yêu cầu, giai đoạn 4/5</p>
                <Stepper steps={data.steps} />
              </div>
              <div className="lg:border-l lg:border-line lg:pl-6">
                <p className="text-body text-fg-2">Khung giờ dịch vụ</p>
                <p className="mt-1 text-title font-semibold">{data.window.date}</p>
                <p className="tnum text-body text-fg-2">{data.window.time}</p>
                <Badge tone="ok" className="mt-2">
                  {data.window.access}
                </Badge>
              </div>
            </PanelBody>
          </Panel>

          <div className="grid gap-x-12 gap-y-12 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <Panel>
                <PanelHeader title="Sự cố đã báo" />
                <PanelBody className="space-y-4">
                  <blockquote className="border-l-2 border-line-2 pl-3 text-body text-fg-2">
                    {data.description}
                  </blockquote>
                  <div>
                    <p className="mb-2 text-body font-medium">Ảnh đính kèm ({data.photos.length})</p>
                    <ul className="grid gap-4 sm:grid-cols-2">
                      {data.photos.map((p) => (
                        <li key={p.caption}>
                          <Photo src={p.src} alt={p.caption} caption={p.caption} meta={p.meta} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Đánh giá và phương án của kỹ thuật viên"
                  description={`Tóm tắt do ${data.technician.name} chuẩn bị`}
                />
                <PanelBody className="space-y-4">
                  <blockquote className="border-l-2 border-accent pl-3 text-body text-fg-2">
                    {data.plan.brief}
                  </blockquote>
                  <KeyValueList items={data.plan.impact} />
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Xác nhận sau dịch vụ"
                  description={`So sánh hiện trạng khi gửi với biên bản sau dịch vụ. Quy trình ${data.verification.protocol}.`}
                />
                <PanelBody className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="text-body font-medium">Hiện trạng khi báo</p>
                    <p className="text-meta text-fg-3">Gửi ngày {data.verification.before.date}</p>
                    <Photo src={data.verification.before.src} alt="Ảnh hiện trạng khách gửi" className="mt-2" />
                    <p className="mt-2 text-body text-fg-2">{data.verification.before.body}</p>
                  </div>
                  <div>
                    <p className="text-body font-medium">Kiểm tra sau dịch vụ</p>
                    <p className="text-meta text-fg-3">Chờ tới nhà</p>
                    <div className="mt-2 flex aspect-[4/3] items-center justify-center rounded-container border border-dashed border-line-2 px-4 text-center text-body text-fg-2">
                      Chờ hoàn tất tại hiện trường
                    </div>
                    <p className="mt-2 text-body text-fg-2">{data.verification.after}</p>
                  </div>
                </PanelBody>
              </Panel>
            </div>

            <div className="space-y-8 lg:border-l lg:border-line lg:pl-8">
              <Panel>
                <PanelHeader title="Chuyên viên có chứng chỉ" />
                <PanelBody className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={data.technician.name} size="lg" />
                    <div className="min-w-0">
                      <p className="font-medium">{data.technician.name}</p>
                      <p className="text-meta text-fg-3">{data.technician.cert}</p>
                      <p className="text-meta text-fg-3">{data.technician.exp}</p>
                    </div>
                  </div>
                  <KeyValueList
                    className="border-t border-line pt-4"
                    items={[
                      { k: 'Điện thoại trực tiếp', v: <span className="tnum">{data.technician.phone}</span> },
                      { k: 'Kiểm tra lý lịch', v: data.technician.background },
                      { k: 'Xe dịch vụ', v: data.technician.van },
                    ]}
                  />
                </PanelBody>
                <PanelFooter>
                  <Button className="w-full">Gọi trực tiếp {data.technician.name.split(' ')[0]}</Button>
                </PanelFooter>
              </Panel>

              <Panel>
                <PanelHeader title="Điều chỉnh lịch hẹn" />
                <PanelBody className="space-y-2">
                  <Button className="w-full justify-start" onClick={() => open('reschedule')}>
                    Đổi lịch hẹn
                  </Button>
                  <a
                    href="tel:18005557652"
                    className="flex h-11 items-center justify-between rounded-control px-3 text-body text-fg-2 hover:bg-surface-2 lg:h-10"
                  >
                    <span>Gọi bộ phận hỗ trợ</span>
                    <span className="tnum text-meta">{data.supportPhone}</span>
                  </a>
                </PanelBody>
              </Panel>

              <Notice title="Cam kết bảo hành">
                {data.guarantee}{' '}
                <PlaceholderLink className="text-accent-fg hover:underline">Đọc điều khoản bảo hành</PlaceholderLink>
              </Notice>
            </div>
          </div>

          <Dialog ref={dialogRef}>
            <form
              method="dialog"
              onSubmit={() =>
                setSent(
                  modal === 'message'
                    ? `Đã gửi ghi chú tới ${data.technician.name}.`
                    : 'Đã gửi yêu cầu đổi lịch cho điều phối. Bạn sẽ nhận xác nhận trong vòng một ngày làm việc.',
                )
              }
            >
              <DialogTitle>{MODALS[modal].title}</DialogTitle>
              <p className="mt-1 text-body text-fg-2">{MODALS[modal].description}</p>
              <Field label="Nội dung" htmlFor="modal-text" className="mt-4">
                <Textarea
                  id="modal-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={MODALS[modal].placeholder}
                />
              </Field>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => dialogRef.current?.close()}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" disabled={!text.trim()}>
                  Gửi
                </Button>
              </DialogFooter>
            </form>
          </Dialog>
        </>
      )}
    </QueryBoundary>
  )
}
