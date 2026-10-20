import { useMemo, useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { Input, Select } from '@/components/common/ui/field'
import { FilterBar } from '@/components/common/ui/filter-bar'
import { Progress } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { Pagination } from '@/components/common/ui/pagination'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { EmptyState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { consultationRequests, requestsDirectory, requestStages, type RequestStage } from '@/data/ops'
import { cx } from '@/utils/cx'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

type StageFilter = RequestStage | 'all'

export function OpsConsultationsPage() {
  const query = useMockQuery(['ops', 'consultations'], {
    rows: consultationRequests,
    ...requestsDirectory,
  })
  const [stage, setStage] = useState<StageFilter>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return consultationRequests.filter(
      (r) =>
        (stage === 'all' || r.stage === stage) &&
        (!q ||
          r.id.toLowerCase().includes(q) ||
          r.homeowner.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q)),
    )
  }, [stage, search])

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))
  }
  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <QueryBoundary query={query}>
      {(data) => (
        <>
          <PageHeader
            title="Yêu cầu tư vấn"
            actions={
              <>
                <Button>Xuất CSV</Button>
                <Button disabled={selected.size === 0}>
                  Giao lại hàng loạt{selected.size > 0 ? ` (${selected.size})` : ''}
                </Button>
              </>
            }
          />

          <StatRow className="mb-12 md:grid-cols-3 lg:max-w-2xl">
            <Stat label="Đang tiếp nhận" value={data.stats.activeIntake} />
            <Stat label="Thời gian phân loại TB" value={data.stats.avgTriageSla} />
            <Stat label="Khảo sát tồn đọng" value={data.stats.surveyBacklog} tone="warn" />
          </StatRow>

          <Panel>
            <FilterBar
              tabs={<FilterChips chips={requestStages} value={stage} onChange={setStage} label="Lọc theo giai đoạn" />}
            >
              <Input
                type="search"
                aria-label="Tìm yêu cầu"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Khách hàng, mã yêu cầu hoặc địa chỉ"
                className="w-full md:max-w-xs"
              />
              <Select aria-label="Trạng thái đánh giá" className="w-auto">
                {data.filters.assessment.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
              <Select aria-label="Giai đoạn hiện tại" className="w-auto">
                {data.filters.stage.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
              <Select aria-label="Tư vấn viên phụ trách" className="w-auto">
                {data.filters.consultant.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
              <Select aria-label="Khoảng thời gian tiếp nhận" className="w-auto">
                {data.filters.window.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </FilterBar>

            {rows.length === 0 ? (
              <PanelBody>
                <EmptyState
                  title="Không có yêu cầu nào khớp bộ lọc"
                  description="Thử giai đoạn khác hoặc xoá từ khoá tìm kiếm."
                  action={
                    <Button
                      size="sm"
                      onClick={() => {
                        setStage('all')
                        setSearch('')
                      }}
                    >
                      Xoá bộ lọc
                    </Button>
                  }
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
                        checked={allSelected}
                        onChange={toggleAll}
                        className="size-4 accent-accent"
                      />
                    </Th>
                    <Th>Yêu cầu</Th>
                    <Th>Chủ nhà</Th>
                    <Th className="hidden 2xl:table-cell">Công trình</Th>
                    <Th className="hidden lg:table-cell">Tiếp nhận & SLA</Th>
                    <Th>Giai đoạn & điểm chú ý</Th>
                    <Th className="hidden md:table-cell">Người phụ trách</Th>
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
                          checked={selected.has(r.id)}
                          onChange={() => toggle(r.id)}
                          className="size-4 accent-accent"
                        />
                      </Td>
                      <Td label="Yêu cầu">
                        <p className="font-medium whitespace-nowrap">{r.id}</p>
                        <p className="text-meta text-fg-3 wide:whitespace-nowrap">{r.type}</p>
                      </Td>
                      <Td label="Chủ nhà">
                        <p className="font-medium wide:whitespace-nowrap">{r.homeowner}</p>
                        <p className="text-meta text-fg-3">{r.contact}</p>
                      </Td>
                      <Td label="Công trình" className="hidden 2xl:table-cell">
                        <p className="whitespace-nowrap">{r.address}</p>
                        <p className="text-meta text-fg-3">{r.city}</p>
                      </Td>
                      <Td label="Tiếp nhận & SLA" className="hidden lg:table-cell">
                        <p className="tnum">
                          <span className="whitespace-nowrap">{r.intake}</span>{' '}
                          <span className="whitespace-nowrap text-fg-3">{r.age}</span>
                        </p>
                        <p className={cx('text-meta', r.slaTone === 'warn' ? 'font-medium text-warn' : 'text-fg-3')}>
                          {r.sla}
                        </p>
                      </Td>
                      <Td label="Giai đoạn & điểm chú ý">
                        <Badge tone={r.stageTone}>{r.stageLabel}</Badge>
                        <p className="text-meta text-fg-3">{r.highlights.map((h) => h.label).join(', ')}</p>
                      </Td>
                      <Td label="Người phụ trách" className="hidden md:table-cell">
                        {r.assignee ? (
                          <span className="whitespace-nowrap">{r.assignee}</span>
                        ) : (
                          <span className="text-fg-3">Chưa giao</span>
                        )}
                      </Td>
                      <Td className="text-right">
                        <Button size="sm">{r.action}</Button>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}

            <PanelFooter className="justify-between text-body text-fg-2">
              <span className="tnum">
                Hiển thị 1–{rows.length} trên {data.total} yêu cầu tư vấn
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 whitespace-nowrap">
                  Số dòng mỗi trang
                  <Select size="sm" className="w-auto" aria-label="Số dòng mỗi trang" defaultValue="10">
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </Select>
                </label>
                <Pagination page={1} pages={5} />
              </div>
            </PanelFooter>
          </Panel>

          <Panel className="mt-12">
            <PanelHeader title="Tổng quan khu vực Austin" />
            <PanelBody className="grid gap-6 lg:grid-cols-3 lg:divide-x lg:divide-line">
              <div className="lg:pr-6">
                <p className="text-body font-medium">Mật độ khách tiềm năng theo cụm</p>
                <ul className="mt-3 space-y-3">
                  {data.region.clusters.map((c) => (
                    <li key={c.area}>
                      <div className="mb-1 flex justify-between text-body">
                        <span>{c.area}</span>
                        <span className="tnum text-fg-2">
                          {c.pct}% ({c.leads} khách)
                        </span>
                      </div>
                      <Progress value={c.pct} label={`Tỷ lệ khách tiềm năng của ${c.area}`} />
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-meta text-fg-3">{data.region.clusterNote}</p>
              </div>
              <div className="lg:px-6">
                <p className="text-body font-medium">Tốc độ phản hồi</p>
                <p className="tnum mt-2 text-figure font-semibold">{data.region.triage.avg}</p>
                <p className="text-meta text-fg-3">Trung bình từ lần liên hệ đầu đến khi hẹn lịch</p>
                <Badge tone="ok" className="mt-2">
                  {data.region.triage.health}
                </Badge>
                <p className="mt-3 text-meta text-fg-3">{data.region.triage.note}</p>
              </div>
              <div className="lg:pl-6">
                <p className="text-body font-medium">Xe khảo sát hiện trường</p>
                <p className="tnum mt-2 text-figure font-semibold">
                  {data.region.fleet.vans} <span className="text-body font-normal text-fg-2">xe đang hoạt động</span>
                </p>
                <p className="mt-1 text-body text-fg-2">
                  Lịch trống gần nhất của kỹ thuật viên mái:{' '}
                  <span className="font-medium text-fg">{data.region.fleet.nextSlot}</span> ({data.region.fleet.crew}).
                </p>
                <Button size="sm" className="mt-3">
                  Điều phối & tối ưu lộ trình
                </Button>
              </div>
            </PanelBody>
          </Panel>
        </>
      )}
    </QueryBoundary>
  )
}
