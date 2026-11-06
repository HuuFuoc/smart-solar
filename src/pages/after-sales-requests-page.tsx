import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { FilterChips } from '@/components/common/ui/chips'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { ServiceRequestList } from '@/features/after-sales/ServiceRequestList'
import { byRequestRank, isFinalRequest, isTodo } from '@/features/after-sales/serviceDisplay'
import { useServiceRequestsQuery } from '@/hooks/useManagerAfterSales'
import { ROUTES } from '@/routes/paths'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'

type Tab = 'todo' | 'open' | 'closed'

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
  const rows = [...(query.data ?? [])].sort(byRequestRank('manager'))
  const groups: Record<Tab, ServiceRequestSummary[]> = {
    todo: rows.filter((r) => tabOf(r) === 'todo'),
    open: rows.filter((r) => tabOf(r) === 'open'),
    closed: rows.filter((r) => tabOf(r) === 'closed'),
  }
  const tab: Tab = picked ?? (groups.todo.length > 0 ? 'todo' : 'open')

  return (
    <>
      <PageHeader
        title="Bảo hành, sửa chữa"
        description={
          groups.todo.length > 0 ? <Badge tone="danger">{groups.todo.length} yêu cầu chờ bạn xử lý</Badge> : undefined
        }
      />
      <FilterChips
        label="Lọc yêu cầu"
        className="mb-4"
        value={tab}
        onChange={setPicked}
        chips={[
          { value: 'todo', label: 'Chờ bạn xử lý', count: groups.todo.length },
          { value: 'open', label: 'Đang làm', count: groups.open.length },
          { value: 'closed', label: 'Đã đóng', count: groups.closed.length },
        ]}
      />

      {/* Thanh chú thích trạng thái & tổng hợp */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-container border border-line bg-surface-1 px-4 py-2.5 text-meta shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-fg-2">Chú thích trạng thái:</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-fg-2">Cần xử lý gấp</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-fg-2">Đang xử lý / Khảo sát</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-fg-2">Đã hoàn thành</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-fg-3">
          <span>
            Hiển thị: <strong className="text-fg-1">{groups[tab].length}</strong> yêu cầu
          </span>
          {groups.todo.length > 0 && (
            <span className="text-rose-600 dark:text-rose-400 font-medium">{groups.todo.length} chờ tiếp nhận</span>
          )}
        </div>
      </div>

      <QueryBoundary query={query}>
        {() =>
          groups[tab].length === 0 ? (
            <EmptyState {...EMPTY[tab]} />
          ) : (
            <ServiceRequestList rows={groups[tab]} viewer="manager" detailPattern={detailPattern} />
          )
        }
      </QueryBoundary>
    </>
  )
}

export function ManageAfterSalesPage() {
  return <AfterSalesRequestsPage detailPattern={ROUTES.manage.afterSalesRequest} />
}

export function AdminAfterSalesPage() {
  return <AfterSalesRequestsPage detailPattern={ROUTES.admin.afterSalesRequest} />
}
