import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { ActivityList, Photo, Progress } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { PlaceholderLink } from '@/components/common/ui/placeholder-link'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { ROUTES, withId } from '@/routes/paths'
import { execDashboard } from '@/data/manage'
import { cx } from '@/utils/cx'
import { fmt } from '@/utils/format'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

export function ManageDashboardPage() {
  const query = useMockQuery(['manage', 'dashboard'], execDashboard)
  return (
    <QueryBoundary query={query}>
      {(data) => (
        <>
          <PageHeader
            meta={<Badge tone="ok">Tiến độ quý 4: {data.runRate}</Badge>}
            title="Tổng quan điều hành"
            actions={<Button>Thao tác hàng loạt</Button>}
          />

          <StatRow className="mb-12 md:grid-cols-3 xl:grid-cols-6">
            {data.kpis.map((k) => (
              <Stat key={k.label} label={k.label} value={k.value} note={k.note} tone={k.tone} />
            ))}
          </StatRow>

          <Panel className="mb-12">
            <PanelHeader
              title="Tốc độ và phân bổ dự án theo giai đoạn"
              description={`${data.pipeline.live} dự án đang chạy. Thời gian xử lý trung vị ${data.pipeline.medianCycle}.`}
              action={<Badge tone="warn">Điểm nghẽn: {data.pipeline.bottleneck}</Badge>}
            />
            <PanelBody>
              <ol className="grid grid-cols-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
                {data.pipeline.phases.map((p) => (
                  <li key={p.label} className="min-w-0 pr-3">
                    <p className={cx('tnum text-title font-semibold', p.friction && 'text-warn')}>{p.count}</p>
                    <p className="text-body">{p.label}</p>
                    <p className={cx('text-meta', p.friction ? 'text-warn' : 'text-fg-3')}>{p.note}</p>
                  </li>
                ))}
              </ol>
            </PanelBody>
          </Panel>

          <Panel className="mb-12" aria-labelledby="decisions">
            <PanelHeader
              title={<span id="decisions">Cần quyết định</span>}
              description={`${data.exceptions.length} vướng mắc cần cấp điều hành ký duyệt.`}
            />
            <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
              {data.exceptions.map((ex) => (
                <Panel key={ex.ref} className="flex flex-col border-t! pt-6!">
                  <PanelBody className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge tone={ex.tone}>{ex.kind}</Badge>
                      <span className="tnum text-body font-medium">{ex.value}</span>
                    </div>
                    <p className="mt-2 font-medium">
                      {ex.title} <span className="text-body font-normal text-fg-3">{ex.ref}</span>
                    </p>
                    <p className="mt-1 text-body text-fg-2">{ex.body}</p>
                    <p className="mt-2 text-meta text-fg-3">{ex.meta}</p>
                  </PanelBody>
                  <PanelFooter>
                    {ex.actions.map((a, i) =>
                      i === ex.actions.length - 1 ? (
                        <ButtonLink
                          key={a}
                          to={ex.link === 'approval' ? withId(ROUTES.manage.approval, ex.ref) : ROUTES.manage.alerts}
                          size="sm"
                        >
                          {a}
                        </ButtonLink>
                      ) : (
                        <Button key={a} size="sm">
                          {a}
                        </Button>
                      ),
                    )}
                  </PanelFooter>
                </Panel>
              ))}
            </div>
          </Panel>

          <div className="mb-12 grid gap-x-12 gap-y-12 lg:grid-cols-3 lg:items-start">
            <Panel className="lg:col-span-2">
              <PanelHeader title={`Đợt lắp đặt tuần ${data.sprint.week}`} description={data.sprint.summary} />
              <Table stack>
                <thead>
                  <tr>
                    <Th>Dự án</Th>
                    <Th>Hệ thống</Th>
                    <Th className="hidden md:table-cell">Đội thi công</Th>
                    <Th>Mốc tiến độ</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.sprint.rows.map((r) => (
                    <Tr key={r.id}>
                      <Td label="Dự án">
                        <p className="font-medium">{r.project}</p>
                        <p className="text-meta text-fg-3">
                          {r.location}, <span className="text-fg-2">{r.id}</span>
                        </p>
                      </Td>
                      <Td label="Hệ thống">
                        <p>{r.size}</p>
                        <p className="text-meta text-fg-3">{r.hardware}</p>
                      </Td>
                      <Td label="Đội thi công" className="hidden md:table-cell">
                        <p>{r.crew}</p>
                        {r.lead && <p className="text-meta text-fg-3">Trưởng nhóm {r.lead}</p>}
                      </Td>
                      <Td label="Mốc tiến độ">
                        <Badge tone={r.tone}>{r.status}</Badge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <PanelFooter className="gap-x-6 text-body">
                {data.sprint.stats.map((s) => (
                  <span key={s.k}>
                    <span className="text-fg-2">{s.k}</span> <span className="tnum font-medium">{s.v}</span>
                  </span>
                ))}
              </PanelFooter>
            </Panel>

            <Panel>
              <PanelHeader title="Xác minh hiện trường" />
              <PanelBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {data.photos.map((p) => (
                  <Photo
                    key={p.caption}
                    src={p.src}
                    alt={p.caption}
                    ratio="aspect-[16/9]"
                    caption={p.caption}
                    meta={p.meta}
                  />
                ))}
              </PanelBody>
              <PanelFooter>
                <PlaceholderLink className="text-body text-accent-fg hover:underline">
                  Mở thư viện ảnh an toàn & chất lượng ({data.photoTotal} ảnh)
                </PlaceholderLink>
              </PanelFooter>
            </Panel>
          </div>

          <div className="grid gap-x-12 gap-y-12 lg:grid-cols-3 lg:items-start">
            <Panel className="lg:col-span-2">
              <PanelHeader title="Nhật ký kiểm tra & mốc tiến độ" />
              <PanelBody>
                <ActivityList items={data.audit} />
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                title="Tiến độ doanh thu quý 4"
                action={<span className="tnum text-title font-semibold">{data.revenue.pct}%</span>}
              />
              <PanelBody className="space-y-6">
                <div>
                  <Progress value={data.revenue.pct} label="Doanh thu quý 4 đã đạt" />
                  <dl className="tnum mt-2 flex justify-between text-meta text-fg-2">
                    <div>
                      <dt className="inline">Đã ghi nhận </dt>
                      <dd className="inline font-medium text-fg">{data.revenue.recognized}</dd>
                    </div>
                    <div>
                      <dt className="inline">Còn lại </dt>
                      <dd className="inline font-medium text-fg">{data.revenue.remaining}</dd>
                    </div>
                  </dl>
                </div>
                <ul className="divide-y divide-line border-t border-line">
                  {data.revenue.mix.map((m) => (
                    <li key={m.label}>
                      <div className="mb-1 flex justify-between gap-3 text-body">
                        <span>{m.label}</span>
                        <span className="tnum text-fg-2">
                          {fmt.usd(m.value)} ({m.pct}%)
                        </span>
                      </div>
                      <Progress value={m.pct} label={`Tỷ trọng ${m.label}`} />
                    </li>
                  ))}
                </ul>
              </PanelBody>
              <PanelFooter>
                <ButtonLink to={ROUTES.manage.revenue} size="sm" variant="ghost">
                  Xem phân tích doanh thu
                </ButtonLink>
              </PanelFooter>
            </Panel>
          </div>
        </>
      )}
    </QueryBoundary>
  )
}
