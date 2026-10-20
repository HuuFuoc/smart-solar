import { useMemo, useState } from 'react'
import { Badge, type Tone } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { Checkbox, Input, Select } from '@/components/common/ui/field'
import { FilterBar } from '@/components/common/ui/filter-bar'
import { ListRow } from '@/components/common/ui/list-row'
import { Progress } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { PlaceholderLink } from '@/components/common/ui/placeholder-link'
import { Panel, PanelFooter } from '@/components/common/ui/panel'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { EmptyState } from '@/components/common/ui/states'
import { ROUTES, withId } from '@/routes/paths'
import { fieldContext, JOB_LABEL, tasksPage, workOrders, type JobKind, type WorkOrder } from '@/data/field'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { useMockQuery } from '@/hooks/useMockQuery'

const PRIORITY_TONE: Record<WorkOrder['priority'], Tone> = { Urgent: 'danger', High: 'warn', Normal: 'neutral' }
const PRIORITY_LABEL: Record<WorkOrder['priority'], string> = {
  Urgent: 'Khẩn cấp',
  High: 'Ưu tiên cao',
  Normal: 'Bình thường',
}
const DETAIL_ROUTE: Partial<Record<JobKind, string>> = {
  survey: withId(ROUTES.field.survey, 'SS-PRJ-2024-089'),
  installation: withId(ROUTES.field.installation, 'SS-PRJ-2024-042'),
}

export function FieldTasksPage() {
  const query = useMockQuery(['field', 'tasks'], { ...tasksPage, orders: workOrders })
  const [timeline, setTimeline] = useState<'today' | 'upcoming' | 'completed' | 'all'>('today')
  const [type, setType] = useState<JobKind | 'all'>('all')
  const [priority, setPriority] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return workOrders.filter(
      (o) =>
        (timeline === 'all' || o.timeline === timeline) &&
        (type === 'all' || o.kind === type) &&
        (priority === 'all' || o.priority === priority) &&
        (!q ||
          o.customer.toLowerCase().includes(q) ||
          o.address.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q)),
    )
  }, [timeline, type, priority, search])

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
            meta={<span>Điều phối vùng 4, ca làm {fieldContext.shiftWindow}</span>}
            title="Việc hiện trường và phiếu công việc"
            description={`Hôm nay có ${data.activeToday} việc. ${data.sync}.`}
          />

          <StatRow className="mb-12">
            <Stat
              label="Việc hôm nay"
              value={data.stats.jobs.done}
              unit={`/ ${data.stats.jobs.planned} theo kế hoạch`}
            />
            <Stat
              label="Quãng đường"
              value={data.stats.miles}
              unit="mi"
              note={`Chặng tiếp theo ${data.stats.nextLeg}`}
            />
            <Stat
              label="Khẩn cấp và ưu tiên cao"
              value={data.stats.critical}
              unit="cần ký xác nhận"
              note={data.stats.criticalNote}
              tone="danger"
            />
            <Stat label="Vật tư trên xe" value={`${data.stats.parts}%`} note={data.stats.partsNote} />
          </StatRow>

          <Panel>
            <FilterBar
              className="mb-0"
              tabs={
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-1 text-meta text-fg-3">Thời gian</p>
                    <FilterChips
                      chips={[...data.timelines]}
                      value={timeline}
                      onChange={setTimeline}
                      label="Thời gian"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-meta text-fg-3">Loại việc</p>
                    <FilterChips chips={[...data.types]} value={type} onChange={setType} label="Loại việc" />
                  </div>
                </div>
              }
            >
              <Input
                type="search"
                aria-label="Tìm phiếu công việc"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tên khách, địa chỉ hoặc mã phiếu"
                className="w-full md:max-w-sm"
              />
              <Select
                aria-label="Mức ưu tiên"
                className="w-auto"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="all">Ưu tiên: tất cả</option>
                <option value="Urgent">Khẩn cấp</option>
                <option value="High">Ưu tiên cao</option>
                <option value="Normal">Bình thường</option>
              </Select>
              <Select aria-label="Thao tác hàng loạt" className="w-auto" disabled={selected.size === 0} defaultValue="">
                <option value="" disabled>
                  Thao tác hàng loạt (đã chọn {selected.size})
                </option>
                <option>Đánh dấu đang di chuyển</option>
                <option>Đổi lịch hàng loạt</option>
                <option>Xuất gói dữ liệu ngoại tuyến</option>
              </Select>
            </FilterBar>
          </Panel>

          {rows.length === 0 ? (
            <EmptyState
              className="mt-6"
              title="Không có phiếu nào khớp"
              description={
                timeline === 'today'
                  ? 'Với bộ lọc này, tuyến hôm nay không còn việc.'
                  : 'Không có lịch nào khớp bộ lọc.'
              }
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setTimeline('today')
                    setType('all')
                    setPriority('all')
                    setSearch('')
                  }}
                >
                  Xoá bộ lọc
                </Button>
              }
            />
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {rows.map((o) => (
                <ListRow key={o.id}>
                  <div className="grid gap-4 md:grid-cols-[180px_1fr_auto]">
                    <div>
                      <Checkbox
                        checked={selected.has(o.id)}
                        onChange={() => toggle(o.id)}
                        label={<span className="text-body font-medium">{o.id}</span>}
                      />
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge tone="accent">{JOB_LABEL[o.kind]}</Badge>
                        <Badge tone={PRIORITY_TONE[o.priority]}>{PRIORITY_LABEL[o.priority]}</Badge>
                      </div>
                      <p className="tnum mt-2 text-body">{o.window}</p>
                      <p className="text-meta text-fg-2">{o.status}</p>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <p className="text-body font-semibold">{o.customer}</p>
                        <a href={`tel:${o.phone}`} className="tap tnum text-body text-accent-fg hover:underline">
                          {o.phone}
                        </a>
                      </div>
                      <p className="text-body text-fg-2">
                        {o.address} <span className="text-fg-3">({o.distance})</span>
                      </p>
                      <div className="mt-3 rounded-container bg-surface-2 px-3 py-3 text-body">
                        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                          <p className="font-medium">{o.scope}</p>
                          <p className="tnum text-fg-2">{o.progress}</p>
                        </div>
                        <p className="text-meta text-fg-3">{o.scopeNote}</p>
                        {o.pct !== undefined && <Progress value={o.pct} label={`Tiến độ ${o.id}`} className="mt-2" />}
                      </div>
                    </div>

                    <div className="flex flex-row flex-wrap gap-3 md:w-40 md:flex-col">
                      <Button size="sm">{o.action}</Button>
                      {DETAIL_ROUTE[o.kind] ? (
                        <ButtonLink to={DETAIL_ROUTE[o.kind]!} size="sm" variant="ghost">
                          Phiếu công việc
                        </ButtonLink>
                      ) : (
                        <Button size="sm" variant="ghost">
                          Phiếu công việc
                        </Button>
                      )}
                    </div>
                  </div>
                </ListRow>
              ))}
            </ul>
          )}

          <Panel className="mt-12">
            <PanelFooter className="justify-between border-t-0 text-body text-fg-2">
              <span>{data.footer.safety}</span>
              <span className="flex flex-wrap gap-x-4">
                <span>
                  Điều phối khẩn cấp{' '}
                  <a href="tel:18005557652" className="tnum font-medium text-fg hover:underline">
                    {data.footer.dispatch}
                  </a>
                </span>
                <PlaceholderLink className="tap text-accent-fg hover:underline">Trả thiết bị</PlaceholderLink>
              </span>
            </PanelFooter>
          </Panel>
        </>
      )}
    </QueryBoundary>
  )
}
