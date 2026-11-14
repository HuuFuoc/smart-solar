import { useMemo, useState } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { SearchInput } from '@/components/common/ui/field'
import { PagedList } from '@/components/common/ui/pagination'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import {
  filterCustomerServiceRequests,
  type ServiceRequestFilterStatus,
  type ServiceRequestTimeSort,
} from '@/features/after-sales/customerAfterSalesDisplay'
import { CustomerServiceRequestGrid } from '@/features/after-sales/CustomerServiceRequestGrid'
import { CustomerServiceRequestTable } from '@/features/after-sales/CustomerServiceRequestTable'
import { byRequestRank, isTodo } from '@/features/after-sales/serviceDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { useMyInstallationsQuery } from '@/hooks/useCustomerInstallations'
import { useMyServiceRequestsQuery } from '@/hooks/useCustomerServiceRequests'
import { ROUTES } from '@/routes/paths'
import { cx } from '@/utils/cx'

export function CustomerAfterSalesPage() {
  const query = useMyServiceRequestsQuery()
  const installations = useMyInstallationsQuery()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ServiceRequestFilterStatus>('ALL')
  const [timeSort, setTimeSort] = useState<ServiceRequestTimeSort>('ALL')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [syncing, setSyncing] = useState(false)

  const projectContracts = useMemo(
    () => new Map((installations.data ?? []).map((p) => [p.projectId, shortCode(p.contractId)])),
    [installations.data],
  )

  const handleSync = async () => {
    setSyncing(true)
    try {
      await Promise.all([query.refetch(), installations.refetch()])
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <QueryBoundary query={query}>
        {(data) => {
          const rows = [...data].sort(byRequestRank('customer'))
          const todo = rows.filter((r) => isTodo(r.status, 'customer')).length
          const filtered = filterCustomerServiceRequests(rows, search, statusFilter, timeSort, projectContracts)

          return (
            <>
              {/* Header trang với icon cờ lê, tiêu đề và nút đồng bộ */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex shrink-0 text-primary">
                    <Icon name="build" className="text-[24px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-figure font-bold text-fg">Bảo hành, sửa chữa</h1>
                      {todo > 0 && <Badge tone="danger">{todo} yêu cầu chờ bạn duyệt báo giá hoặc nghiệm thu</Badge>}
                    </div>
                    <p className="mt-0.5 text-meta text-fg-2">Quản lý các yêu cầu bảo hành và sửa chữa</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    icon="sync"
                    size="sm"
                    disabled={syncing || query.isFetching}
                    onClick={() => void handleSync()}
                    className="rounded-control"
                  >
                    {syncing ? 'Đang đồng bộ...' : 'Đồng bộ tiến độ'}
                  </Button>
                </div>
              </div>

              {/* Thanh tìm kiếm và bộ lọc */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="min-w-0 flex-1 basis-64">
                  <span className="sr-only">Tìm kiếm yêu cầu</span>
                  <SearchInput
                    name="search"
                    placeholder="Tìm theo mã yêu cầu, hợp đồng..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>

                {/* Dropdown sắp xếp thời gian */}
                <div className="relative inline-flex items-center">
                  <Icon name="calendar_today" className="pointer-events-none absolute left-3 text-[16px] text-fg-3" />
                  <select
                    value={timeSort}
                    aria-label="Sắp xếp thời gian"
                    onChange={(e) => setTimeSort(e.target.value as ServiceRequestTimeSort)}
                    className="h-10 cursor-pointer rounded-control border border-line bg-canvas pl-8 pr-8 text-meta text-fg hover:border-fg-3 focus:border-primary focus:outline-none"
                  >
                    <option value="ALL">Thời gian: Tất cả</option>
                    <option value="NEWEST">Thời gian: Mới nhất</option>
                    <option value="OLDEST">Thời gian: Cũ nhất</option>
                  </select>
                  <Icon name="expand_more" className="pointer-events-none absolute right-2 text-[20px] text-fg-3" />
                </div>

                {/* Dropdown lọc trạng thái */}
                <div className="relative inline-flex items-center">
                  <Icon name="filter_alt" className="pointer-events-none absolute left-3 text-[16px] text-fg-3" />
                  <select
                    value={statusFilter}
                    aria-label="Lọc theo trạng thái"
                    onChange={(e) => setStatusFilter(e.target.value as ServiceRequestFilterStatus)}
                    className="h-10 cursor-pointer rounded-control border border-line bg-canvas pl-8 pr-8 text-meta text-fg hover:border-fg-3 focus:border-primary focus:outline-none"
                  >
                    <option value="ALL">Trạng thái: Tất cả</option>
                    <option value="TODO">Cần bạn xử lý</option>
                    <option value="IN_PROGRESS">Đang xử lý</option>
                    <option value="COMPLETED">Hoàn thành</option>
                    <option value="CANCELLED">Đã huỷ</option>
                  </select>
                  <Icon name="expand_more" className="pointer-events-none absolute right-2 text-[20px] text-fg-3" />
                </div>

                {/* Chuyển chế độ xem bảng / lưới */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Xem dạng bảng"
                    onClick={() => setViewMode('table')}
                    className={cx(
                      'flex h-10 w-10 items-center justify-center rounded-control transition-colors',
                      viewMode === 'table'
                        ? 'bg-primary text-on-accent'
                        : 'border border-line bg-canvas text-fg-2 hover:bg-surface-2',
                    )}
                  >
                    <Icon name="format_list_bulleted" className="text-[20px]" />
                  </button>
                  <button
                    type="button"
                    aria-label="Xem dạng lưới"
                    onClick={() => setViewMode('grid')}
                    className={cx(
                      'flex h-10 w-10 items-center justify-center rounded-control transition-colors',
                      viewMode === 'grid'
                        ? 'bg-primary text-on-accent'
                        : 'border border-line bg-canvas text-fg-2 hover:bg-surface-2',
                    )}
                  >
                    <Icon name="grid_view" className="text-[20px]" />
                  </button>
                </div>
              </div>

              {/* Danh sách yêu cầu */}
              {rows.length === 0 ? (
                <EmptyState
                  title="Chưa có yêu cầu nào"
                  description="Mở công trình đã bàn giao rồi bấm Báo lỗi hoặc Đặt bảo trì lẻ."
                />
              ) : filtered.length === 0 ? (
                <EmptyState
                  title="Không tìm thấy yêu cầu phù hợp"
                  description="Thử đổi bộ lọc hoặc từ khoá tìm kiếm khác."
                />
              ) : (
                <PagedList items={filtered} noun="yêu cầu">
                  {(pageItems) =>
                    viewMode === 'table' ? (
                      <CustomerServiceRequestTable
                        rows={pageItems}
                        projectContracts={projectContracts}
                        detailPattern={ROUTES.customer.afterSalesRequest}
                      />
                    ) : (
                      <CustomerServiceRequestGrid
                        rows={pageItems}
                        projectContracts={projectContracts}
                        detailPattern={ROUTES.customer.afterSalesRequest}
                      />
                    )
                  }
                </PagedList>
              )}
            </>
          )
        }}
      </QueryBoundary>
    </div>
  )
}
