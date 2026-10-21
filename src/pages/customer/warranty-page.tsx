import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Field, Input, Radio, Select, Textarea } from '@/components/common/ui/field'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { ROUTES, withId } from '@/routes/paths'
import { warranty } from '@/data/customer'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

export function WarrantyPage() {
  const query = useMockQuery(['customer', 'warranty'], warranty)
  const [form, setForm] = useState({
    system: warranty.systems[0],
    type: warranty.serviceTypes[0],
    issue: '',
    phone: warranty.contact.phone,
    email: warranty.contact.email,
  })
  const [submitted, setSubmitted] = useState(false)
  const issueError =
    submitted === false && form.issue.length > 0 && form.issue.trim().length < 10
      ? 'Mô tả sự cố chi tiết hơn một chút.'
      : undefined

  return (
    <QueryBoundary query={query}>
      {(data) => (
        <>
          <PageHeader
            meta={
              <>
                <span className="text-fg-2">{data.policyId}</span>
                <Badge tone="ok">{data.status}</Badge>
              </>
            }
            title={data.plan}
            description={data.summary}
            actions={<Button>Hợp đồng bảo hành</Button>}
          />

          <Panel className="mb-12">
            <PanelBody className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <StatRow className="md:grid-cols-3">
                <Stat
                  label="Hết hạn bảo hành"
                  value={<span className="text-title">{data.expires}</span>}
                  note={data.remaining}
                />
                <Stat
                  label="Hiệu suất dàn pin"
                  value={`${data.telemetry.efficiencyPct}%`}
                  note="Ở mức tối ưu"
                  tone="ok"
                />
                <Stat
                  label="Công trình"
                  value={<span className="text-title">{data.site.split(',')[0]}</span>}
                  note={data.site.split(', ')[1]}
                />
              </StatRow>
              <div className="lg:border-l lg:border-line lg:pl-6">
                <p className="text-body font-medium">Phạm vi bảo hành</p>
                <KeyValueList className="mt-2" items={data.coverage} />
                <p className="mt-3 text-meta text-fg-3">
                  {data.telemetry.status}. {data.telemetry.detail}
                </p>
              </div>
            </PanelBody>
          </Panel>

          <div className="grid gap-x-12 gap-y-12 lg:grid-cols-5">
            <div className="space-y-8 lg:col-span-3">
              <Panel>
                <PanelHeader title="Yêu cầu dịch vụ đang mở" />
                <PanelBody>
                  <ul className="divide-y divide-line">
                    {data.activeRequests.map((r) => (
                      <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-body text-fg-2">{r.id}</span>
                          <Badge tone="warn">{r.status}</Badge>
                        </div>
                        <p className="mt-1 font-medium">{r.title}</p>
                        <p className="text-body text-fg-2">{r.body}</p>
                        <p className="mt-1 text-meta text-fg-3">
                          Kỹ thuật viên: {r.technician}. Khung giờ tới: {r.window}.
                        </p>
                        <div className="mt-3 flex gap-2">
                          <ButtonLink to={withId(ROUTES.customer.warrantyRequest, r.id)} size="sm">
                            Xem chi tiết hồ sơ
                          </ButtonLink>
                          <Button size="sm">Đổi lịch</Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Lịch sử bảo trì"
                  action={
                    <Button size="sm" variant="ghost">
                      Xuất nhật ký
                    </Button>
                  }
                />
                <PanelBody>
                  <ul className="divide-y divide-line">
                    {data.history.map((h) => (
                      <li key={h.title} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">{h.title}</p>
                          <Badge tone={h.result === 'Đạt' ? 'ok' : 'neutral'}>{h.result}</Badge>
                        </div>
                        <p className="mt-1 text-body text-fg-2">{h.body}</p>
                        <p className="mt-1 text-meta text-fg-3">
                          {h.when}. {h.ref}
                        </p>
                      </li>
                    ))}
                  </ul>
                </PanelBody>
              </Panel>
            </div>

            <div className="space-y-8 lg:col-span-2">
              <Panel raised>
                <PanelHeader title="Yêu cầu hỗ trợ" />
                {submitted ? (
                  <PanelBody>
                    <Notice tone="ok" title="Đã nhận yêu cầu">
                      Người phụ trách hồ sơ sẽ được giao trong 2 giờ làm việc và xác nhận khung giờ tới nhà qua SMS.
                    </Notice>
                  </PanelBody>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (form.issue.trim().length < 10) return
                      setSubmitted(true)
                    }}
                  >
                    <PanelBody className="space-y-4">
                      <Field label="Hệ thống" htmlFor="system">
                        <Select
                          id="system"
                          value={form.system}
                          onChange={(e) => setForm({ ...form, system: e.target.value })}
                        >
                          {data.systems.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </Select>
                      </Field>
                      <fieldset>
                        <legend className="mb-2 text-body font-medium">Loại dịch vụ cần hỗ trợ</legend>
                        <div className="grid grid-cols-2 gap-2">
                          {data.serviceTypes.map((t) => (
                            <Radio
                              key={t}
                              name="type"
                              label={t}
                              checked={form.type === t}
                              onChange={() => setForm({ ...form, type: t })}
                            />
                          ))}
                        </div>
                      </fieldset>
                      <Field label="Sự cố hoặc điều bạn nhận thấy" htmlFor="issue" error={issueError}>
                        <Textarea
                          id="issue"
                          value={form.issue}
                          onChange={(e) => setForm({ ...form, issue: e.target.value })}
                          placeholder="Ứng dụng báo lỗi inverter, kẹp bát bị lỏng, bóng che bất thường"
                          aria-invalid={Boolean(issueError)}
                        />
                      </Field>
                      <div>
                        <p className="mb-2 text-body font-medium">Ảnh hoặc bằng chứng (tuỳ chọn)</p>
                        <button
                          type="button"
                          className="press flex w-full flex-col items-center gap-1 rounded-container border border-dashed border-line-2 px-4 py-6 text-body text-fg-2 hover:bg-surface-2"
                        >
                          <span>Bấm để tải lên hoặc kéo thả</span>
                          <span className="text-meta text-fg-3">PNG, JPG hoặc PDF, tối đa 15 MB</span>
                        </button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Số điện thoại liên hệ" htmlFor="phone">
                          <Input
                            id="phone"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          />
                        </Field>
                        <Field label="Email" htmlFor="email">
                          <Input
                            id="email"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                          />
                        </Field>
                      </div>
                      <p className="text-meta text-fg-3">
                        Chi phí tới kiểm tra, thay thiết bị và phí thang đều được bảo hành, không mất phí.
                      </p>
                    </PanelBody>
                    <PanelFooter>
                      <Button type="submit" variant="primary">
                        Gửi yêu cầu dịch vụ
                      </Button>
                    </PanelFooter>
                  </form>
                )}
              </Panel>

              <Notice tone="warn" title="Cần tắt hệ thống khẩn cấp?">
                Khi cần hỗ trợ gấp trên mái hoặc inverter báo lỗi, gọi điều phối 24/7 theo số{' '}
                <a href="tel:18005557652" className="font-medium text-fg hover:underline">
                  {data.emergencyPhone}
                </a>
                .
              </Notice>
            </div>
          </div>
        </>
      )}
    </QueryBoundary>
  )
}
