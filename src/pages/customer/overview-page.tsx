import { Link } from 'react-router'
import { Avatar } from '@/components/common/ui/avatar'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { ActivityList, KeyValueList, Progress } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { PlaceholderLink } from '@/components/common/ui/placeholder-link'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { Stepper } from '@/components/common/ui/stepper'
import { ROUTES, withId } from '@/routes/paths'
import { advisor, overview, property } from '@/data/customer'
import { fmt } from '@/utils/format'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

export function OverviewPage() {
  const query = useMockQuery(['customer', 'overview'], overview)
  return (
    <QueryBoundary query={query}>
      {(data) => (
        <>
          <PageHeader
            meta={
              <>
                <span>Project {property.projectId}</span>
                <span aria-hidden>/</span>
                <span>{property.address}</span>
              </>
            }
            title={`${data.milestone.title} sau ${data.milestone.daysAway} ngày`}
            description={`${data.milestone.when}, đã xác nhận với ${data.milestone.with}.`}
            actions={<ButtonLink to={withId(ROUTES.customer.consultation, 'CR-9042')}>Xem tiến trình</ButtonLink>}
          />

          <Panel className="mb-12">
            <PanelHeader title="Hành trình điện mặt trời" />
            <PanelBody>
              <Stepper steps={data.journey} />
            </PanelBody>
          </Panel>

          <div className="grid gap-x-12 gap-y-12 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <Panel>
                <PanelHeader
                  title={data.consultation.title}
                  description={`Tư vấn ${data.consultation.id}`}
                  action={<Badge tone="accent">{data.consultation.status}</Badge>}
                />
                <PanelBody className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="text-meta text-fg-3">Thời gian</p>
                      <p className="mt-1 font-medium">{data.consultation.date}</p>
                      <p className="text-meta text-fg-3">{data.consultation.duration}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Avatar name={advisor.name} />
                      <div className="min-w-0">
                        <p className="font-medium">{advisor.name}</p>
                        <p className="text-meta text-fg-3">Tư vấn viên năng lượng có chứng chỉ</p>
                        <a href={`mailto:${advisor.email}`} className="tap text-body text-accent-fg hover:underline">
                          {advisor.email}
                        </a>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-body font-medium">Trước buổi hẹn</p>
                    <ul className="mt-2 list-disc space-y-1 pl-6 text-body text-fg-2">
                      {data.consultation.prep.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                </PanelBody>
                <PanelFooter>
                  <Button variant="primary">Gọi {advisor.name.split(' ')[0]}</Button>
                  <Button>Đổi lịch</Button>
                </PanelFooter>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Đề xuất hệ thống"
                  description={`Báo giá ${data.proposal.id}`}
                  action={<Badge tone="warn">{data.proposal.status}</Badge>}
                />
                <PanelBody>
                  <StatRow className="md:grid-cols-3">
                    <Stat
                      label="Công suất hệ thống"
                      value={data.proposal.sizeKw}
                      unit="kW DC"
                      note={`${data.proposal.panels} tấm pin`}
                    />
                    <Stat
                      label="Tỷ lệ bù điện năng ước tính"
                      value={`${data.proposal.offsetPct}%`}
                      note={`Đáp ứng ${fmt.num(data.proposal.coversKwh)} kWh mỗi năm`}
                    />
                    <Stat
                      label="Tiết kiệm ước tính"
                      value={fmt.usd(data.proposal.savingsPerYear)}
                      unit="/ năm"
                      note="Đã tính tín dụng thuế liên bang 30%"
                    />
                  </StatRow>
                  <KeyValueList
                    className="mt-6 border-t border-line pt-4"
                    items={[
                      { k: 'Inverter', v: data.proposal.inverter },
                      { k: 'Pin lưu trữ', v: data.proposal.battery },
                    ]}
                  />
                </PanelBody>
                <PanelFooter>
                  <ButtonLink to={withId(ROUTES.customer.quotation, 'QT-8821')}>Xem chi tiết bản nháp</ButtonLink>
                </PanelFooter>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Lịch hẹn"
                  action={
                    <PlaceholderLink className="text-body text-accent-fg hover:underline">Xem lịch</PlaceholderLink>
                  }
                />
                <PanelBody>
                  <ul className="divide-y divide-line">
                    {data.events.map((e) => (
                      <li key={e.title} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                        <div className="w-11 shrink-0 text-center">
                          <p className="text-meta text-fg-3">{e.day}</p>
                          <p className="tnum text-figure font-semibold">{e.date}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{e.title}</p>
                            <Badge>{e.kind}</Badge>
                          </div>
                          <p className="tnum text-body text-fg-2">{e.time}</p>
                          <p className="text-body text-fg-3">{e.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </PanelBody>
              </Panel>
            </div>

            <div className="space-y-8 lg:border-l lg:border-line lg:pl-8">
              <Panel>
                <PanelHeader
                  title="Mức sẵn sàng của công trình"
                  action={<span className="tnum text-title font-semibold">{data.readiness.pct}%</span>}
                />
                <PanelBody>
                  <Progress value={data.readiness.pct} label="Mức sẵn sàng của công trình" />
                  <ul className="mt-4 space-y-3">
                    {data.readiness.items.map((item) => (
                      <li key={item.label} className="flex items-start justify-between gap-3 text-body">
                        <span className="min-w-0">{item.label}</span>
                        <Badge tone={item.tone} className="shrink-0 whitespace-nowrap">
                          {item.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 border-t border-line pt-3 text-meta text-fg-3">
                    Đội được giao: {data.readiness.crew}
                  </p>
                </PanelBody>
                <PanelFooter>
                  <ButtonLink to={withId(ROUTES.customer.project, 'SS-8842-CA')} size="sm">
                    Các mốc dự án
                  </ButtonLink>
                </PanelFooter>
              </Panel>

              <Panel>
                <PanelHeader title="Bảo hành" description={data.warranty.plan} />
                <PanelBody>
                  <p className="text-body text-fg-2">{data.warranty.summary}</p>
                </PanelBody>
                <PanelFooter>
                  <ButtonLink to={ROUTES.customer.warranty} size="sm">
                    Chi tiết bảo hành
                  </ButtonLink>
                </PanelFooter>
              </Panel>

              <Panel>
                <PanelHeader title="Hoạt động dự án" />
                <PanelBody>
                  <ActivityList items={data.activity} />
                </PanelBody>
                <PanelFooter>
                  <p className="text-body text-fg-2">
                    Có câu hỏi về giấy phép?{' '}
                    <Link to={ROUTES.customer.assistant} className="text-accent-fg hover:underline">
                      Hỏi trợ lý
                    </Link>
                  </p>
                </PanelFooter>
              </Panel>
            </div>
          </div>
        </>
      )}
    </QueryBoundary>
  )
}
