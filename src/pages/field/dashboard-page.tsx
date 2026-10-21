import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { ActivityList, Progress } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { EmptyState } from '@/components/common/ui/states'
import { ROUTES, withId } from '@/routes/paths'
import { fieldContext, JOB_LABEL, techDashboard, type JobKind } from '@/data/field'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

type Filter = JobKind | 'all'

const JOB_ROUTE: Partial<Record<JobKind, string>> = {
  survey: withId(ROUTES.field.survey, 'SS-PRJ-2024-089'),
  installation: withId(ROUTES.field.installation, 'SS-PRJ-2024-042'),
}

export function FieldDashboardPage() {
  const query = useMockQuery(['field', 'dashboard'], techDashboard)
  const [filter, setFilter] = useState<Filter>('all')

  return (
    <QueryBoundary query={query}>
      {(data) => {
        const jobs = data.schedule.filter((j) => filter === 'all' || j.kind === filter)
        return (
          <>
            <PageHeader
              meta={<span>Ca {fieldContext.shiftWindow}</span>}
              title={fieldContext.shift}
              description={`Hôm nay đã xong ${data.quota.done}/${data.quota.total} việc. ${data.weather.summary}. ${data.weather.detail}.`}
              actions={<Button>Gọi điều phối trung tâm</Button>}
            />

            <div className="mb-12 flex flex-wrap gap-3">
              <Button variant="primary">Bắt đầu di chuyển</Button>
              <Button>Thêm ảnh công trình</Button>
              <Button>Báo sự cố tại công trình</Button>
            </div>

            <div className="grid gap-x-12 gap-y-12 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Panel>
                  <PanelHeader title="Lịch hôm nay" description={data.date} />
                  <PanelBody className="mb-6">
                    <FilterChips chips={[...data.queue]} value={filter} onChange={setFilter} label="Lọc việc hôm nay" />
                  </PanelBody>
                  <PanelBody>
                    {jobs.length === 0 ? (
                      <EmptyState
                        title="Hôm nay không có việc loại này"
                        description="Đổi bộ lọc để xem các điểm còn lại trong tuyến."
                      />
                    ) : (
                      <ol className="divide-y divide-line">
                        {jobs.map((job) => (
                          <li key={job.time} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[92px_1fr]">
                            <div>
                              <p className="tnum text-body font-semibold">{job.time}</p>
                              <p className="text-meta text-fg-3">{JOB_LABEL[job.kind]}</p>
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-body font-semibold">{job.customer}</p>
                                <Badge tone={job.tone}>{job.status}</Badge>
                              </div>
                              <p className="text-body text-fg-2">{job.address}</p>
                              <p className="mt-1 text-body text-fg-2">{job.detail}</p>
                              {'step' in job && (
                                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px]">
                                  <div>
                                    <div className="mb-2 flex justify-between text-meta">
                                      <span className="font-medium">{job.step}</span>
                                      <span className="tnum text-fg-2">{job.pct}%</span>
                                    </div>
                                    <Progress value={job.pct ?? 0} label="Tiến độ lắp đặt" />
                                    <p className="mt-2 text-meta text-fg-3">{job.onSite}</p>
                                  </div>
                                  <img
                                    src={job.photo}
                                    alt="Giai đoạn lắp khung trên mái"
                                    className="aspect-[3/2] w-full rounded-container object-cover"
                                    loading="lazy"
                                  />
                                </div>
                              )}
                              <div className="mt-3">
                                {JOB_ROUTE[job.kind] ? (
                                  <ButtonLink to={JOB_ROUTE[job.kind]!} size="sm">
                                    {job.action}
                                  </ButtonLink>
                                ) : (
                                  <Button size="sm">{job.action}</Button>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </PanelBody>
                </Panel>
              </div>

              <div className="space-y-8 lg:border-l lg:border-line lg:pl-8">
                <Panel>
                  <PanelHeader title={`Dự kiến tuần ${data.outlook.week}`} />
                  <PanelBody>
                    <dl className="grid grid-cols-3 divide-x divide-line">
                      {[
                        ['Khảo sát', data.outlook.surveys],
                        ['Lắp đặt', data.outlook.installs],
                        ['Bảo hành', data.outlook.warranty],
                      ].map(([label, n]) => (
                        <div key={label} className="px-3 first:pl-0 last:pr-0">
                          <dd className="tnum text-figure font-semibold">{n}</dd>
                          <dt className="text-meta text-fg-2">{label}</dt>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-4 mb-2 border-t border-line pt-3 text-body font-medium">Việc đầu tiên ngày mai</p>
                    <ul className="space-y-2">
                      {data.tomorrow.map((t) => (
                        <li key={t.time} className="flex gap-3 text-body">
                          <span className="tnum w-20 shrink-0 text-fg-2">{t.time}</span>
                          <span>
                            <span className="font-medium">{t.kind}</span>
                            <span className="block text-meta text-fg-3">{t.who}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </PanelBody>
                </Panel>

                <Panel>
                  <PanelHeader title="Đã xong hôm nay" />
                  <PanelBody>
                    <ActivityList items={data.completed} />
                  </PanelBody>
                </Panel>
              </div>
            </div>
          </>
        )
      }}
    </QueryBoundary>
  )
}
