import { useRef, useState } from 'react'
import { Avatar } from '@/components/common/ui/avatar'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Dialog, DialogFooter, DialogTitle } from '@/components/common/ui/dialog'
import { Checkbox, Field, Textarea } from '@/components/common/ui/field'
import { Notice, Photo } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { ROUTES } from '@/routes/paths'
import { advisor, quotation } from '@/data/customer'
import { fmt } from '@/utils/format'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

export function QuotationPage() {
  const query = useMockQuery(['customer', 'quotation', quotation.id], quotation)
  const [agreed, setAgreed] = useState(false)
  const [signing, setSigning] = useState<'idle' | 'busy' | 'done'>('idle')
  const [question, setQuestion] = useState('')
  const [sent, setSent] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  function sign() {
    setSigning('busy')
    setTimeout(() => setSigning('done'), 1200)
  }

  return (
    <QueryBoundary query={query}>
      {(data) => (
        <>
          <PageHeader
            back={{ to: ROUTES.customer.home, label: 'Tổng quan' }}
            meta={
              <>
                <span className="text-fg-2">{data.id}</span>
                <Badge tone={signing === 'done' ? 'ok' : 'warn'}>
                  {signing === 'done' ? 'Đã chấp nhận' : data.status}
                </Badge>
                <span>
                  Còn hiệu lực {data.validDays} ngày, hết hạn {data.expires}
                </span>
              </>
            }
            title={data.title}
            description={`Phát hành ${data.issued}. Người lập: ${data.preparedBy}, tư vấn viên dự án cấp cao.`}
            actions={<Button>Tải PDF</Button>}
          />

          <Panel className="mb-12">
            <PanelBody className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-center">
              <Photo
                src={data.site.photo}
                alt={`Mái nhà tại ${data.site.address}`}
                ratio="aspect-[3/2]"
                caption={data.site.address}
                meta={data.site.detail}
              />
              <StatRow className="md:grid-cols-3">
                <Stat
                  label="Công suất dàn pin"
                  value={data.capacityKw}
                  unit="kW DC"
                  note="Tấm đơn tinh thể Tier-1 đen toàn phần"
                />
                <Stat
                  label="Sản lượng năm đầu"
                  value={fmt.num(data.year1Kwh)}
                  unit="kWh"
                  note="Mô phỏng bằng PVWatts"
                />
                <Stat label="Tỷ lệ bù điện năng" value={`${data.offsetPct}%`} note="Bù trừ điện năng" />
              </StatRow>
            </PanelBody>
          </Panel>

          <div className="grid gap-x-12 gap-y-12 lg:grid-cols-5">
            <div className="space-y-8 lg:col-span-3">
              <Panel>
                <PanelHeader title="Chi tiết thiết bị và nhân công" />
                <Table className="text-body">
                  <thead>
                    <tr>
                      <Th>Hạng mục</Th>
                      <Th>Số lượng</Th>
                      <Th className="text-right">Thành tiền</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((line) => (
                      <Tr key={line.name}>
                        <Td>
                          <p className="font-medium">{line.name}</p>
                          <p className="text-body text-fg-2">{line.detail}</p>
                        </Td>
                        <Td className="whitespace-nowrap text-fg-2">{line.qty}</Td>
                        <Td className="tnum text-right font-medium whitespace-nowrap">{fmt.usdCents(line.amount)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
                <PanelFooter className="justify-between">
                  <span className="text-body text-fg-2">Tổng giá hệ thống</span>
                  <span className="tnum font-semibold">{fmt.usdCents(data.gross)}</span>
                </PanelFooter>
              </Panel>

              <Panel>
                <PanelHeader title="Bảo hành đi kèm" />
                <PanelBody>
                  <dl className="grid gap-4 sm:grid-cols-3">
                    {data.warranties.map((w) => (
                      <div key={w.name}>
                        <dt className="font-medium">{w.name}</dt>
                        <dd className="text-body text-fg-2">{w.detail}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-6 border-t border-line pt-4 text-meta text-fg-3">{data.license}</p>
                </PanelBody>
              </Panel>
            </div>

            <div className="space-y-8 lg:col-span-2">
              <Panel id="accept" raised>
                <PanelHeader title="Tóm tắt chi phí" />
                <PanelBody>
                  <dl className="space-y-3 text-body">
                    <div className="flex justify-between gap-4">
                      <dt className="text-fg-2">Tổng giá hệ thống</dt>
                      <dd className="tnum font-medium">{fmt.usdCents(data.gross)}</dd>
                    </div>
                    {data.incentives.map((inc) => (
                      <div key={inc.name} className="flex justify-between gap-4">
                        <dt>
                          <span className="text-fg-2">{inc.name}</span>
                          <span className="block text-meta text-fg-3">{inc.detail}</span>
                        </dt>
                        <dd className="tnum font-medium whitespace-nowrap text-ok">{fmt.usdCents(inc.amount)}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 flex items-end justify-between gap-4 border-t border-line pt-4">
                    <div>
                      <p className="text-body font-medium">Chi phí thực chủ nhà trả</p>
                      <p className="text-meta text-fg-3">Đã trừ mọi ưu đãi</p>
                    </div>
                    <p className="tnum text-figure font-semibold">{fmt.usdCents(data.net)}</p>
                  </div>

                  <div className="mt-6 rounded-container bg-surface-2 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-body font-medium">Dòng tiền hằng tháng ước tính</p>
                      <Badge tone="ok">Tiết kiệm {fmt.usd(data.cashflow.savings)}/tháng</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-meta text-fg-3">Hoá đơn điện hiện tại</p>
                        <p className="tnum text-title font-semibold text-fg-3 line-through">
                          {fmt.usd(data.cashflow.currentBill)}
                        </p>
                      </div>
                      <div>
                        <p className="text-meta text-fg-3">Tiền trả góp điện mặt trời</p>
                        <p className="tnum text-title font-semibold">
                          {fmt.usd(data.cashflow.loanPayment)}{' '}
                          <span className="text-meta font-normal text-fg-3">/ tháng</span>
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-meta text-fg-3">{data.cashflow.terms}</p>
                  </div>

                  {signing === 'done' ? (
                    <Notice tone="ok" title="Đã chấp nhận báo giá" className="mt-6">
                      {data.id} đã được ký điện tử. {advisor.name} đã nhận thông báo để làm hồ sơ xin giấy phép với
                      thành phố.
                    </Notice>
                  ) : (
                    <div className="mt-6 space-y-3">
                      <Checkbox
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        label="Tôi đã xem phạm vi công việc và thông số kỹ thuật, đồng ý giữ mức giá này trong 30 ngày."
                      />
                      <Button
                        variant="primary"
                        className="w-full"
                        disabled={!agreed || signing === 'busy'}
                        onClick={sign}
                      >
                        {signing === 'busy' ? 'Đang xử lý chữ ký' : 'Chấp nhận và ký báo giá'}
                      </Button>
                    </div>
                  )}
                </PanelBody>
                <PanelFooter className="justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={advisor.name} size="sm" />
                    <div className="">
                      <p className="text-body font-medium">{advisor.name}</p>
                      <p className="text-meta text-fg-3">Tư vấn viên phụ trách</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => dialogRef.current?.showModal()}>
                    Hỏi {advisor.name.split(' ')[0]}
                  </Button>
                </PanelFooter>
              </Panel>
            </div>
          </div>

          <Dialog
            ref={dialogRef}
            onClose={() => {
              setSent(false)
              setQuestion('')
            }}
          >
            <form
              method="dialog"
              onSubmit={(e) => {
                if (!sent) {
                  e.preventDefault()
                  setSent(true)
                }
              }}
            >
              <DialogTitle>Trao đổi với {advisor.name}</DialogTitle>
              <p className="mt-1 text-body text-fg-2">
                Có câu hỏi về thiết bị, thêm pin lưu trữ hay cách lắp trên mái? {advisor.name.split(' ')[0]} sẽ trả lời
                qua cổng khách hàng hoặc điện thoại.
              </p>
              {sent ? (
                <Notice tone="ok" className="mt-4">
                  Đã chuyển ghi chú tới {advisor.name}. Dự kiến phản hồi trong 2 giờ.
                </Notice>
              ) : (
                <Field label="Câu hỏi hoặc ghi chú của bạn" htmlFor="question" className="mt-4">
                  <Textarea id="question" value={question} onChange={(e) => setQuestion(e.target.value)} />
                </Field>
              )}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => dialogRef.current?.close()}>
                  {sent ? 'Đóng' : 'Hủy'}
                </Button>
                {!sent && (
                  <Button type="submit" variant="primary" disabled={!question.trim()}>
                    Gửi câu hỏi
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Dialog>
        </>
      )}
    </QueryBoundary>
  )
}
