import { useState } from 'react'
import { Avatar } from '@/components/common/ui/avatar'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { ListRow, ListRowActions } from '@/components/common/ui/list-row'
import { ActivityList, Notice, Progress } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { EmptyState } from '@/components/common/ui/states'
import { alerts, type AlertGroup } from '@/data/manage'
import { fmt } from '@/utils/format'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

type Filter = AlertGroup | 'all'

export function ManageAlertsPage() {
  const query = useMockQuery(['manage', 'alerts'], alerts)
  const [filter, setFilter] = useState<Filter>('all')
  const [resolved, setResolved] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

  function resolve(ref: string, message: string) {
    setResolved((s) => new Set(s).add(ref))
    setToast(message)
  }

  return (
    <QueryBoundary query={query}>
      {(data) => {
        const sections = data.sections
          .map((s) => ({
            ...s,
            items: s.items.filter(
              (i) =>
                !resolved.has(i.ref) && (filter === 'all' || (filter === 'critical' ? i.critical : s.group === filter)),
            ),
          }))
          .filter((s) => s.items.length > 0)
        const nonCritical = data.sections.flatMap((s) => s.items).filter((i) => !i.critical && !resolved.has(i.ref))
        return (
          <>
            <PageHeader
              title="Cảnh báo cần quản lý xử lý"
              description={`${data.summary.active} vướng mắc đang mở ở ${data.summary.districts} khu vực. Xử lý xong sẽ giải phóng khoảng ${fmt.usd(data.summary.exposure)} tiền thanh toán theo mốc và ${data.summary.crews} đội hiện trường đang phải dừng.`}
              actions={
                <>
                  <Button
                    disabled={nonCritical.length === 0}
                    onClick={() => {
                      setResolved((s) => new Set([...s, ...nonCritical.map((i) => i.ref)]))
                      setToast(`Đã ghi nhận ${nonCritical.length} mục không nghiêm trọng.`)
                    }}
                  >
                    Ghi nhận mục không nghiêm trọng
                  </Button>
                  <Button variant="primary">Phát cảnh báo tới hiện trường</Button>
                </>
              }
            />

            {toast && (
              <Notice tone="ok" className="mb-8">
                {toast}
              </Notice>
            )}

            <StatRow className="mb-12">
              {data.stats.map((s) => (
                <Stat key={s.label} label={s.label} value={s.value} note={s.note} tone={s.tone} />
              ))}
            </StatRow>

            <div className="grid gap-x-12 gap-y-12 lg:grid-cols-3">
              <div className="space-y-8 lg:col-span-2">
                <FilterChips chips={[...data.chips]} value={filter} onChange={setFilter} label="Lọc cảnh báo" />

                {sections.length === 0 && (
                  <EmptyState
                    title="Không còn mục nào"
                    description="Mọi mục theo bộ lọc này đã được ghi nhận hoặc xử lý."
                  />
                )}

                {sections.map((section) => (
                  <Panel key={section.key} aria-labelledby={section.key}>
                    <PanelHeader
                      title={<span id={section.key}>{section.title}</span>}
                      description={section.description}
                      action={<Badge tone={section.group === 'critical' ? 'danger' : 'neutral'}>{section.count}</Badge>}
                    />
                    <ul className="divide-y divide-line border-t border-line">
                      {section.items.map((item) => (
                        <ListRow key={item.ref} tone={item.critical ? 'danger' : undefined}>
                          <div className="flex flex-wrap items-center gap-2">
                            {/^[A-Z]{2,4}-\d+$/.test(item.ref) && (
                              <span className="text-body font-medium">{item.ref}</span>
                            )}
                            <span className="font-medium">{item.title}</span>
                            <Badge tone={item.tone}>{item.tag}</Badge>
                          </div>
                          <p className="mt-1 text-meta text-fg-3">{item.meta}</p>
                          <p className="mt-2 max-w-prose text-body text-fg-2">{item.body}</p>
                          <ListRowActions>
                            {item.actions.map((a, i) => (
                              <Button
                                key={a}
                                size="sm"
                                onClick={() =>
                                  i === 0
                                    ? resolve(item.ref, `Đã ghi nhận "${a}" cho ${item.ref}.`)
                                    : setToast(`Đã mở "${a}" cho ${item.ref}.`)
                                }
                              >
                                {a}
                              </Button>
                            ))}
                          </ListRowActions>
                        </ListRow>
                      ))}
                    </ul>
                  </Panel>
                ))}
              </div>

              <div className="space-y-8 lg:border-l lg:border-line lg:pl-8">
                <Panel>
                  <PanelHeader title="Vị trí xe hiện tại" />
                  <PanelBody>
                    <ul className="divide-y divide-line">
                      {data.fleet.map((v) => (
                        <li key={v.van} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                          <div>
                            <p className="text-body font-medium">{v.van}</p>
                            <p className="text-meta text-fg-3">{v.note}</p>
                          </div>
                          <Badge tone={v.tone}>{v.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  </PanelBody>
                </Panel>

                <Panel>
                  <PanelHeader title="Người trực" />
                  <PanelBody>
                    <ul className="divide-y divide-line">
                      {data.leads.map((l) => (
                        <li key={l.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                          <Avatar name={l.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-body font-medium">{l.name}</p>
                            <p className="text-meta text-fg-3">{l.role}</p>
                          </div>
                          <Button size="sm" variant="ghost">
                            Gọi
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </PanelBody>
                </Panel>

                <Panel>
                  <PanelHeader
                    title="Tỷ lệ đạt SLA"
                    action={<span className="tnum text-title font-semibold">{data.sla.current}%</span>}
                  />
                  <PanelBody>
                    <Progress value={data.sla.current} label="Tỷ lệ đạt SLA tháng này" />
                    <p className="tnum mt-2 text-meta text-fg-2">Mục tiêu {data.sla.target}%</p>
                    <p className="mt-3 text-body text-fg-2">{data.sla.note}</p>
                  </PanelBody>
                </Panel>

                <Panel>
                  <PanelHeader
                    title="Đã xử lý hôm nay"
                    action={<Badge tone="ok">Tổng {data.resolvedTotal + resolved.size}</Badge>}
                  />
                  <PanelBody>
                    <ActivityList items={data.resolved} />
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
