import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { Input, Select } from '@/components/common/ui/field'
import { FilterBar } from '@/components/common/ui/filter-bar'
import { Progress } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { PlaceholderLink } from '@/components/common/ui/placeholder-link'
import { Pagination } from '@/components/common/ui/pagination'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { EmptyState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { ROUTES, withId } from '@/routes/paths'
import { portfolio, portfolioRows, portfolioStages, type PortfolioStage } from '@/data/manage'
import { fmt } from '@/utils/format'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

export function ManagePortfolioPage() {
  const query = useMockQuery(['manage', 'portfolio'], portfolio)
  const [stage, setStage] = useState<PortfolioStage | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return portfolioRows.filter(
      (r) =>
        (stage === 'all' || r.stage === stage) &&
        (!q ||
          r.id.toLowerCase().includes(q) ||
          r.customer.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q)),
    )
  }, [stage, search])

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))

  return (
    <QueryBoundary query={query}>
      {(data) => (
        <>
          <PageHeader
            title="Danh mục dự án"
            actions={
              <>
                <Button disabled={selected.size === 0}>
                  Đổi người phụ trách hàng loạt{selected.size > 0 ? ` (${selected.size})` : ''}
                </Button>
                <Button>Xuất CSV</Button>
              </>
            }
          />

          <StatRow className="mb-12">
            {data.stats.map((s) => (
              <Stat key={s.label} label={s.label} value={s.value} note={s.note} tone={s.tone} />
            ))}
          </StatRow>

          <Panel>
            <FilterBar
              tabs={
                <FilterChips chips={portfolioStages} value={stage} onChange={setStage} label="Lọc theo giai đoạn" />
              }
            >
              <Input
                type="search"
                aria-label="Tìm dự án"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Mã dự án, tên khách hàng hoặc địa chỉ"
                className="w-full md:max-w-xs"
              />
              <Select aria-label="Nhân viên kinh doanh" className="w-auto">
                {data.filters.staff.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
              <Select aria-label="Tình trạng" className="w-auto">
                {data.filters.health.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
              <Select aria-label="Khoảng thời gian" className="w-auto">
                {data.filters.period.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </FilterBar>

            {rows.length === 0 ? (
              <PanelBody>
                <EmptyState
                  title="Không có dự án nào khớp"
                  description="Thử giai đoạn khác hoặc xoá từ khoá tìm kiếm."
                />
              </PanelBody>
            ) : (
              <Table stack>
                <thead>
                  <tr>
                    <Th className="w-10">
                      <input
                        type="checkbox"
                        aria-label="Chọn tất cả dòng đang hiện"
                        className="size-4 accent-accent"
                        checked={allSelected}
                        onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                      />
                    </Th>
                    <Th>Dự án</Th>
                    <Th>Khách hàng & công trình</Th>
                    <Th className="hidden wide:table-cell">Phụ trách kinh doanh</Th>
                    <Th className="hidden 2xl:table-cell">Hệ thống</Th>
                    <Th className="hidden md:table-cell">Giai đoạn</Th>
                    <Th className="hidden lg:table-cell">Mốc thời gian</Th>
                    <Th>Tình trạng</Th>
                    <Th>
                      <span className="sr-only">Thao tác</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <Tr key={r.id} className={selected.has(r.id) ? 'bg-accent-soft/40' : undefined}>
                      <Td>
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${r.id}`}
                          className="size-4 accent-accent"
                          checked={selected.has(r.id)}
                          onChange={() =>
                            setSelected((s) => {
                              const next = new Set(s)
                              if (next.has(r.id)) next.delete(r.id)
                              else next.add(r.id)
                              return next
                            })
                          }
                        />
                      </Td>
                      <Td label="Dự án">
                        <Link
                          to={withId(ROUTES.manage.project, r.id)}
                          className="tap font-medium whitespace-nowrap text-accent-fg hover:underline"
                        >
                          {r.id}
                        </Link>
                        <p className="text-meta text-fg-3">{r.type}</p>
                      </Td>
                      <Td label="Khách hàng & công trình">
                        <p className="font-medium">{r.customer}</p>
                        <p className="text-meta text-fg-3">{r.address}</p>
                      </Td>
                      <Td label="Phụ trách kinh doanh" className="hidden wide:table-cell">
                        <p className="whitespace-nowrap">{r.owner}</p>
                        <p className="text-meta text-fg-3">{r.territory}</p>
                      </Td>
                      <Td label="Hệ thống" className="hidden 2xl:table-cell">
                        <p className="whitespace-nowrap">{r.system}</p>
                        <p className="text-meta text-fg-3">{r.hardware}</p>
                      </Td>
                      <Td label="Giai đoạn" className="hidden md:table-cell">
                        <p className="whitespace-nowrap">{r.stageLabel}</p>
                        <p className="text-meta text-fg-3">{r.stageNote}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Progress value={r.pct} label={`Tiến độ ${r.id}`} className="w-16" />
                          <span className="tnum text-meta whitespace-nowrap text-fg-2">
                            {r.pct}% {r.progressLabel.toLowerCase()}
                          </span>
                        </div>
                      </Td>
                      <Td label="Mốc thời gian" className="hidden whitespace-nowrap lg:table-cell">
                        <p className="tnum">{r.milestone}</p>
                        <p className="tnum text-meta text-fg-3">PTO {r.pto}</p>
                      </Td>
                      <Td label="Tình trạng">
                        <Badge tone={r.healthTone}>{r.health}</Badge>
                      </Td>
                      <Td className="text-right">
                        <ButtonLink to={withId(ROUTES.manage.project, r.id)} size="sm">
                          {r.action}
                        </ButtonLink>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}

            <PanelFooter className="justify-between text-body text-fg-2">
              <span className="tnum">
                Hiển thị 1–{rows.length} trên {data.total} dự án. Giá trị hợp đồng đang hiển thị{' '}
                {fmt.usd(data.valueInView)}.
              </span>
              <Pagination page={1} pages={15} />
            </PanelFooter>
          </Panel>

          <div className="mt-12 grid gap-x-12 gap-y-12 lg:grid-cols-3 lg:items-start">
            <Panel className="lg:col-span-2">
              <PanelHeader
                title="Hàng chờ đấu nối lưới"
                action={<Badge>Trung bình {data.interconnection.avg}</Badge>}
              />
              <PanelBody>
                <StatRow>
                  {data.interconnection.queues.map((q) => (
                    <Stat
                      key={q.utility}
                      label={q.utility}
                      value={q.days}
                      unit="ngày"
                      note={<Badge tone={q.tone}>{q.note}</Badge>}
                    />
                  ))}
                </StatRow>
              </PanelBody>
              <PanelFooter className="justify-between text-body text-fg-2">
                <span>{data.interconnection.refresh}</span>
                <PlaceholderLink className="text-accent-fg hover:underline">
                  Tải báo cáo điểm nghẽn cấp phép
                </PlaceholderLink>
              </PanelFooter>
            </Panel>

            <Panel>
              <PanelHeader
                title="Tình trạng đội hiện trường"
                description={`${data.crews.active} xe lắp đặt đang hoạt động ở Nam California.`}
              />
              <PanelBody>
                <ul className="divide-y divide-line">
                  {data.crews.rows.map((c) => (
                    <li key={c.crew} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-body font-medium">{c.crew}</p>
                        <p className="text-meta text-fg-3">{c.task}</p>
                      </div>
                      <Badge tone={c.tone}>{c.status}</Badge>
                    </li>
                  ))}
                </ul>
              </PanelBody>
              <PanelFooter>
                <Button size="sm">Mở bản đồ điều phối</Button>
              </PanelFooter>
            </Panel>
          </div>
        </>
      )}
    </QueryBoundary>
  )
}
