import { Link } from 'react-router'
import { Avatar } from '@/components/common/ui/avatar'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { ActivityList, Progress } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { ROUTES } from '@/routes/paths'
import { opsContext, salesDashboard } from '@/data/ops'
import { cx } from '@/utils/cx'
import { fmt } from '@/utils/format'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

const STAGE_FILL = ['bg-accent', 'bg-accent/70', 'bg-accent/45', 'bg-accent/25']

export function OpsDashboardPage() {
  const query = useMockQuery(['ops', 'dashboard'], salesDashboard)
  return (
    <QueryBoundary query={query}>
      {(data) => (
        <>
          <PageHeader
            meta={<span>{opsContext.team}</span>}
            title={`${data.priorityCount} việc ưu tiên hôm nay`}
            description={`Trên ${data.pipelineCount} giai đoạn đang có hồ sơ. ${data.conditions}`}
            actions={<Button>Giao việc hàng loạt</Button>}
          />

          <Panel className="mb-12">
            <PanelHeader title="Phễu bán hàng" />
            <PanelBody>
              <ol className="grid grid-cols-2 gap-y-6 sm:grid-cols-4 lg:grid-cols-8">
                {data.pipeline.map((s) => (
                  <li key={s.label} className="min-w-0 pr-3">
                    <p className="tnum text-title font-semibold">{s.count}</p>
                    <p className="text-body">{s.label}</p>
                    <p className="text-meta text-fg-3">{s.note}</p>
                  </li>
                ))}
              </ol>
            </PanelBody>
          </Panel>

          <div className="grid gap-x-12 gap-y-12 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <Panel>
                <PanelHeader title="Việc ưu tiên" />
                <PanelBody>
                  <ul className="divide-y divide-line">
                    {data.tasks.map((t) => (
                      <li
                        key={t.customer}
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{t.customer}</p>
                            <Badge>{t.task}</Badge>
                            <Badge tone={t.dueTone}>{t.due}</Badge>
                          </div>
                          <p className="mt-1 text-body text-fg-2">{t.detail}</p>
                        </div>
                        <Button size="sm">{t.action}</Button>
                      </li>
                    ))}
                  </ul>
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Khảo sát sắp tới"
                  action={
                    <Link
                      to={ROUTES.ops.surveys}
                      className="inline-flex items-center gap-1 text-body text-accent-fg hover:underline"
                    >
                      Xem lịch hiện trường
                    </Link>
                  }
                />
                <PanelBody>
                  <ul className="divide-y divide-line">
                    {data.surveys.map((s) => (
                      <li
                        key={s.customer}
                        className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[150px_1fr_auto] sm:items-center sm:gap-4"
                      >
                        <div>
                          <p className="tnum text-body font-medium">{s.when}</p>
                          <Badge tone={s.tone} className="mt-1">
                            {s.status}
                          </Badge>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium">{s.customer}</p>
                          <p className="text-body text-fg-2">{s.address}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Avatar name={s.assignee} size="sm" />
                          <div className="">
                            <p className="text-body">{s.assignee}</p>
                            <p className="text-meta text-fg-3">{s.role}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title="Hoạt động gần đây" description="Cập nhật 4 phút trước" />
                <PanelBody>
                  <ActivityList items={data.activity} />
                </PanelBody>
              </Panel>
            </div>

            <div className="space-y-8 lg:border-l lg:border-line lg:pl-8">
              <Panel>
                <PanelHeader title="Cần chú ý" />
                <PanelBody>
                  <ul className="divide-y divide-line">
                    {data.shortcuts.map((s) => (
                      <li key={s.label}>
                        <Link
                          to={ROUTES.ops.consultations}
                          className="-mx-2 flex items-center justify-between gap-3 rounded-control px-2 py-3 hover:bg-surface-2"
                        >
                          <span>
                            <span className="block text-body font-medium">{s.label}</span>
                            <span className="block text-meta text-fg-3">{s.note}</span>
                          </span>
                          <Badge tone="accent">{s.count}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader
                  title={`Chỉ tiêu ${data.quota.month.toLowerCase()}`}
                  action={<span className="tnum text-title font-semibold">{data.quota.pct}%</span>}
                />
                <PanelBody className="space-y-6">
                  <div>
                    <Progress value={data.quota.pct} label="Tiến độ chỉ tiêu tháng" />
                    <div className="tnum mt-2 flex justify-between text-meta text-fg-2">
                      <span>Hiện tại {fmt.usd(data.quota.current)}</span>
                      <span>Mục tiêu {fmt.usd(data.quota.target)}</span>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-meta text-fg-2">Giá trị đang theo đuổi</dt>
                      <dd className="tnum text-figure font-semibold">{fmt.usd(data.quota.pipelineValue)}</dd>
                      <dd className="text-meta text-fg-3">{data.quota.pipelineDelta}</dd>
                    </div>
                    <div>
                      <dt className="text-meta text-fg-2">Tỷ lệ chốt</dt>
                      <dd className="tnum text-figure font-semibold">{data.quota.closeRate}%</dd>
                      <dd className="text-meta text-fg-3">{data.quota.closeNote}</dd>
                    </div>
                  </dl>
                  <div>
                    <p className="mb-2 text-meta text-fg-2">Phân bổ giá trị theo giai đoạn</p>
                    <div
                      className="flex h-2 w-full gap-1 overflow-hidden rounded-control"
                      role="img"
                      aria-label="Giá trị theo giai đoạn"
                    >
                      {data.quota.stages.map((s, i) => (
                        <span key={s.label} className={cx('h-full', STAGE_FILL[i])} style={{ width: `${s.pct}%` }} />
                      ))}
                    </div>
                    <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-meta">
                      {data.quota.stages.map((s, i) => (
                        <li key={s.label} className="flex items-center gap-2">
                          <span aria-hidden className={cx('size-2 rounded-control', STAGE_FILL[i])} />
                          <span className="text-fg-2">{s.label}</span>
                          <span className="tnum ml-auto">{fmt.usd(s.value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Yêu cầu gần đây"
                  action={
                    <Link to={ROUTES.ops.consultations} className="text-body text-accent-fg hover:underline">
                      Xem tất cả ({data.inquiriesTotal})
                    </Link>
                  }
                />
                <PanelBody>
                  <ul className="divide-y divide-line">
                    {data.inquiries.map((i) => (
                      <li key={i.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <Avatar name={i.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-body font-medium">{i.name}</p>
                          <p className="text-meta text-fg-3">{i.note}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </PanelBody>
                <PanelFooter>
                  <ButtonLink to={ROUTES.ops.consultations} size="sm" variant="ghost">
                    Mở hàng chờ tiếp nhận
                  </ButtonLink>
                </PanelFooter>
              </Panel>
            </div>
          </div>
        </>
      )}
    </QueryBoundary>
  )
}
