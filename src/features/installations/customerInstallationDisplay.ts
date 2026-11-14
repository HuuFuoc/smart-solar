import { awaitsCustomerDecision, installationStatusMeta } from '@/features/installations/installationDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatDateVn, formatTime, vnDate } from '@/features/scheduling/schedulingDisplay'
import type { InstallationCustomerView } from '@/types/res/customerInstallationsRes'

export type ProjectFilterStatus = 'ALL' | 'IN_PROGRESS' | 'AWAITING_HANDOVER' | 'COMPLETED' | 'CANCELLED'

export type ProjectTimeSort = 'ALL' | 'NEWEST' | 'OLDEST'

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

function weekdayName(iso: string): string {
  const day = vnDate(iso)
  if (!day) return ''
  const d = new Date(`${day}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? '' : (WEEKDAYS[d.getUTCDay()] ?? '')
}

/** Tên giai đoạn ngắn kèm vị trí mốc thời gian hiển thị dưới tên công trình */
export function formatProjectPhaseLabel(p: InstallationCustomerView): string {
  if (p.status === 'COMPLETED') return 'Bàn giao'
  if (p.status === 'PENDING_CUSTOMER_ACCEPTANCE' || awaitsCustomerDecision(p)) return 'Chờ nghiệm thu'
  if (p.status === 'CANCELLED') return 'Đã huỷ'
  if (p.scheduledStartsAt) {
    const day = weekdayName(p.scheduledStartsAt)
    return day ? `Lắp đặt ${day}` : 'Lắp đặt'
  }
  return 'Lắp đặt'
}

/** Thời gian thực hiện hoặc bàn giao của công trình */
export function formatProjectDateTime(p: InstallationCustomerView): {
  isRange: boolean
  start: string
  end?: string
} {
  if (p.scheduledStartsAt && p.scheduledEndsAt) {
    const sDate = formatDateVn(p.scheduledStartsAt)
    const sTime = formatTime(p.scheduledStartsAt)
    const eDate = formatDateVn(p.scheduledEndsAt)
    const eTime = formatTime(p.scheduledEndsAt)
    return {
      isRange: true,
      start: `${sDate} ${sTime}`,
      end: `${eDate} ${eTime}`,
    }
  }
  const singleIso = p.handoverAt ?? p.completedAt ?? p.cancelledAt ?? p.startedAt ?? p.scheduledStartsAt
  if (singleIso) {
    return {
      isRange: false,
      start: `${formatDateVn(singleIso)} ${formatTime(singleIso)}`,
    }
  }
  return {
    isRange: false,
    start: '—',
  }
}

export type StatusBadgeConfig = {
  label: string
  icon: string
  className: string
}

/** Cấu hình nhãn trạng thái và icon cho bảng công trình khách hàng */
export function customerProjectStatusBadge(p: InstallationCustomerView): StatusBadgeConfig {
  if (p.status === 'IN_PROGRESS' || p.status === 'SCHEDULED') {
    return {
      label: 'Đang lắp đặt',
      icon: 'progress_activity',
      className: 'border border-info/30 bg-info-soft text-info',
    }
  }
  if (p.status === 'PENDING_CUSTOMER_ACCEPTANCE' || awaitsCustomerDecision(p)) {
    return {
      label: 'Chờ bàn giao',
      icon: 'handshake',
      className: 'border border-warn/30 bg-warn-soft text-warn',
    }
  }
  if (p.status === 'COMPLETED') {
    return {
      label: 'Đã bàn giao',
      icon: 'check_circle',
      className: 'border border-ok/30 bg-ok-soft text-ok',
    }
  }
  if (p.status === 'CANCELLED') {
    return {
      label: 'Đã huỷ',
      icon: 'cancel',
      className: 'border border-line bg-surface-2 text-fg-3',
    }
  }
  const meta = installationStatusMeta(p.status, 'customer')
  return {
    label: meta.label,
    icon: 'info',
    className: 'border border-line bg-surface-2 text-fg-2',
  }
}

const timeOf = (iso: string | null) => (iso ? new Date(iso).getTime() : 0)

function projectSortTime(p: InstallationCustomerView): number {
  return timeOf(p.handoverAt ?? p.completedAt ?? p.scheduledStartsAt ?? p.startedAt)
}

/** Lọc và sắp xếp danh sách công trình theo tiêu chí người dùng */
export function filterCustomerProjects(
  items: InstallationCustomerView[],
  statusFilter: ProjectFilterStatus,
  search: string,
  timeSort: ProjectTimeSort,
): InstallationCustomerView[] {
  let filtered = [...items]

  if (statusFilter === 'IN_PROGRESS') {
    filtered = filtered.filter(
      (p) => p.status === 'IN_PROGRESS' || p.status === 'SCHEDULED' || p.status === 'REWORK_REQUIRED',
    )
  } else if (statusFilter === 'AWAITING_HANDOVER') {
    filtered = filtered.filter((p) => p.status === 'PENDING_CUSTOMER_ACCEPTANCE' || awaitsCustomerDecision(p))
  } else if (statusFilter === 'COMPLETED') {
    filtered = filtered.filter((p) => p.status === 'COMPLETED')
  } else if (statusFilter === 'CANCELLED') {
    filtered = filtered.filter((p) => p.status === 'CANCELLED')
  }

  const query = search.trim().toLowerCase()
  if (query) {
    filtered = filtered.filter((p) => {
      const pId = p.projectId.toLowerCase()
      const pCode = shortCode(p.projectId).toLowerCase()
      const cId = p.contractId.toLowerCase()
      const cCode = shortCode(p.contractId).toLowerCase()
      const tech = (p.technicianName ?? '').toLowerCase()
      return (
        pId.includes(query) ||
        pCode.includes(query) ||
        cId.includes(query) ||
        cCode.includes(query) ||
        tech.includes(query)
      )
    })
  }

  if (timeSort === 'NEWEST') {
    filtered.sort((a, b) => projectSortTime(b) - projectSortTime(a))
  } else if (timeSort === 'OLDEST') {
    filtered.sort((a, b) => projectSortTime(a) - projectSortTime(b))
  }

  return filtered
}
