import { useState } from 'react'
import { SERVICE_REQUEST_KINDS } from '@/common/afterSales'
import { FilterChips } from '@/components/common/ui/chips'
import { SearchInput, Select } from '@/components/common/ui/field'
import { PageHeader } from '@/components/common/ui/page-header'
import { PagedList } from '@/components/common/ui/pagination'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { SummaryTile } from '@/components/common/ui/summary-tile'
import { ServiceRequestList } from '@/features/after-sales/ServiceRequestList'
import { byRequestRank, isFinalRequest, isTodo, requestStatusMeta } from '@/features/after-sales/serviceDisplay'
import { useServiceRequestsQuery } from '@/hooks/useManagerAfterSales'
import { ROUTES } from '@/routes/paths'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'
import { fold } from '@/utils/fold'

type Tab = 'todo' | 'open' | 'closed'
type Sort = 'newest' | 'oldest'

const EMPTY: Record<Tab, { title: string; description?: string }> = {
  todo: {
    title: 'Không có yêu cầu nào chờ bạn',
    description: 'Yêu cầu cần xếp lịch, xét bảo hành hay xét khiếu nại hiện ở đây.',
  },
  open: { title: 'Không có yêu cầu nào đang chờ người khác' },
  closed: { title: 'Chưa có yêu cầu nào đã đóng' },
}

function tabOf(r: ServiceRequestSummary): Tab {
  if (isTodo(r.status, 'manager')) return 'todo'
  return isFinalRequest(r.status) ? 'closed' : 'open'
}

// Yêu cầu bảo hành, sửa chữa, bảo trì cho quản lý và quản trị (dùng chung, khác đường dẫn chi tiết)
function AfterSalesRequestsPage({ detailPattern }: { detailPattern: string }) {
  const query = useServiceRequestsQuery()
  const [picked, setPicked] = useState<Tab | null>(null)
  const [keyword, setKeyword] = useState('')
  const [kind, setKind] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState<Sort>('newest')
  const rows = [...(query.data ?? [])].sort(byRequestRank('manager'))
  const groups: Record<Tab, ServiceRequestSummary[]> = {
    todo: rows.filter((r) => tabOf(r) === 'todo'),
    open: rows.filter((r) => tabOf(r) === 'open'),
    closed: rows.filter((r) => tabOf(r) === 'closed'),
  }
  const tab: Tab = picked ?? (groups.todo.length > 0 ? 'todo' : 'open')

  const choose = (next: Tab) => {
    setPicked(next)
    setStatus('')
  }

  const key = fold(keyword.trim())
  const statuses = [...new Set(groups[tab].map((r) => r.status))]
  const filtered = groups[tab].filter(
    (r) =>
      (!kind || r.kind === kind) &&
      (!status || r.status === status) &&
      (!key || fold(`${r.requestNumber} ${r.description}`).includes(key)),
  )
  // Trong một tab mọi yêu cầu cùng nhóm nên đảo thứ tự là xếp cũ nhất trước
  const shown = sort === 'oldest' ? [...filtered].reverse() : filtered
  const filtering = key !== '' || kind !== '' || status !== ''

  return (
    <div className="sv-list">
      <PageHeader
        title="Bảo hành, sửa chữa"
        description="Theo dõi và xử lý các yêu cầu bảo hành, sửa chữa, bảo trì của khách."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          upper
          label="Tổng phiếu quản lý"
          count={rows.length}
          note="yêu cầu"
          icon="description"
          tone="neutral"
        />
        <SummaryTile
          upper
          label="Chờ bạn xử lý"
          count={groups.todo.length}
          note={groups.todo.length === 0 ? 'Không có yêu cầu tồn đọng' : 'cần xử lý'}
          icon="schedule"
          tone={groups.todo.length > 0 ? 'danger' : 'warn'}
          active={tab === 'todo'}
          onClick={() => choose('todo')}
        />
        <SummaryTile
          upper
          label="Đang triển khai"
          count={groups.open.length}
          note="đang chờ người khác"
          icon="bolt"
          tone="info"
          active={tab === 'open'}
          onClick={() => choose('open')}
        />
        <SummaryTile
          upper
          label="Đã hoàn tất / đóng"
          count={groups.closed.length}
          note="đã chốt kết quả"
          icon="task_alt"
          tone="ok"
          active={tab === 'closed'}
          onClick={() => choose('closed')}
        />
      </div>

      <div className="sv-card sv-flush">
        <FilterChips
          label="Lọc yêu cầu"
          className="px-4"
          value={tab}
          onChange={choose}
          chips={[
            { value: 'todo', label: 'Chờ bạn', count: groups.todo.length },
            { value: 'open', label: 'Đang làm', count: groups.open.length },
            { value: 'closed', label: 'Đã đóng', count: groups.closed.length },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="w-full min-w-56 flex-1 sm:w-auto">
            <SearchInput
              name="request-search"
              placeholder="Tìm theo mã yêu cầu, mô tả lỗi"
              maxLength={100}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onClear={() => setKeyword('')}
            />
          </div>
          <label className="w-full sm:w-44">
            <span className="sr-only">Lọc theo loại</span>
            <Select active={kind !== ''} value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">Tất cả loại sự cố</option>
              {Object.entries(SERVICE_REQUEST_KINDS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label className="w-full sm:w-48">
            <span className="sr-only">Lọc theo tình hình</span>
            <Select active={status !== ''} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tất cả tình hình</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {requestStatusMeta(value, 'manager').label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-2 text-meta text-fg-2">
            Sắp xếp:
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-40">
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
            </Select>
          </label>
        </div>
        <QueryBoundary query={query}>
          {() =>
            shown.length === 0 ? (
              <div className="px-4 pb-4">
                <EmptyState
                  {...(filtering
                    ? { title: 'Không tìm thấy yêu cầu phù hợp', description: 'Thử đổi từ khoá hoặc bộ lọc.' }
                    : EMPTY[tab])}
                />
              </div>
            ) : (
              <PagedList
                key={`${tab}-${key}-${kind}-${status}-${sort}`}
                items={shown}
                noun="yêu cầu"
                keepScroll
                pagerClassName="px-4 pb-4"
              >
                {(pageRows) => <ServiceRequestList rows={pageRows} viewer="manager" detailPattern={detailPattern} />}
              </PagedList>
            )
          }
        </QueryBoundary>
      </div>
    </div>
  )
}

export function ManageAfterSalesPage() {
  return <AfterSalesRequestsPage detailPattern={ROUTES.manage.afterSalesRequest} />
}

export function AdminAfterSalesPage() {
  return <AfterSalesRequestsPage detailPattern={ROUTES.admin.afterSalesRequest} />
}
