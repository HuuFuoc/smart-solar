import {
  ASSET_TYPES,
  ASSIGNMENT_STATUSES,
  CHECKLIST_ITEMS,
  CHECKLIST_STATUS_LABELS,
  INSTALLATION_EVENT_TYPES,
  INSTALLATION_STATUS_LABELS,
  INSTALLATION_STATUS_TONES,
} from '@/common/installation'
import type { Tone } from '@/components/common/ui/badge'
import { formatDay, formatTime, vnDate } from '@/features/scheduling/schedulingDisplay'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { ChecklistItemView, InstallationSiteInfo, InstallationStatus } from '@/types/res/managerInstallationsRes'

// Nhãn và quy tắc hiển thị của dự án thi công phía quản lý / quản trị
// Tập trạng thái chỉ lấy từ InstallationStatuses của backend; các điều kiện dưới đây chép từ InstallationStatuses.Is*

/** Thứ tự trạng thái theo vòng đời, dùng cho bộ lọc */
export const INSTALLATION_STATUS_ORDER = Object.keys(INSTALLATION_STATUS_LABELS) as InstallationStatus[]

export function isInstallationStatus(value: string | null): value is InstallationStatus {
  return value !== null && value in INSTALLATION_STATUS_LABELS
}

export function projectStatusMeta(status: string): { label: string; tone: Tone } {
  return {
    label: INSTALLATION_STATUS_LABELS[status] ?? status,
    tone: INSTALLATION_STATUS_TONES.staff[status] ?? 'neutral',
  }
}

/** Phân công, đổi người hoặc đổi lịch được (IsAssignable) */
export function canAssign(status: InstallationStatus) {
  return [
    'PENDING_ASSIGNMENT',
    'PENDING_TECHNICIAN_ACCEPTANCE',
    'SCHEDULED',
    'IN_PROGRESS',
    'REWORK_REQUIRED',
  ].includes(status)
}

/** Đã bắt đầu thi công (IsStarted): đổi người vẫn giữ trạng thái và bắt buộc lý do */
export function hasStarted(status: InstallationStatus) {
  return status === 'IN_PROGRESS' || status === 'REWORK_REQUIRED'
}

/** Huỷ chỉ trước khi thi công (IsCancellable) */
export function canCancel(status: InstallationStatus) {
  return status === 'PENDING_ASSIGNMENT' || status === 'PENDING_TECHNICIAN_ACCEPTANCE' || status === 'SCHEDULED'
}

/** Dự án đã khép lại (IsFinal): checklist không sửa được nữa */
export function isFinal(status: InstallationStatus) {
  return status === 'COMPLETED' || status === 'CANCELLED'
}

export function assignmentStatusMeta(status: string): { label: string; tone: Tone } {
  return ASSIGNMENT_STATUSES[status] ?? { label: status, tone: 'neutral' }
}

export function checklistItemLabel(item: Pick<ChecklistItemView, 'code' | 'title'>) {
  return CHECKLIST_ITEMS[item.code] ?? item.title
}

export function checklistStatusLabel(status: string) {
  return CHECKLIST_STATUS_LABELS[status] ?? status
}

/** Mục bắt buộc còn "Chưa xong" chặn kỹ thuật viên bắt đầu thi công */
export function blockingChecklist(items: ChecklistItemView[]) {
  return items.filter((item) => item.isRequired && item.status === 'PENDING')
}

export function eventLabel(eventType: string) {
  return INSTALLATION_EVENT_TYPES[eventType] ?? eventType
}

export function assetTypeLabel(assetType: string) {
  return ASSET_TYPES[assetType] ?? assetType
}

/** "Thứ Ba, 21/10/2026, 08:00–17:00" khi cùng ngày, khác ngày thì ghi đủ hai mốc */
export function formatInterval(startIso: string | null, endIso: string | null) {
  if (!startIso || !endIso) return '—'
  const startDay = vnDate(startIso)
  const endDay = vnDate(endIso)
  if (startDay === endDay)
    return `${formatDay(startDay, { year: true })}, ${formatTime(startIso)}–${formatTime(endIso)}`
  return `${formatDay(startDay)} ${formatTime(startIso)} – ${formatDay(endDay, { year: true })} ${formatTime(endIso)}`
}

/** Hết khung thi công mà chưa bắt đầu: kỹ thuật viên không bắt đầu được, quản lý phải đổi lịch */
export function scheduleExpired(status: InstallationStatus, endsAt: string | null, now = Date.now()) {
  return (
    (status === 'SCHEDULED' || status === 'PENDING_TECHNICIAN_ACCEPTANCE') &&
    !!endsAt &&
    new Date(endsAt).getTime() <= now
  )
}

export function formatSiteAddress(site: InstallationSiteInfo | null) {
  if (!site) return '—'
  const text = [site.streetLine, site.ward, site.district, site.province]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ')
  return text || '—'
}

/** Có toạ độ thì ghim đúng điểm, không thì tìm theo địa chỉ */
export function siteMapUrl(site: InstallationSiteInfo | null) {
  if (!site) return null
  if (site.latitude != null && site.longitude != null)
    return `https://www.google.com/maps?q=${site.latitude},${site.longitude}`
  const address = formatSiteAddress(site)
  return address === '—' ? null : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

const sizeFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

export function formatFileSize(bytes: number | null) {
  if (bytes == null) return null
  if (bytes < 1024 * 1024) return `${sizeFormat.format(bytes / 1024)} KB`
  return `${sizeFormat.format(bytes / (1024 * 1024))} MB`
}

/** Câu lỗi của thao tác thi công; 429 kèm số giây phải chờ */
export function installationErrorMessage(error: unknown) {
  if (isApiError(error) && error.status === 429)
    return error.retryAfter
      ? `Bạn thao tác quá nhanh. Thử lại sau ${error.retryAfter} giây.`
      : 'Bạn thao tác quá nhanh. Chờ một phút rồi thử lại.'
  return errorMessage(error)
}

/** Lỗi do dự án đã đổi ở nơi khác (revision cũ hoặc trạng thái mới): dữ liệu đã tự tải lại */
export function isStaleError(error: unknown) {
  return (
    isApiError(error) && (error.code === 'INSTALLATION_STALE_REVISION' || error.code === 'INSTALLATION_INVALID_STATE')
  )
}
