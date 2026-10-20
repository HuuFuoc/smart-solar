import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Button, buttonClass } from '@/components/common/ui/button'
import { Field, Select, Textarea } from '@/components/common/ui/field'
import { ActivityList, KeyValueList, Notice, Photo } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { PlaceholderLink } from '@/components/common/ui/placeholder-link'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { ROUTES } from '@/routes/paths'
import { approvalDetail } from '@/data/manage'
import { fmt } from '@/utils/format'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

type Decision = 'approved' | 'redline' | 'rejected'

export function ManageApprovalPage() {
  const query = useMockQuery(['manage', 'approval', approvalDetail.id], approvalDetail)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [counter, setCounter] = useState('')
  const [reason, setReason] = useState('')

  return (
    <QueryBoundary query={query}>
      {(data) => {
        const cogsPct = (data.guardrails.cogs / data.gross) * 100
        const minPct = (data.guardrails.hardMin / data.gross) * 100
        const finalPct = (data.final / data.gross) * 100
        return (
          <>
            <PageHeader
              back={{ to: ROUTES.manage.approvals, label: 'Duyệt báo giá' }}
              meta={
                <>
                  <span className="text-fg-2">{data.id}</span>
                  <Badge tone={decision === 'approved' ? 'ok' : decision === 'rejected' ? 'danger' : 'warn'}>
                    {decision === 'approved'
                      ? 'Đã duyệt'
                      : decision === 'rejected'
                        ? 'Đã từ chối'
                        : decision === 'redline'
                          ? 'Đã yêu cầu sửa'
                          : data.status}
                  </Badge>
                  <span>Gửi {data.submitted}</span>
                </>
              }
              title={`Đề xuất ${data.id}`}
              description="Cần xem ưu tiên, yêu cầu quyền duyệt cấp 3."
              actions={
                <>
                  <Button>Xem trước PDF gửi khách</Button>
                  <a href="#decision" className={buttonClass('secondary')}>
                    Tới phần quyết định
                  </a>
                </>
              }
            />

            <div className="mb-12 grid gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
              <Notice tone="warn" title={`${data.exception.title}. Chính sách ${data.exception.policy}.`}>
                <p>{data.exception.body}</p>
                <blockquote className="mt-3 border-l-2 border-warn/40 pl-3 text-fg-2">
                  <p className="mb-1 text-meta text-fg-3">Ghi chú của Marcus Chen (kinh doanh)</p>
                  {data.exception.repNote}
                </blockquote>
              </Notice>
              <Panel>
                <PanelBody className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-body text-fg-2">Biên lợi nhuận gộp</p>
                    <p className="tnum text-figure font-semibold">{data.margin.pct}%</p>
                    <Badge tone="ok">Đạt, mức sàn {data.margin.floor}%</Badge>
                  </div>
                  <div className="border-l border-line pl-6">
                    <p className="text-body text-fg-2">Lợi nhuận đóng góp thực</p>
                    <p className="tnum text-figure font-semibold">{fmt.usdCents(data.margin.contribution)}</p>
                    <p className="text-meta text-fg-3">{data.margin.tier}</p>
                  </div>
                </PanelBody>
              </Panel>
            </div>

            <div className="grid gap-x-12 gap-y-12 lg:grid-cols-5">
              <div className="space-y-8 lg:col-span-2">
                <Panel>
                  <PanelHeader title="Hồ sơ khách hàng" action={<Badge tone="ok">{data.customer.credit}</Badge>} />
                  <PanelBody>
                    <p className="font-medium">{data.customer.name}</p>
                    <p className="text-body text-fg-2">{data.customer.address}</p>
                    <p className="text-meta text-fg-3">{data.customer.profile}</p>
                    <KeyValueList
                      className="mt-4 border-t border-line pt-4"
                      items={[
                        { k: 'Tiền điện trước đây', v: data.customer.utility },
                        { k: 'Hình thức tài chính', v: data.customer.financing },
                      ]}
                    />
                  </PanelBody>
                </Panel>

                <Panel>
                  <PanelHeader
                    title={`Khảo sát ${data.survey.id}`}
                    action={<Badge tone="ok">{data.survey.status}</Badge>}
                  />
                  <PanelBody className="space-y-4">
                    <ul className="grid grid-cols-2 gap-3">
                      {data.survey.photos.map((p) => (
                        <li key={p.caption}>
                          <Photo src={p.src} alt={p.caption} ratio="aspect-[3/2]" caption={p.caption} />
                        </li>
                      ))}
                    </ul>
                    <KeyValueList items={data.survey.facts} />
                  </PanelBody>
                  <PanelFooter>
                    <PlaceholderLink className="text-body text-accent-fg hover:underline">
                      Xem hồ sơ khảo sát ({data.survey.attachments} tệp)
                    </PlaceholderLink>
                  </PanelFooter>
                </Panel>

                <Panel>
                  <PanelHeader title="Lịch sử duyệt" />
                  <PanelBody>
                    <ActivityList items={data.trail} />
                  </PanelBody>
                </Panel>
              </div>

              <div className="space-y-8 lg:col-span-3">
                <Panel>
                  <PanelHeader title="Chi tiết thiết bị và dịch vụ" description={data.architecture} />
                  <Table>
                    <thead>
                      <tr>
                        <Th>Hạng mục</Th>
                        <Th className="text-right">SL</Th>
                        <Th className="text-right">Giá vốn</Th>
                        <Th className="text-right">Giá bán</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((i) => (
                        <Tr key={i.name}>
                          <Td>
                            <p className="font-medium">{i.name}</p>
                            <p className="text-meta text-fg-3">{i.detail}</p>
                          </Td>
                          <Td className="tnum text-right whitespace-nowrap">{i.qty}</Td>
                          <Td className="tnum text-right whitespace-nowrap text-fg-2">{fmt.usd(i.cost)}</Td>
                          <Td className="tnum text-right font-medium whitespace-nowrap">{fmt.usdCents(i.retail)}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                  <PanelBody>
                    <dl className="space-y-2 text-body">
                      <div className="flex justify-between gap-4">
                        <dt className="text-fg-2">Giá hệ thống tiêu chuẩn</dt>
                        <dd className="tnum">{fmt.usdCents(data.gross)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-warn">
                          {data.discount.label} {data.discount.overCap && <Badge tone="warn">Vượt hạn mức</Badge>}
                        </dt>
                        <dd className="tnum text-warn">{fmt.usdCents(data.discount.amount)}</dd>
                      </div>
                      <div className="flex items-end justify-between gap-4 border-t border-line pt-2">
                        <dt>
                          <span className="font-medium">Giá đề xuất cuối</span>
                          <span className="block text-meta text-fg-3">{data.perWatt}</span>
                        </dt>
                        <dd className="tnum text-figure font-semibold">{fmt.usdCents(data.final)}</dd>
                      </div>
                    </dl>
                  </PanelBody>
                </Panel>

                <Panel>
                  <PanelHeader
                    title="Giới hạn tài chính"
                    description={`Giá vốn ${fmt.usdCents(data.guardrails.cogs)}. Biên lợi nhuận gộp thực tế ${data.margin.pct}%, cao hơn mức chặn ${(data.margin.pct - data.margin.floor).toFixed(1)} điểm.`}
                  />
                  <PanelBody className="space-y-4">
                    <div>
                      <div
                        className="relative h-2 w-full rounded-control bg-surface-3"
                        role="img"
                        aria-label="Vị trí báo giá giữa giá vốn và giá bán"
                      >
                        <span
                          className="absolute inset-y-0 left-0 rounded-control bg-danger/40"
                          style={{ width: `${cogsPct}%` }}
                        />
                        <span
                          className="absolute inset-y-0 rounded-control bg-warn/40"
                          style={{ left: `${cogsPct}%`, width: `${minPct - cogsPct}%` }}
                        />
                        <span
                          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-control border-2 border-canvas bg-accent"
                          style={{ left: `${finalPct}%` }}
                        />
                      </div>
                      <dl className="tnum mt-2 grid grid-cols-3 text-meta">
                        <div>
                          <dt className="text-fg-3">Giá vốn</dt>
                          <dd className="font-medium">{fmt.usd(data.guardrails.cogs)}</dd>
                        </div>
                        <div className="text-center">
                          <dt className="text-fg-3">Mức tối thiểu {data.margin.floor}%</dt>
                          <dd className="font-medium">{fmt.usd(data.guardrails.hardMin)}</dd>
                        </div>
                        <div className="text-right">
                          <dt className="text-fg-3">Báo giá hiện tại</dt>
                          <dd className="font-medium">{fmt.usd(data.final)}</dd>
                        </div>
                      </dl>
                    </div>
                    <dl className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-meta text-fg-2">Hạn mức chiết khấu tháng của nhân viên</dt>
                        <dd className="tnum font-medium">
                          Còn {fmt.usd(data.guardrails.budget.remaining)} / {fmt.usd(data.guardrails.budget.total)}
                        </dd>
                        <dd className="text-meta text-warn">{data.guardrails.budget.note}</dd>
                      </div>
                      <div>
                        <dt className="text-meta text-fg-2">Mức giá đối thủ trong khu vực</dt>
                        <dd className="font-medium">
                          {data.guardrails.competitor.name}, {data.guardrails.competitor.rate}
                        </dd>
                        <dd className="text-meta text-fg-3">{data.guardrails.competitor.winRate}</dd>
                      </div>
                    </dl>
                  </PanelBody>
                </Panel>

                <Panel id="decision" raised>
                  <PanelHeader title="Quyết định của quản lý" description="Đăng nhập với tên Jonathan Mercer." />
                  {decision ? (
                    <PanelBody>
                      <Notice
                        tone={decision === 'rejected' ? 'danger' : 'ok'}
                        title={
                          decision === 'approved'
                            ? 'Đã duyệt và gửi đi'
                            : decision === 'redline'
                              ? 'Đã gửi yêu cầu sửa'
                              : 'Đã từ chối báo giá'
                        }
                      >
                        {decision === 'approved' &&
                          'Đã áp dụng duyệt vượt mức khuyến mãi và gửi hồ sơ DocuSign cho David Miller.'}
                        {decision === 'redline' &&
                          `Đã trả đề xuất về cho Marcus Chen kèm ghi chú của bạn: "${counter}".`}
                        {decision === 'rejected' && `Đã đóng hồ sơ cơ hội bán hàng. Lý do: ${reason}.`}
                      </Notice>
                    </PanelBody>
                  ) : (
                    <PanelBody className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-container bg-surface-2 px-4 py-3">
                        <div className="text-body">
                          <p className="font-medium">Ký duyệt cấp điều hành</p>
                          <p className="text-fg-2">
                            Áp dụng duyệt vượt mức khuyến mãi, ký gửi hợp đồng và gửi hồ sơ DocuSign cho David Miller.
                          </p>
                        </div>
                        <Button variant="primary" onClick={() => setDecision('approved')}>
                          Duyệt và gửi đi
                        </Button>
                      </div>

                      <form
                        className="space-y-3"
                        onSubmit={(e) => {
                          e.preventDefault()
                          if (counter.trim()) setDecision('redline')
                        }}
                      >
                        <Field
                          label="Yêu cầu sửa hoặc đề xuất giá khác"
                          hint="Trả đề xuất về cho Marcus Chen."
                          htmlFor="counter"
                        >
                          <Textarea
                            id="counter"
                            value={counter}
                            onChange={(e) => setCounter(e.target.value)}
                            placeholder="Đề xuất $29,200 hoặc giảm gói nhân công bảo hành. Không xuống dưới $29k nếu không gia hạn giám sát."
                          />
                        </Field>
                        <div className="flex flex-wrap items-center gap-2">
                          {data.presets.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setCounter((c) => (c ? `${c} ${p}.` : `${p}.`))}
                              className="press tap text-body text-fg-2 underline-offset-4 hover:text-fg hover:underline"
                            >
                              Mẫu: {p}
                            </button>
                          ))}
                          <Button type="submit" size="sm" className="ml-auto" disabled={!counter.trim()}>
                            Gửi yêu cầu sửa
                          </Button>
                        </div>
                      </form>

                      <form
                        className="border-l-2 border-danger pl-4"
                        onSubmit={(e) => {
                          e.preventDefault()
                          if (reason) setDecision('rejected')
                        }}
                      >
                        <Field
                          label="Từ chối báo giá"
                          hint="Đóng hồ sơ cơ hội bán hàng và huỷ mức giá đang giữ."
                          htmlFor="reason"
                        >
                          <div className="flex flex-wrap gap-3">
                            <Select
                              id="reason"
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              className="w-full sm:w-auto sm:min-w-0 sm:flex-1"
                            >
                              <option value="">Chọn lý do từ chối</option>
                              {data.rejectReasons.map((r) => (
                                <option key={r}>{r}</option>
                              ))}
                            </Select>
                            <Button type="submit" variant="danger" disabled={!reason}>
                              Từ chối
                            </Button>
                          </div>
                        </Field>
                      </form>
                    </PanelBody>
                  )}
                </Panel>
              </div>
            </div>

            <p className="mt-6 border-t border-line pt-4 text-meta text-fg-3">
              Mã băm báo giá <span className="text-fg-2">{data.hash}</span>. Tuân thủ tiêu chuẩn hiệu quả năng lượng
              công trình Title 24 của California.
            </p>
          </>
        )
      }}
    </QueryBoundary>
  )
}
