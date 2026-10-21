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
          groups.todo.length > 0 ? (
            <Badge tone="danger" icon="assignment_late">
              {groups.todo.length} yêu cầu chờ bạn xử lý
            </Badge>
          ) : (
            'Báo lỗi và bảo trì của khách trên công trình đã bàn giao.'
          )
        }
      />
      <FilterChips
        label="Lọc yêu cầu"
        className="mb-6"
        value={tab}
        onChange={setPicked}
        chips={[
          { value: 'todo', label: 'Chờ bạn', count: groups.todo.length },
          { value: 'open', label: 'Đang làm', count: groups.open.length },
          { value: 'closed', label: 'Đã đóng', count: groups.closed.length },
        ]}
      />
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
