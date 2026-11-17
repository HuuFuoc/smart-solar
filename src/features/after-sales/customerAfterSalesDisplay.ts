import { isTodo, requestKindLabel } from '@/features/after-sales/serviceDisplay'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'
import { fold } from '@/utils/fold'

export type ServiceRequestFilterStatus = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type ServiceRequestTimeSort = 'ALL' | 'NEWEST' | 'OLDEST'

/** Lọc và sắp xếp danh sách yêu cầu dịch vụ của khách */
export function filterCustomerServiceRequests(
  items: ServiceRequestSummary[],
  search: string,
  statusFilter: ServiceRequestFilterStatus,
  timeSort: ServiceRequestTimeSort,
  projectContracts: Map<string, string>,
): ServiceRequestSummary[] {
  let filtered = [...items]

  if (statusFilter === 'TODO') {
    filtered = filtered.filter((r) => isTodo(r.status, 'customer'))
  } else if (statusFilter === 'COMPLETED') {
    filtered = filtered.filter((r) => r.status === 'COMPLETED')
  } else if (statusFilter === 'CANCELLED') {
    filtered = filtered.filter((r) => r.status === 'CANCELLED')
  } else if (statusFilter === 'IN_PROGRESS') {
    filtered = filtered.filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED')
  }

  // Không phân biệt dấu: "bao loi" khớp "Báo lỗi"
  const query = fold(search.trim())
  if (query) {
    filtered = filtered.filter((r) =>
      fold(
        `${r.requestNumber} ${r.description} ${requestKindLabel(r.kind)} ${projectContracts.get(r.projectId) ?? ''}`,
      ).includes(query),
    )
  }

  if (timeSort === 'NEWEST') {
    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } else if (timeSort === 'OLDEST') {
    filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  return filtered
}
