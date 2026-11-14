import type { AssetCorrectionRequest, StopWorkRequest } from '@/types/req/managerAfterSalesReq'
import type { InstalledAssetView, ServiceRequestSummary, ServiceRequestView } from '@/types/res/customerAfterSalesRes'
import type { SalesTaskView } from '@/types/res/salesAfterSalesRes'

// Luật các quyết định của quản lý / quản trị sau bán: hỗ trợ gói thiên tai, đóng vì trùng, dừng việc, không thực hiện được,
// sửa thiết bị, giao việc kinh doanh. Bám ServiceManagerHandlers, SalesTaskHandlers.AssignAsync của backend `main` (7c79fa8).
// Chỉ để bật / tắt nút và báo lỗi trước khi gửi; backend vẫn kiểm lại. Không import giá trị qua "@/" để chạy được bằng
// node --test

/** Text.Trim của backend: lý do dài hơn bị cắt, nên chặn ở ô nhập */
export const CLAIM_REASON_MAX = 1000
export const DUPLICATE_REASON_MAX = 500
export const STOP_REASON_MAX = 1000
export const NOT_FULFILLED_REASON_MAX = 1000
export const ASSET_REASON_MAX = 500
export const TASK_REASON_MAX = 500
export const ASSET_FIELD_MAX = {
  manufacturer: 100,
  model: 100,
  serialNumber: 100,
  positionCode: 50,
  specifications: 500,
} as const

const FINAL_STATUSES = ['COMPLETED', 'NOT_COMPLETED', 'CANCELLED', 'CLOSED_DUPLICATE']
const isFinal = (status: string) => FINAL_STATUSES.includes(status)

const tooLong = (text: string, max: number) => (text.trim().length > max ? `Tối đa ${max} ký tự.` : undefined)

// ---------------------------------------------------------------- hỗ trợ của gói thiên tai

type ClaimHolder = Pick<ServiceRequestView, 'claim'>

/** Quyết định được khi đang chờ: lần đầu (SUBMITTED) hoặc khách xin xét lại (RECONSIDERATION_REQUESTED) */
export const canDecideClaim = (r: ClaimHolder) =>
  r.claim?.status === 'SUBMITTED' || r.claim?.status === 'RECONSIDERATION_REQUESTED'

/** Từ chối bắt buộc lý do (khách đọc được) */
export function claimReasonError(approve: boolean, reason: string) {
  if (!approve && !reason.trim()) return 'Ghi lý do từ chối để khách biết.'
  return tooLong(reason, CLAIM_REASON_MAX)
}

/** Hạng mục chỉ chọn "Gói bảo vệ thiên tai" khi hỗ trợ đã được duyệt */
export const disasterCoverageAllowed = (r: ClaimHolder) => r.claim?.status === 'APPROVED'

/** Còn việc xét bảo hành: yêu cầu đang mở, chưa có hạng mục (chưa kiểm tra) hoặc còn hạng mục chưa xét */
export const coverageDecisionAhead = (r: Pick<ServiceRequestView, 'status' | 'items'>) =>
  !isFinal(r.status) && (r.items.length === 0 || r.items.some((i) => i.coverage === 'PENDING'))

// ---------------------------------------------------------------- đóng vì trùng

type Quoted = Pick<ServiceRequestView, 'quotations'>

export const hasPaidQuotation = (r: Quoted) => r.quotations.some((q) => q.status === 'PAID')

/** Lý do không đóng vì trùng được; null khi đóng được */
export function duplicateBlocker(r: Pick<ServiceRequestView, 'status' | 'quotations'>) {
  if (isFinal(r.status)) return 'Yêu cầu đã đóng.'
  if (hasPaidQuotation(r)) return 'Khách đã thanh toán báo giá của yêu cầu này nên không đóng vì trùng được.'
  return null
}

/**
 * Yêu cầu gốc chọn được: cùng công trình, khác yêu cầu đang xem. Backend chỉ cảnh báo trùng (`possibleDuplicates`), không tự
 * đóng; các yêu cầu được cảnh báo lên đầu, rồi yêu cầu gửi trước
 */
export function duplicateCandidates(
  r: Pick<ServiceRequestView, 'requestId' | 'projectId' | 'possibleDuplicates'>,
  all: ServiceRequestSummary[],
) {
  const flagged = new Set(r.possibleDuplicates.map((d) => d.requestId))
  return all
    .filter((o) => o.projectId === r.projectId && o.requestId !== r.requestId)
    .sort(
      (a, b) =>
        Number(flagged.has(b.requestId)) - Number(flagged.has(a.requestId)) || a.createdAt.localeCompare(b.createdAt),
    )
}

export function duplicateErrors(originalRequestId: string, reason: string) {
  const errors: { original?: string; reason?: string } = {}
  if (!originalRequestId) errors.original = 'Chọn yêu cầu gốc.'
  const long = tooLong(reason, DUPLICATE_REASON_MAX)
  if (long) errors.reason = long
  return errors
}

// ---------------------------------------------------------------- dừng việc đã bắt đầu

type Progressing = Pick<ServiceRequestView, 'status' | 'visits'>

/** Đã bắt đầu làm: như ServiceCustomerHandlers.CancelAsync (khách không tự huỷ được nữa) */
export function workStarted(r: Progressing) {
  return (
    r.visits.some((v) => v.status === 'IN_PROGRESS') ||
    ['IN_PROGRESS', 'PENDING_CUSTOMER_ACCEPTANCE', 'DISPUTED', 'REWORK_REQUIRED'].includes(r.status)
  )
}

/**
 * Dừng ngoại lệ chỉ cho việc đã bắt đầu. Việc chưa làm thì khách tự huỷ, hoặc gửi yêu cầu huỷ khi đã trả tiền (quản lý xét ở
 * khối "Yêu cầu huỷ của khách")
 */
export const canStopWork = (r: Progressing) => !isFinal(r.status) && workStarted(r)

/** Nhóm không làm hoàn tiền: luôn gửi 0 để backend không ghi khoản hoàn */
export function stopBody(reason: string): StopWorkRequest {
  return { reason: reason.trim(), refundAmount: 0 }
}

// ---------------------------------------------------------------- không thực hiện được

/**
 * Chỉ bảo trì lẻ còn mở mà chưa làm (ConfirmCannotFulfillAsync): Smart Solar không bố trí được người hoặc khách không nhận
 * giờ khác. Yêu cầu bị huỷ
 */
export const canMarkNotFulfilled = (r: Pick<ServiceRequestView, 'kind' | 'status' | 'visits'>) =>
  r.kind === 'ONE_TIME_MAINTENANCE' &&
  !isFinal(r.status) &&
  !r.visits.some((v) => v.status === 'IN_PROGRESS' || v.status === 'REPORTED')

export function reasonError(reason: string, max: number) {
  if (!reason.trim()) return 'Ghi lý do.'
  return tooLong(reason, max)
}

// ---------------------------------------------------------------- sửa thông tin thiết bị

// Chi tiết công trình (nguồn danh sách thiết bị của quản lý) không trả `specifications`; khi đó coi như đang trống
type AssetFacts = Pick<InstalledAssetView, 'manufacturer' | 'model' | 'serialNumber' | 'positionCode'> & {
  specifications?: string | null
}
export type AssetField = keyof typeof ASSET_FIELD_MAX
export type AssetDraft = Record<AssetField, string> & { reason: string }

export function assetDraftOf(asset: AssetFacts): AssetDraft {
  return {
    manufacturer: asset.manufacturer,
    model: asset.model,
    serialNumber: asset.serialNumber,
    positionCode: asset.positionCode ?? '',
    specifications: asset.specifications ?? '',
    reason: '',
  }
}

const ASSET_FIELDS = Object.keys(ASSET_FIELD_MAX) as AssetField[]
/** Bỏ trống thì backend giữ giá trị cũ, nên ba ô này không xoá được */
const REQUIRED_ASSET_FIELDS: AssetField[] = ['manufacturer', 'model', 'serialNumber']

/** Các ô đã đổi so với thiết bị đang xem (so sau khi bỏ khoảng trắng hai đầu) */
export function changedAssetFields(asset: AssetFacts, draft: AssetDraft) {
  return ASSET_FIELDS.filter((f) => draft[f].trim() !== (asset[f] ?? '').trim())
}

export function assetCorrectionErrors(asset: AssetFacts, draft: AssetDraft) {
  const errors: Partial<Record<AssetField | 'reason' | 'form', string>> = {}
  for (const f of ASSET_FIELDS) {
    if (REQUIRED_ASSET_FIELDS.includes(f) && !draft[f].trim()) errors[f] = 'Không để trống ô này.'
    else if (tooLong(draft[f], ASSET_FIELD_MAX[f])) errors[f] = tooLong(draft[f], ASSET_FIELD_MAX[f])
  }
  if (changedAssetFields(asset, draft).length === 0) errors.form = 'Chưa sửa ô nào.'
  const reason = reasonError(draft.reason, ASSET_REASON_MAX)
  if (reason) errors.reason = reason
  return errors
}

/**
 * Chỉ gửi ô đã đổi; ô không đổi để null (backend giữ nguyên). Vị trí, thông số xoá trắng thì gửi chuỗi rỗng: backend ghi
 * null cho hai ô này
 */
export function assetCorrectionBody(asset: AssetFacts, draft: AssetDraft): AssetCorrectionRequest {
  const changed = new Set(changedAssetFields(asset, draft))
  const value = (f: AssetField) => (changed.has(f) ? draft[f].trim() : null)
  return {
    manufacturer: value('manufacturer'),
    model: value('model'),
    serialNumber: value('serialNumber'),
    positionCode: value('positionCode'),
    specifications: value('specifications'),
    reason: draft.reason.trim(),
  }
}

// ---------------------------------------------------------------- hàng việc kinh doanh

type TaskFacts = Pick<SalesTaskView, 'status' | 'assignedSalesUserId'>

/** Giao (việc chưa ai nhận) hoặc giao lại (việc đã có người) khi việc còn mở */
export const canAssignTask = (t: Pick<SalesTaskView, 'status'>) =>
  t.status === 'OPEN' || t.status === 'CLAIMED' || t.status === 'IN_PROGRESS'

export const isReassignment = (t: TaskFacts) => t.assignedSalesUserId !== null

export function assignTaskErrors(t: TaskFacts, salesUserId: string, reason: string) {
  const errors: { salesUserId?: string; reason?: string } = {}
  if (!salesUserId) errors.salesUserId = 'Chọn nhân viên kinh doanh.'
  else if (salesUserId === t.assignedSalesUserId) errors.salesUserId = 'Người này đang giữ việc. Chọn người khác.'
  if (isReassignment(t) && !reason.trim()) errors.reason = 'Giao lại việc đã có người giữ phải ghi lý do.'
  else if (tooLong(reason, TASK_REASON_MAX)) errors.reason = tooLong(reason, TASK_REASON_MAX)
  return errors
}

/** Bộ lọc trạng thái gửi thẳng lên backend (query `status`); "Đang mở" lọc ở máy vì backend nhận một giá trị */
export const TASK_STATUS_FILTERS = ['open', 'OPEN', 'CLAIMED', 'IN_PROGRESS', 'DONE', 'CANCELLED', 'all'] as const
export type TaskStatusFilter = (typeof TASK_STATUS_FILTERS)[number]

export function taskStatusParam(filter: TaskStatusFilter) {
  return filter === 'open' || filter === 'all' ? undefined : filter
}

export function matchesTaskFilter(
  t: Pick<SalesTaskView, 'status' | 'taskType' | 'assignedSalesUserId'>,
  filter: { status: TaskStatusFilter; type: string; assignee: string },
) {
  if (filter.status === 'open' && !canAssignTask(t)) return false
  if (filter.type && t.taskType !== filter.type) return false
  // '' mọi người, 'none' chưa ai giữ, 'some' đã có người giữ, còn lại là mã một nhân viên kinh doanh
  if (filter.assignee === 'none') return t.assignedSalesUserId === null
  if (filter.assignee === 'some') return t.assignedSalesUserId !== null
  if (filter.assignee) return t.assignedSalesUserId === filter.assignee
  return true
}
