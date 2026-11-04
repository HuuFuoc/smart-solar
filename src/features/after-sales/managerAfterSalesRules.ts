import type {
  AssetCorrectionRequest,
  PackageCancellationDecisionRequest,
  RefundDecisionRequest,
  StopWorkRequest,
} from '@/types/req/managerAfterSalesReq'
import type {
  InstalledAssetView,
  ServiceRequestSummary,
  ServiceRequestView,
  SubscriptionView,
} from '@/types/res/customerAfterSalesRes'
import type { RefundView } from '@/types/res/managerAfterSalesRes'
import type { SalesTaskView } from '@/types/res/salesAfterSalesRes'

// Luật các quyết định của quản lý / quản trị sau bán: hỗ trợ gói thiên tai, đóng vì trùng, dừng việc, không thực hiện được,
// sửa thiết bị, giao việc kinh doanh, duyệt hoàn tiền, xét huỷ gói. Bám ServiceManagerHandlers, SalesTaskHandlers.AssignAsync,
// RefundHandlers.DecideAsync, ServicePackageHandlers.DecideCancellationAsync của backend `main` (7c79fa8). Chỉ để bật / tắt
// nút và báo lỗi trước khi gửi; backend vẫn kiểm lại. Không import giá trị qua "@/" để chạy được bằng node --test

/** Text.Trim của backend: lý do dài hơn bị cắt, nên chặn ở ô nhập */
export const CLAIM_REASON_MAX = 1000
export const DUPLICATE_REASON_MAX = 500
export const STOP_REASON_MAX = 1000
export const NOT_FULFILLED_REASON_MAX = 1000
export const ASSET_REASON_MAX = 500
export const TASK_REASON_MAX = 500
export const REFUND_NOTE_MAX = 1000
export const PACKAGE_NOTE_MAX = 500
export const ASSET_FIELD_MAX = {
  manufacturer: 100,
  model: 100,
  serialNumber: 100,
  positionCode: 50,
  specifications: 500,
} as const

const FINAL_STATUSES = ['COMPLETED', 'NOT_COMPLETED', 'CANCELLED', 'CLOSED_DUPLICATE']
const isFinal = (status: string) => FINAL_STATUSES.includes(status)

/**
 * Tiền VND nguyên người dùng gõ: số liền ("1500000") hoặc ngăn hàng nghìn bằng chấm, phẩy, khoảng trắng ("1.500.000").
 * "1,5" không phải số VND nguyên nên trả null thay vì hiểu thành 15
 */
export function parseVnd(text: string): number | null {
  const t = text.trim()
  if (!/^\d+$/.test(t) && !/^\d{1,3}([.,\s]\d{3})+$/.test(t)) return null
  const value = Number(t.replace(/[\s.,]/g, ''))
  return Number.isSafeInteger(value) ? value : null
}

function moneyError(text: string, max: number, maxText: string) {
  if (!text.trim()) return 'Nhập số tiền (0 nếu không hoàn).'
  const value = parseVnd(text)
  if (value === null) return 'Số tiền là số nguyên VND không âm.'
  if (value > max) return `Không vượt quá ${maxText}.`
  return undefined
}

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

// ---------------------------------------------------------------- đóng vì trùng

type Quoted = Pick<ServiceRequestView, 'quotations'>

export const hasPaidQuotation = (r: Quoted) => r.quotations.some((q) => q.status === 'PAID')

/** Tiền khách đã trả qua các báo giá đã thanh toán (đã trừ phần gói thiên tai hỗ trợ) */
export const paidAmount = (r: Quoted) =>
  r.quotations.filter((q) => q.status === 'PAID').reduce((sum, q) => sum + q.customerAmount, 0)

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

export type StopInput = { reason: string; refund: string }

export function stopErrors(input: StopInput, paid: number, paidText: string) {
  const errors: Partial<Record<keyof StopInput, string>> = {}
  if (!input.reason.trim()) errors.reason = 'Ghi lý do dừng việc.'
  else if (tooLong(input.reason, STOP_REASON_MAX)) errors.reason = tooLong(input.reason, STOP_REASON_MAX)
  const money = moneyError(input.refund, paid, paidText)
  if (money) errors.refund = money
  return errors
}

export function stopBody(input: StopInput): StopWorkRequest {
  return { reason: input.reason.trim(), refundAmount: parseVnd(input.refund) ?? 0 }
}

// ---------------------------------------------------------------- không thực hiện được

/**
 * Chỉ bảo trì lẻ còn mở mà chưa làm (ConfirmCannotFulfillAsync): Smart Solar không bố trí được người hoặc khách không nhận
 * giờ khác. Yêu cầu bị huỷ và backend duyệt hoàn 100 % tiền khách đã trả (quản trị chuyển tiền rồi ghi nhận)
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

// ---------------------------------------------------------------- hoàn tiền

export const canDecideRefund = (r: Pick<RefundView, 'status'>) => r.status === 'PENDING_APPROVAL'

export type RefundDecisionInput = { approve: boolean; amount: string; note: string }

export function refundDecisionErrors(
  refund: Pick<RefundView, 'originalAmount'>,
  input: RefundDecisionInput,
  maxText: string,
) {
  const errors: { amount?: string; note?: string } = {}
  if (input.approve) {
    const money = moneyError(input.amount, refund.originalAmount, maxText)
    if (money) errors.amount = money
  }
  const long = tooLong(input.note, REFUND_NOTE_MAX)
  if (long) errors.note = long
  return errors
}

/** Duyệt chưa phải đã trả tiền: chỉ ghi số được hoàn, quản trị chuyển tiền rồi ghi nhận */
export function refundDecisionBody(input: RefundDecisionInput): RefundDecisionRequest {
  return {
    approve: input.approve,
    approvedAmount: input.approve ? parseVnd(input.amount) : null,
    note: input.note.trim() || null,
  }
}

// ---------------------------------------------------------------- huỷ gói đã trả tiền

/** Chỉ gói khách đã xin huỷ (đã trả tiền, chưa bắt đầu kỳ) */
export const canDecidePackageCancellation = (s: Pick<SubscriptionView, 'status'>) =>
  s.status === 'CANCELLATION_REQUESTED'

export function packageRefundError(price: number, text: string, priceText: string) {
  return moneyError(text, price, priceText)
}

/** Backend chỉ lưu ghi chú khi từ chối (Text.Trim 500); duyệt thì lý do của khoản hoàn là lý do khách xin huỷ */
export const PACKAGE_CANCELLATION_NOTE_MAX = 500

export type PackageCancellationInput = { approve: boolean; amount: string; note: string }

export function packageCancellationErrors(price: number, input: PackageCancellationInput, priceText: string) {
  const errors: { amount?: string; note?: string } = {}
  if (input.approve) {
    const money = packageRefundError(price, input.amount, priceText)
    if (money) errors.amount = money
  } else {
    const long = tooLong(input.note, PACKAGE_CANCELLATION_NOTE_MAX)
    if (long) errors.note = long
  }
  return errors
}

/** Duyệt: gói bị huỷ và backend tạo khoản hoàn "đã duyệt" với đúng số này (chưa chuyển tiền). Từ chối: gói về PAID */
export function packageCancellationBody(input: PackageCancellationInput): PackageCancellationDecisionRequest {
  return input.approve
    ? { approve: true, refundAmount: parseVnd(input.amount), note: null }
    : { approve: false, refundAmount: null, note: input.note.trim() || null }
}

// ---------------------------------------------------------------- lý do của khoản hoàn (câu tiếng Anh của backend)

const PAYMENT_PROBLEMS: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^The package order no longer exists\.$/, () => 'đơn gói không còn'],
  [/^The package order belongs to another checkout\.$/, () => 'đơn gói đã gắn với lần thanh toán khác'],
  [/^The package order is (\w+)\.$/, (m) => `đơn gói đang ở trạng thái ${m[1]}`],
  [/^The payment was made after the checkout expired\.$/, () => 'khách trả sau khi link thanh toán hết hạn'],
  [/^The quotation no longer exists\.$/, () => 'báo giá không còn'],
  [/^The quotation belongs to another checkout\.$/, () => 'báo giá đã gắn với lần thanh toán khác'],
  [/^The quotation is (\w+)\.$/, (m) => `báo giá đang ở trạng thái ${m[1]}`],
  [/^The payment was made after the quotation expired\.$/, () => 'khách trả sau khi báo giá hết hạn'],
  [/^Unknown payment line\.$/, () => 'không rõ khoản thanh toán'],
]

/** Dịch lý do backend tự ghi cho khoản hoàn; phần lý do do người gõ giữ nguyên */
export function refundReasonText(reason: string) {
  const paid = /^Payment received but not applied: (.*)$/s.exec(reason)
  if (paid) {
    const detail = paid[1]!
    for (const [pattern, text] of PAYMENT_PROBLEMS) {
      const m = pattern.exec(detail)
      if (m) return `Đã nhận tiền nhưng không áp dụng được: ${text(m)}.`
    }
    return `Đã nhận tiền nhưng không áp dụng được: ${detail}`
  }
  const prefixes: [string, string][] = [
    ['Package cancelled before activation: ', 'Khách huỷ gói trước khi bắt đầu kỳ: '],
    ['Work stopped: ', 'Dừng việc: '],
    ['Cancelled before work started: ', 'Huỷ trước khi bắt đầu làm: '],
    ['SmartSolar could not provide the service: ', 'Smart Solar không thực hiện được: '],
  ]
  for (const [en, vi] of prefixes) if (reason.startsWith(en)) return vi + reason.slice(en.length)
  if (reason === 'Installation cancelled before handover') return 'Công trình bị huỷ trước khi bàn giao.'
  return reason
}
