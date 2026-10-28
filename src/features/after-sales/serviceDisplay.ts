import {
  CUSTOMER_TODO_STATUSES,
  FINAL_REQUEST_STATUSES,
  INSTALLATION_WARRANTY_STATUSES,
  ITEM_COVERAGES,
  ITEM_STATUSES,
  MANAGER_TODO_STATUSES,
  SALES_TASK_STATUSES,
  SALES_TASK_TYPES,
  SERVICE_OUTCOMES,
  SERVICE_QUOTATION_STATUSES,
  SERVICE_REQUEST_KINDS,
  SERVICE_REQUEST_STATUSES,
  VISIT_PURPOSES,
  VISIT_STATUSES,
} from '@/common/afterSales'
import type { Tone } from '@/components/common/ui/badge'
import type { TrackerStep } from '@/components/common/ui/progress-tracker'
import { assetTypeLabel, formatDateOnly } from '@/features/installations/installationDisplay'
import { vnDate } from '@/features/scheduling/schedulingDisplay'
import type { InstalledAssetView, ServiceRequestView, ServiceVisitView } from '@/types/res/customerAfterSalesRes'
import { formatMoney } from '@/utils/format'

// Nhãn và điều kiện của yêu cầu bảo hành, sửa chữa, bảo trì. Điều kiện bám handler của backend; backend vẫn kiểm tra lại

export type ServiceViewer = 'customer' | 'manager' | 'sales'

export const requestKindLabel = (kind: string) => SERVICE_REQUEST_KINDS[kind] ?? kind
export const visitPurposeLabel = (purpose: string) => VISIT_PURPOSES[purpose] ?? purpose
export const coverageLabel = (coverage: string) => ITEM_COVERAGES[coverage] ?? coverage
export const outcomeLabel = (outcome: string) => SERVICE_OUTCOMES[outcome] ?? outcome
export const salesTaskTypeLabel = (type: string) => SALES_TASK_TYPES[type] ?? type
export const salesTaskStatusLabel = (status: string) => SALES_TASK_STATUSES[status] ?? status
/** Việc của kinh doanh trên màn Bảo hành, sửa chữa: báo giá sửa chữa và báo giá bảo trì lẻ */
export const isQuotationTask = (task: { taskType: string }) =>
  task.taskType === 'REPAIR_QUOTATION' || task.taskType === 'MAINTENANCE_QUOTATION'

const neutral = (label: string): { label: string; tone: Tone } => ({ label, tone: 'neutral' })

export const itemStatusMeta = (status: string) => ITEM_STATUSES[status] ?? neutral(status)
export const visitStatusMeta = (status: string) => VISIT_STATUSES[status] ?? neutral(status)
export const quotationStatusMeta = (status: string) => SERVICE_QUOTATION_STATUSES[status] ?? neutral(status)
export const warrantyStatusMeta = (status: string) => INSTALLATION_WARRANTY_STATUSES[status] ?? neutral(status)

export const formatVnd = (amount: number) => formatMoney(amount, 'VND')

/** "Inverter Huawei SUN2000 (serial ABC)" */
export function assetName(asset: InstalledAssetView) {
  return `${assetTypeLabel(asset.assetType)} ${asset.manufacturer} ${asset.model} (serial ${asset.serialNumber})`
}

/** "Còn hạn (đến 10/10/2036)". Backend chỉ ghi hạn bảo hành lắp đặt cho yêu cầu báo lỗi */
export function installationWarrantyText(r: ServiceRequestView) {
  if (!r.installationWarrantyEndsAt) return 'Hợp đồng không ghi thời hạn'
  const until = formatDateOnly(vnDate(r.installationWarrantyEndsAt))
  return `${r.withinInstallationWarranty ? 'Còn hạn' : 'Hết hạn'} (đến ${until})`
}

/** Hạng mục còn chờ quản lý quyết định ai chịu chi phí */
export const pendingItems = (request: ServiceRequestView) =>
  request.items.filter((i) => i.coverage === 'PENDING' && i.status === 'OPEN')

/** Hạng mục cần báo giá: khách trả tiền (hoặc gói thiên tai hỗ trợ một phần), chưa được duyệt */
export const quotableItems = (request: ServiceRequestView) =>
  request.items.filter(
    (i) =>
      (i.coverage === 'CHARGEABLE' || i.coverage === 'DISASTER_PROTECTION') &&
      (i.status === 'OPEN' || i.status === 'QUOTED'),
  )

export const isFinalRequest = (status: string) => FINAL_REQUEST_STATUSES.includes(status)

/** Việc người xem phải làm ở trạng thái này. Kinh doanh chỉ làm báo giá */
export function isTodo(status: string, viewer: ServiceViewer) {
  if (viewer === 'customer') return CUSTOMER_TODO_STATUSES.includes(status)
  if (viewer === 'manager') return MANAGER_TODO_STATUSES.includes(status)
  return status === 'AWAITING_QUOTATION'
}

/** Đỏ khi người xem phải làm, xanh lá khi hoàn thành, xám khi đã đóng, còn lại là đang chờ người khác */
export function requestStatusMeta(status: string, viewer: ServiceViewer): { label: string; tone: Tone } {
  const label = SERVICE_REQUEST_STATUSES[status] ?? status
  if (isTodo(status, viewer)) return { label, tone: 'danger' }
  if (status === 'COMPLETED') return { label, tone: 'ok' }
  if (isFinalRequest(status)) return { label, tone: 'neutral' }
  return { label, tone: 'info' }
}

/** Việc cần làm lên đầu, rồi yêu cầu đang mở, đã đóng xuống cuối; cùng nhóm thì mới gửi lên trước */
export function byRequestRank<T extends { status: string; createdAt: string }>(viewer: ServiceViewer) {
  const rank = (status: string) => (isTodo(status, viewer) ? 0 : isFinalRequest(status) ? 2 : 1)
  return (a: T, b: T) => rank(a.status) - rank(b.status) || b.createdAt.localeCompare(a.createdAt)
}

/** Buổi hẹn đang mở: đã hẹn hoặc đang làm. Backend chỉ cho một buổi mở mỗi lúc */
export function openVisit(request: ServiceRequestView): ServiceVisitView | null {
  return request.visits.find((v) => v.status === 'SCHEDULED' || v.status === 'IN_PROGRESS') ?? null
}

/** Buổi hẹn khách phải xác nhận (giờ hẹn khác giờ khách chọn) */
export function visitAwaitingCustomer(request: ServiceRequestView) {
  const visit = openVisit(request)
  return visit && visit.status === 'SCHEDULED' && visit.customerConfirmationRequired && !visit.customerConfirmedAt
    ? visit
    : null
}

/** Báo giá còn chờ khách: chờ duyệt hoặc đã đồng ý mà chưa thanh toán */
export function openQuotation(request: ServiceRequestView) {
  return request.quotations.find((q) => q.status === 'ISSUED' || q.status === 'ACCEPTED') ?? null
}

/**
 * Loại buổi hẹn quản lý cần xếp lúc này (ServiceManagerHandlers.PurposeFor), null khi không cần.
 * Buổi đã hẹn mà kỹ thuật viên chưa bắt đầu thì vẫn đổi được (phải ghi lý do)
 */
export function visitToSchedule(request: ServiceRequestView): string | null {
  const visit = openVisit(request)
  if (visit) return visit.status === 'SCHEDULED' ? visit.purpose : null
  if (request.status === 'REWORK_REQUIRED') return 'REWORK'
  if (request.kind === 'FAULT' && request.status === 'SUBMITTED') return 'INSPECTION'
  if (request.kind === 'FAULT' && request.status === 'READY_FOR_WORK') return 'REPAIR'
  if (request.kind === 'MAINTENANCE' && request.status === 'SUBMITTED') return 'MAINTENANCE'
  if (request.kind === 'ONE_TIME_MAINTENANCE' && request.status === 'READY_FOR_WORK') return 'MAINTENANCE'
  return null
}

/** Khách huỷ được trên mạng khi chưa bắt đầu làm và chưa có yêu cầu huỷ đang chờ (ServiceCustomerHandlers.CancelAsync) */
export function customerCanCancel(request: ServiceRequestView) {
  const started = ['IN_PROGRESS', 'PENDING_CUSTOMER_ACCEPTANCE', 'DISPUTED', 'REWORK_REQUIRED'].includes(request.status)
  return !isFinalRequest(request.status) && !request.cancellationRequestedAt && !started
}

/** Buổi hẹn mới nhất có báo cáo, để khách đọc trước khi nghiệm thu */
export function lastReport(request: ServiceRequestView) {
  return [...request.visits].reverse().find((v) => v.report) ?? null
}

// Bước của một yêu cầu. Báo lỗi: kiểm tra → xét bảo hành, báo giá → sửa → nghiệm thu; bảo trì: báo giá → bảo trì → nghiệm thu
function requestStage(r: ServiceRequestView) {
  const visit = openVisit(r)
  switch (r.status) {
    case 'SUBMITTED':
      return 0
    case 'SCHEDULED':
    case 'IN_PROGRESS':
      return r.kind === 'FAULT' && visit?.purpose === 'INSPECTION' ? 0 : 2
    case 'AWAITING_DECISION':
    case 'AWAITING_QUOTATION':
    case 'AWAITING_CUSTOMER':
      return 1
    case 'READY_FOR_WORK':
    case 'REWORK_REQUIRED':
      return 2
    case 'PENDING_CUSTOMER_ACCEPTANCE':
    case 'DISPUTED':
      return 3
    case 'COMPLETED':
      return 4
    default:
      return -1
  }
}

export function requestTrackerSteps(r: ServiceRequestView): TrackerStep[] {
  const now = requestStage(r)
  const labels =
    r.kind === 'FAULT'
      ? ['Kiểm tra', 'Xét bảo hành, báo giá', 'Sửa chữa', 'Nghiệm thu']
      : ['Gửi yêu cầu', 'Báo giá', 'Bảo trì', 'Nghiệm thu']
  return labels.map((label, i) => ({ label, state: now > i ? 'done' : now === i ? 'current' : 'todo' }))
}
