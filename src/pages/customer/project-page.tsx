import { Link } from 'react-router'
import { Avatar } from '@/components/common/ui/avatar'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { ActivityList, KeyValueList, Photo, Progress } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { PlaceholderLink } from '@/components/common/ui/placeholder-link'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { Stepper } from '@/components/common/ui/stepper'
import { ROUTES } from '@/routes/paths'
import { project } from '@/data/customer'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

export function ProjectPage() {
  const query = useMockQuery(['customer', 'project', project.id], project)
  return (
    <QueryBoundary query={query}>
      {(data) => (
        <>
          <PageHeader
            meta={
              <>
                <span className="text-fg-2">{data.id}</span>
                <span>{data.type}</span>
                <Badge tone="accent">Đội đang ở công trình</Badge>
              </>
            }
            title={data.title}
            description={data.address}
            actions={<Button variant="primary">Gọi trưởng nhóm thi công</Button>}
          />

          <Panel className="mb-12">
            <PanelHeader title="Tiến trình dự án" description={`Giai đoạn ${data.stage}/${data.stageCount}`} />
            <PanelBody>
              <Stepper steps={data.steps} />
            </PanelBody>
          </Panel>

          <Panel className="mb-12">
            <PanelBody className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div>
                <h2 className="text-title font-semibold">{data.current.title}</h2>
                <p className="mt-1 max-w-[60ch] text-body text-fg-2">{data.current.summary}</p>
              </div>
              <div className="space-y-3">
                <KeyValueList
                  items={[
                    { k: 'Thời gian lắp đặt', v: data.current.window },
                    { k: 'Tình trạng thi công', v: <Badge tone="ok">{data.current.health}</Badge> },
                  ]}
                />
                <div>
                  <div className="mb-2 flex justify-between text-meta text-fg-2">
                    <span>Tiến độ chung</span>
                    <span className="tnum">{data.current.pct}%</span>
                  </div>
                  <Progress value={data.current.pct} label="Tiến độ thi công chung" />
                </div>
              </div>
            </PanelBody>
          </Panel>

          <div className="grid gap-x-12 gap-y-12 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <Panel>
                <PanelHeader title="Lịch thi công theo ngày" description="Giờ Thái Bình Dương (PT)" />
                <PanelBody>
                  <ol className="divide-y divide-line">
                    {data.schedule.map((s) => (
                      <li key={s.title} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[96px_1fr]">
                        <div>
                          <p className="text-body font-medium">{s.day}</p>
                          <p className="text-meta text-fg-3">{s.when}</p>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{s.title}</p>
                            <Badge tone={s.tone}>{s.status}</Badge>
                          </div>
                          <p className="mt-1 text-body text-fg-2">{s.body}</p>
                          {'notes' in s && (
                            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-meta text-fg-3">
                              {s.notes.map((n) => (
                                <li key={n}>{n}</li>
                              ))}
                            </ul>
                          )}
                          {'progress' in s && (
                            <div className="mt-3">
                              <div className="mb-2 flex justify-between text-meta text-fg-2">
                                <span>
                                  Đã lắp và thử {s.progress.done}/{s.progress.total} tấm
                                </span>
                                <span className="tnum">{Math.round((s.progress.done / s.progress.total) * 100)}%</span>
                              </div>
                              <Progress value={(s.progress.done / s.progress.total) * 100} label={s.title} />
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title="Ảnh lắp đặt" />
                <PanelBody>
                  <ul className="grid gap-6 sm:grid-cols-3">
                    {data.photos.map((p) => (
                      <li key={p.caption}>
                        <Photo src={p.src} alt={p.caption} caption={p.caption} meta={p.meta} />
                        <p className="mt-2 text-body text-fg-2">{p.body}</p>
                      </li>
                    ))}
                  </ul>
                </PanelBody>
              </Panel>
            </div>

            <div className="space-y-8 lg:border-l lg:border-line lg:pl-8">
              <Panel>
                <PanelHeader title="Đội thi công" description={data.crew.squad} />
                <PanelBody className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={data.crew.lead.name} />
                    <div className="min-w-0">
                      <p className="font-medium">{data.crew.lead.name}</p>
                      <p className="text-meta text-fg-3">
                        {data.crew.lead.role}, {data.crew.lead.exp}
                      </p>
                      <a
                        href={`tel:${data.crew.lead.phone}`}
                        className="tap tnum text-body text-accent-fg hover:underline"
                      >
                        {data.crew.lead.phone}
                      </a>
                    </div>
                  </div>
                  <KeyValueList
                    className="border-t border-line pt-4"
                    items={[
                      { k: 'Quân số', v: data.crew.size },
                      { k: 'Phương tiện', v: data.crew.vehicle },
                      { k: 'Giấy phép hành nghề', v: data.crew.license },
                    ]}
                  />
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title="Cập nhật từ công trình" />
                <PanelBody>
                  <ActivityList items={data.feed} />
                </PanelBody>
                <PanelFooter>
                  <PlaceholderLink className="text-body text-accent-fg hover:underline">
                    Xem toàn bộ nhật ký điều phối ({data.feedTotal} mục)
                  </PlaceholderLink>
                </PanelFooter>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Tài liệu dự án"
                  description={`${data.documents.length} tệp chính thức, lưu trữ 25 năm`}
                />
                <PanelBody>
                  <ul className="divide-y divide-line">
                    {data.documents.map((d) => (
                      <li key={d.name} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="text-body font-medium">{d.name}</p>
                          <p className="text-meta text-fg-3">{d.meta}</p>
                        </div>
                        <Button size="sm" variant="ghost" aria-label={`Tải ${d.name}`}>
                          Tải xuống
                        </Button>
                      </li>
                    ))}
                  </ul>
                </PanelBody>
              </Panel>
            </div>
          </div>

          <p className="mt-6 border-t border-line pt-4 text-body text-fg-2">
            Có câu hỏi về tiếng ồn, lối vào hay cắt điện?{' '}
            <Link to={ROUTES.customer.assistant} className="text-accent-fg hover:underline">
              Nhắn cho bộ phận hỗ trợ
            </Link>{' '}
            hoặc đọc{' '}
            <PlaceholderLink className="text-accent-fg hover:underline">câu hỏi thường gặp về lắp đặt</PlaceholderLink>.
          </p>
        </>
      )}
    </QueryBoundary>
  )
}
