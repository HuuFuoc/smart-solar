import { isTodo, requestKindLabel, requestStatusMeta } from '@/features/after-sales/serviceDisplay'
import { formatDateVn, formatTime } from '@/features/scheduling/schedulingDisplay'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'

export type ServiceRequestFilterStatus = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type ServiceRequestTimeSort = 'ALL' | 'NEWEST' | 'OLDEST'

export type BadgeMeta = {
  label: string
  icon: string
  className: string
}

/** Cấu hình badge loại dịch vụ cho màn khách hàng */
export function customerRequestKindBadge(kind: string): BadgeMeta {
  const label = requestKindLabel(kind)
  if (kind === 'FAULT') {
    return {
      label,
      icon: 'verified_user',
      className: 'border border-accent-line/30 bg-accent-soft text-primary',
    }
  }
  return {
    label,
    icon: 'build',
    className: 'border border-accent-line/30 bg-accent-soft text-primary',
  }
}

/** Cấu hình badge trạng thái cho màn khách hàng */
export function customerRequestStatusBadge(status: string): BadgeMeta {
  if (status === 'COMPLETED') {
    return {
      label: 'Hoàn thành',
      icon: 'check_circle',
      className: 'border border-ok/30 bg-ok-soft text-ok',
    }
  }
  if (status === 'CANCELLED') {
    return {
      label: 'Đã huỷ',
      icon: 'cancel',
      className: 'border border-line bg-surface-2 text-fg-3',
    }
  }
  if (isTodo(status, 'customer')) {
    const meta = requestStatusMeta(status, 'customer')
    return {
      label: meta.label,
      icon: 'schedule',
      className: 'border border-warn/30 bg-warn-soft text-warn',
    }
  }
  const meta = requestStatusMeta(status, 'customer')
  return {
    label: meta.label,
    icon: 'schedule',
    className: 'border border-info/30 bg-info-soft text-info',
  }
}

/** Định dạng ngày giờ tạo yêu cầu */
export function formatRequestCreatedAt(iso: string): string {
  if (!iso) return '—'
  const date = formatDateVn(iso)
  const time = formatTime(iso)
  return `${date} ${time}`
}

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

  const query = search.trim().toLowerCase()
  if (query) {
    filtered = filtered.filter((r) => {
      const num = r.requestNumber.toLowerCase()
      const desc = r.description.toLowerCase()
      const kind = requestKindLabel(r.kind).toLowerCase()
      const contract = (projectContracts.get(r.projectId) ?? '').toLowerCase()
      return num.includes(query) || desc.includes(query) || kind.includes(query) || contract.includes(query)
    })
  }

  if (timeSort === 'NEWEST') {
    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } else if (timeSort === 'OLDEST') {
    filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  return filtered
}
