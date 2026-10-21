import {
  ACCEPTANCE_DECIDERS,
  ACCEPTANCE_DECISIONS,
  ASSET_TYPES,
  CUSTOMER_INSTALLATION_LABELS,
  INSTALLATION_STATUS_LABELS,
  INSTALLATION_STATUS_TONES,
  TECHNICIAN_INSTALLATION_LABELS,
  type InstallationViewer,
} from '@/common/installation'
import type { Tone } from '@/components/common/ui/badge'
import { formatAppointment, formatDay, formatTime, vnDate } from '@/features/scheduling/schedulingDisplay'
import type { AcceptanceView, InstallationCustomerView } from '@/types/res/customerInstallationsRes'

// Nhãn và định dạng của dự án lắp đặt, dùng chung cho mọi vai trò. Giờ luôn theo giờ Việt Nam

const VIEWER_LABELS: Partial<Record<InstallationViewer, Record<string, string>>> = {
  customer: CUSTOMER_INSTALLATION_LABELS,
  technician: TECHNICIAN_INSTALLATION_LABELS,
}

/** Nhãn + màu trạng thái theo người xem. Mã lạ in nguyên mã, màu xám */
export function installationStatusMeta(status: string, viewer: InstallationViewer): { label: string; tone: Tone } {
  return {
    label: VIEWER_LABELS[viewer]?.[status] ?? INSTALLATION_STATUS_LABELS[status] ?? status,
    tone: INSTALLATION_STATUS_TONES[viewer][status] ?? 'neutral',
  }
}

export function assetTypeLabel(type: string) {
  return ASSET_TYPES[type] ?? type
}

/** Kết quả một lần nghiệm thu. Quản lý trả về thì ghi rõ để không tưởng là khách yêu cầu */
export function acceptanceDecisionMeta(a: Pick<AcceptanceView, 'decision' | 'decidedBy'>): {
  label: string
  tone: Tone
} {
  if (a.decision === 'REWORK_REQUESTED' && a.decidedBy === 'STAFF')
    return { label: 'Quản lý trả về để sửa', tone: 'neutral' }
  return ACCEPTANCE_DECISIONS[a.decision] ?? { label: a.decision, tone: 'neutral' }
}

export function deciderLabel(decidedBy: string | null | undefined) {
  return decidedBy ? (ACCEPTANCE_DECIDERS[decidedBy] ?? decidedBy) : null
}

/** Lần nghiệm thu đang chờ quyết định; backend chỉ giữ tối đa một lần PENDING */
export function pendingAcceptance(p: Pick<InstallationCustomerView, 'acceptances'>) {
  return p.acceptances.find((a) => a.decision === 'PENDING') ?? null
}

/** Khách gửi được quyết định: dự án đang chờ nghiệm thu và còn một báo cáo chưa quyết (cùng điều kiện với backend) */
export function awaitsCustomerDecision(p: Pick<InstallationCustomerView, 'status' | 'acceptances'>) {
  return p.status === 'PENDING_CUSTOMER_ACCEPTANCE' && pendingAcceptance(p) !== null
}

/**
 * Khung giờ lắp đặt. Trong một ngày: "Thứ Ba, 21/10/2026, 08:00–17:00";
 * nhiều ngày: "Thứ Ba, 21/10 08:00 – Thứ Tư, 22/10/2026 17:00". Thiếu giờ thì null
 */
export function formatInstallationWindow(startIso: string | null | undefined, endIso: string | null | undefined) {
  if (!startIso || !endIso) return null
  const start = vnDate(startIso)
  const end = vnDate(endIso)
  if (start === end) return formatAppointment(startIso, endIso)
  const sameYear = start.slice(0, 4) === end.slice(0, 4)
  return `${formatDay(start, { year: !sameYear })} ${formatTime(startIso)} – ${formatDay(end, { year: true })} ${formatTime(endIso)}`
}

/** "22/10/2036" từ chuỗi ngày YYYY-MM-DD, không qua Date để khỏi lệch múi giờ */
export function formatDateOnly(date: string | null | undefined) {
  if (!date) return '—'
  const [year, month, day] = date.split('-')
  return year && month && day ? `${day}/${month}/${year}` : date
}

/** "12 năm", "18 tháng", "Không bảo hành"; chưa khai thì "—" */
export function formatWarrantyMonths(months: number | null | undefined) {
  if (months == null) return '—'
  if (months === 0) return 'Không bảo hành'
  return months % 12 === 0 ? `${months / 12} năm` : `${months} tháng`
}

const sizeFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

/** "2,4 MB"; null khi không có kích thước */
export function formatFileSize(bytes: number | null | undefined) {
  if (bytes == null) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${sizeFormat.format(bytes / 1024)} KB`
  return `${sizeFormat.format(bytes / 1024 / 1024)} MB`
}

/** Gom theo lần nghiệm thu (round), lần mới nhất lên đầu */
export function groupByRound<T extends { round: number }>(items: T[]) {
  const rounds = new Map<number, T[]>()
  for (const item of items) rounds.set(item.round, [...(rounds.get(item.round) ?? []), item])
  return [...rounds.entries()].sort(([a], [b]) => b - a).map(([round, list]) => ({ round, items: list }))
}
