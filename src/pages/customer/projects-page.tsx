import { useState } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { SearchInput } from '@/components/common/ui/field'
import { PagedList } from '@/components/common/ui/pagination'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { CustomerInstallationCards } from '@/features/installations/CustomerInstallationCards'
import { CustomerInstallationGrid } from '@/features/installations/CustomerInstallationGrid'
import { CustomerInstallationTable } from '@/features/installations/CustomerInstallationTable'
import {
  filterCustomerProjects,
  type ProjectFilterStatus,
  type ProjectTimeSort,
} from '@/features/installations/customerInstallationDisplay'
import { awaitsCustomerDecision } from '@/features/installations/installationDisplay'
import { useMyInstallationsQuery } from '@/hooks/useCustomerInstallations'
import { cx } from '@/utils/cx'

export function CustomerProjectsPage() {
  const query = useMyInstallationsQuery()
  const [statusFilter, setStatusFilter] = useState<ProjectFilterStatus>('ALL')
  const [search, setSearch] = useState('')
  const [timeSort, setTimeSort] = useState<ProjectTimeSort>('ALL')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  return (
    <div className="space-y-6">
      <QueryBoundary query={query}>
        {(rawItems) => {
          const waiting = rawItems.filter(awaitsCustomerDecision).length
          const displayedItems = filterCustomerProjects(rawItems, statusFilter, search, timeSort)

          return (
            <>
              {/* Header trang với icon cờ lê, tiêu đề và mô tả */}
              <div className="flex items-start gap-3">
                <div className="mt-1 flex shrink-0 text-primary">
                  <Icon name="build" className="text-[24px]" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-figure font-bold text-fg">Công trình lắp đặt</h1>
                    {waiting > 0 && <Badge tone="danger">{waiting} công trình chờ bạn nghiệm thu</Badge>}
                  </div>
                  <p className="mt-0.5 text-meta text-fg-2">Quản lý và theo dõi các công trình lắp đặt</p>
                </div>
              </div>

              {/* 4 thẻ thống kê và lọc trạng thái nhanh */}
              <CustomerInstallationCards items={rawItems} selected={statusFilter} onSelect={setStatusFilter} />

              {/* Thanh tìm kiếm và bộ lọc */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="min-w-0 flex-1 basis-64">
                  <span className="sr-only">Tìm kiếm công trình</span>
                  <SearchInput
                    name="search"
                    placeholder="Tìm theo mã công trình, mã hợp đồng..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>

                {/* Dropdown lọc trạng thái */}
                <div className="relative inline-flex items-center">
                  <Icon name="filter_alt" className="pointer-events-none absolute left-3 text-[16px] text-fg-3" />
                  <select
                    value={statusFilter}
                    aria-label="Lọc theo trạng thái"
                    onChange={(e) => setStatusFilter(e.target.value as ProjectFilterStatus)}
                    className="h-10 cursor-pointer rounded-control border border-line bg-canvas pl-8 pr-8 text-meta text-fg hover:border-fg-3 focus:border-primary focus:outline-none"
                  >
                    <option value="ALL">Trạng thái: Tất cả</option>
                    <option value="IN_PROGRESS">Đang lắp đặt</option>
                    <option value="AWAITING_HANDOVER">Chờ bàn giao</option>
                    <option value="COMPLETED">Đã bàn giao</option>
                    <option value="CANCELLED">Đã huỷ</option>
                  </select>
                  <Icon name="expand_more" className="pointer-events-none absolute right-2 text-[20px] text-fg-3" />
                </div>

                {/* Dropdown sắp xếp thời gian */}
                <div className="relative inline-flex items-center">
                  <Icon name="calendar_today" className="pointer-events-none absolute left-3 text-[16px] text-fg-3" />
                  <select
                    value={timeSort}
                    aria-label="Sắp xếp thời gian"
                    onChange={(e) => setTimeSort(e.target.value as ProjectTimeSort)}
                    className="h-10 cursor-pointer rounded-control border border-line bg-canvas pl-8 pr-8 text-meta text-fg hover:border-fg-3 focus:border-primary focus:outline-none"
                  >
                    <option value="ALL">Thời gian: Tất cả</option>
                    <option value="NEWEST">Thời gian: Mới nhất</option>
                    <option value="OLDEST">Thời gian: Cũ nhất</option>
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

              {/* Danh sách hiển thị */}
              {rawItems.length === 0 ? (
                <EmptyState title="Chưa có công trình lắp đặt" />
              ) : displayedItems.length === 0 ? (
                <EmptyState
                  title="Không tìm thấy công trình phù hợp"
                  description="Thử đổi bộ lọc hoặc từ khoá tìm kiếm khác."
                />
              ) : (
                <PagedList items={displayedItems} noun="công trình">
                  {(pageItems) =>
                    viewMode === 'table' ? (
                      <CustomerInstallationTable items={pageItems} />
                    ) : (
                      <CustomerInstallationGrid items={pageItems} />
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
