import type { Tone } from '@/components/common/ui/badge'
import type { CashReceiptView, InstallmentPaymentView, StaffCashReceiptView } from '@/types/res/paymentPlanRes'

// Luật phiếu thu tiền mặt của kỹ thuật viên (backend 147c66e + f176ef9, Modules.Payments.PaymentService, InstallmentPaymentHandlers).
// Gửi phiếu thu không phải đã trả: khoản vẫn DUE tới khi quản lý / quản trị xác nhận. Chỉ để bật / tắt nút và báo trước khi gửi,
// backend vẫn kiểm lại. Không import giá trị qua "@/" để chạy được bằng node --test

const MB = 1024 * 1024

export const RECEIPT_NUMBER_MAX = 100
export const RECEIPT_NOTE_MAX = 500
export const REVIEW_REASON_MAX = 500
export const REVIEW_NOTE_MAX = 500
export const EVIDENCE_MAX_BYTES = 15 * MB
/** Máy của kỹ thuật viên lệch giờ: backend nhận giờ thu muộn hơn giờ hiện tại tối đa 5 phút */
export const COLLECTED_AT_SKEW_MS = 5 * 60_000

/** Hỏi lại khoản khi phiếu thu đang chờ quản lý (handoff: 10–20 giây) */
export const RECEIPT_SUBMITTED_POLL_MS = 15_000
/** Hỏi lại hàng chờ và chi tiết phiếu thu khi quản lý đang mở trang */
export const RECEIPT_QUEUE_POLL_MS = 30_000
/** Hỏi lại khi bị giới hạn số lần (429) mà backend không gửi Retry-After */
export const RATE_LIMIT_BACKOFF_MS = 60_000

/** Loại tệp backend nhận cho PAYMENT_EVIDENCE, kèm đuôi tên hợp lệ */
export const EVIDENCE_TYPES: Record<string, readonly string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
}

export const CASH_RECEIPT_STATUSES: Record<string, { label: string; tone: Tone }> = {
  SUBMITTED: { label: 'Chờ quản lý xác nhận', tone: 'warn' },
  ACCEPTED: { label: 'Đã xác nhận', tone: 'ok' },
  REJECTED: { label: 'Yêu cầu bổ sung', tone: 'danger' },
  WITHDRAWN: { label: 'Đã đóng', tone: 'neutral' },
}

/** Bộ lọc hàng chờ của quản lý; ALL là không gửi `status` */
export const RECEIPT_QUEUE_FILTERS = [
  { value: 'SUBMITTED', label: 'Chờ xác nhận' },
  { value: 'ACCEPTED', label: 'Đã xác nhận' },
  { value: 'REJECTED', label: 'Yêu cầu bổ sung' },
  { value: 'ALL', label: 'Tất cả' },
] as const

export type ReceiptQueueFilter = (typeof RECEIPT_QUEUE_FILTERS)[number]['value']

export const readQueueFilter = (raw: string | null | undefined): ReceiptQueueFilter =>
  RECEIPT_QUEUE_FILTERS.find((f) => f.value === raw)?.value ?? 'SUBMITTED'

export const receiptStatusMeta = (status: string | null | undefined) =>
  (status ? CASH_RECEIPT_STATUSES[status] : undefined) ?? { label: status ?? '—', tone: 'neutral' as Tone }

// ---------- Khoản thanh toán của kỹ thuật viên ----------

type PaymentView = Pick<InstallmentPaymentView, 'paymentState' | 'current' | 'currentCashReceipt' | 'cashReceipts'>

/**
 * Máy chủ đã có phiếu thu: đọc của kỹ thuật viên / nhân viên luôn trả `cashReceipts` là mảng (rỗng khi chưa gửi). Thiếu trường
 * (undefined) là bản cũ, null là đường của khách: không hiện gì về phiếu thu
 */
export const receiptsSupported = (view: Pick<InstallmentPaymentView, 'cashReceipts'> | null | undefined) =>
  Array.isArray(view?.cashReceipts)

/** Phiếu thu của lần thanh toán đang mở (bỏ phiếu của lần khác nếu có) */
export function currentReceipt(view: PaymentView | null | undefined): CashReceiptView | null {
  const receipt = view?.currentCashReceipt ?? null
  if (!receipt) return null
  const attemptId = view?.current?.paymentAttemptId
  return attemptId && receipt.paymentAttemptId !== attemptId ? null : receipt
}

/** Phiếu thu đang chờ quản lý: ẩn "Bỏ chọn tiền mặt" và "Xác nhận đã thu" (backend trả 409 PAYMENT_CASH_RECEIPT_UNDER_REVIEW) */
export const cashReceiptUnderReview = (view: PaymentView | null | undefined) =>
  view?.paymentState === 'AWAITING_CASH_CONFIRMATION' && currentReceipt(view)?.status === 'SUBMITTED'

/** Khoản đã trả bằng phiếu thu kỹ thuật viên gửi và quản lý đã xác nhận */
export function acceptedReceipt(view: PaymentView | null | undefined) {
  const receipt = currentReceipt(view)
  return view?.paymentState === 'PAID' && receipt?.status === 'ACCEPTED' ? receipt : null
}

/**
 * Bước của kỹ thuật viên trên khoản đang chờ tiền mặt:
 * - unsupported: máy chủ chưa có phiếu thu (giữ câu cũ "chờ quản lý xác nhận");
 * - capture: chưa gửi (hoặc chỉ còn phiếu WITHDRAWN): nút "Chụp phiếu thu";
 * - submitted: đã gửi, chờ quản lý; rejected: quản lý yêu cầu bổ sung, gửi lại được; accepted: đã xác nhận;
 * - none: khoản không ở bước tiền mặt
 */
export type TechnicianReceiptStep = 'unsupported' | 'capture' | 'submitted' | 'rejected' | 'accepted' | 'none'

export function technicianReceiptStep(view: PaymentView | null | undefined): TechnicianReceiptStep {
  if (!view) return 'none'
  if (view.paymentState === 'PAID') return acceptedReceipt(view) ? 'accepted' : 'none'
  if (view.paymentState !== 'AWAITING_CASH_CONFIRMATION' || !view.current) return 'none'
  if (!receiptsSupported(view)) return 'unsupported'
  const receipt = currentReceipt(view)
  if (receipt?.status === 'SUBMITTED') return 'submitted'
  if (receipt?.status === 'REJECTED') return 'rejected'
  if (receipt?.status === 'ACCEPTED') return 'accepted'
  return 'capture'
}

/** Gửi (lại) phiếu thu được: chưa có phiếu đang chờ, chưa trả */
export const canSubmitReceipt = (view: PaymentView | null | undefined) => {
  const step = technicianReceiptStep(view)
  return step === 'capture' || step === 'rejected'
}

/**
 * Khối phiếu thu trong khối thanh toán một khoản. Khách không bao giờ thấy phiếu thu, ảnh hay lịch sử xét duyệt (backend trả null,
 * web cũng không vẽ dù có dữ liệu). Kỹ thuật viên thấy khi đang chờ tiền mặt trên máy chủ đã có phiếu thu; nhân viên thấy khi có
 * phiếu đã gửi
 */
export function receiptPanelFor(
  actor: 'technician' | 'customer' | 'staff',
  view: PaymentView | null | undefined,
): 'technician' | 'staff' | null {
  if (actor === 'customer' || !view || !receiptsSupported(view)) return null
  if (view.paymentState !== 'AWAITING_CASH_CONFIRMATION') return null
  if (actor === 'technician') return view.current ? 'technician' : null
  return currentReceipt(view) ? 'staff' : null
}

/** Lịch sử để hiện: mọi phiếu đã gửi, mới nhất trước */
export const receiptHistory = (view: Pick<InstallmentPaymentView, 'cashReceipts'> | null | undefined) =>
  [...(view?.cashReceipts ?? [])].sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))

/**
 * Báo một lần khi phiếu đang xem đổi trạng thái trong phiên (không báo lần đọc đầu, không báo lại mỗi lần hỏi). `previous` là
 * khoá `${id}:${status}` của lần trước
 */
export function receiptTransition(
  previous: string | null,
  receipt: Pick<CashReceiptView, 'cashReceiptId' | 'status'> | null,
): 'rejected' | 'accepted' | null {
  if (!previous || !receipt) return null
  const [id, status] = previous.split(':')
  if (id !== receipt.cashReceiptId || status !== 'SUBMITTED') return null
  if (receipt.status === 'REJECTED') return 'rejected'
  if (receipt.status === 'ACCEPTED') return 'accepted'
  return null
}

export const receiptKey = (receipt: Pick<CashReceiptView, 'cashReceiptId' | 'status'> | null) =>
  receipt ? `${receipt.cashReceiptId}:${receipt.status}` : null

// ---------- Ảnh phiếu thu ----------

const extensionOf = (name: string) => {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot).toLowerCase()
}

/** Loại của tệp theo loại trình duyệt báo, không có thì theo đuôi tên; null là loại không nhận */
export function evidenceType(file: Pick<File, 'name' | 'type'>) {
  const type = file.type.toLowerCase()
  if (type in EVIDENCE_TYPES) return type
  if (type && type !== 'application/octet-stream') return null
  const extension = extensionOf(file.name)
  return Object.keys(EVIDENCE_TYPES).find((t) => EVIDENCE_TYPES[t]!.includes(extension)) ?? null
}

export const evidenceKind = (file: Pick<File, 'name' | 'type'>) =>
  evidenceType(file) === 'application/pdf' ? ('pdf' as const) : ('image' as const)

/** Lỗi thấy ngay trên máy trước khi tải lên; backend còn kiểm loại theo nội dung tệp */
export function evidenceProblem(file: Pick<File, 'name' | 'type' | 'size'>) {
  if (!evidenceType(file)) return 'Chỉ nhận ảnh JPEG, PNG, WebP hoặc tệp PDF.'
  if (file.size === 0) return 'Tệp rỗng. Chụp hoặc chọn lại.'
  if (file.size > EVIDENCE_MAX_BYTES) return 'Tệp lớn hơn 15 MB. Chụp lại hoặc chọn tệp nhỏ hơn.'
  return null
}

/** `accept` của ô chọn tệp: ghi cả đuôi để điện thoại đổi ảnh HEIC sang JPEG */
export const EVIDENCE_ACCEPT = [...Object.keys(EVIDENCE_TYPES), ...Object.values(EVIDENCE_TYPES).flat()].join(',')

// ---------- Form gửi phiếu thu ----------

export type ReceiptForm = {
  receiptNumber: string
  note: string
  /** YYYY-MM-DD giờ Việt Nam; rỗng là "lúc gửi" */
  collectedDate: string
  /** HH:mm; rỗng là "lúc gửi" */
  collectedTime: string
  hasEvidence: boolean
}

export type ReceiptField = 'receiptNumber' | 'evidence' | 'collectedAt' | 'note'
export type ReceiptErrors = Partial<Record<ReceiptField, string>>

const VN_OFFSET = '+07:00'

/** Giờ thu dạng ISO giờ Việt Nam để gửi; null khi bỏ trống (backend lấy giờ gửi). Có giờ mà không có ngày thì là hôm nay */
export function collectedAtValue(form: Pick<ReceiptForm, 'collectedDate' | 'collectedTime'>, today: string) {
  if (!form.collectedTime) return null
  return `${form.collectedDate || today}T${form.collectedTime}:00${VN_OFFSET}`
}

/**
 * Lỗi của form trước khi tải ảnh: số phiếu 1–100 ký tự (đã bỏ khoảng trắng hai đầu), ghi chú ≤ 500, có ảnh, giờ thu không sau
 * giờ hiện tại quá 5 phút và không trước lúc chọn tiền mặt (`cashChosenAt`: `current.createdAt` của khoản)
 */
export function receiptFormErrors(
  form: ReceiptForm,
  { now, today, cashChosenAt }: { now: number; today: string; cashChosenAt: string | null | undefined },
): ReceiptErrors {
  const errors: ReceiptErrors = {}
  const number = form.receiptNumber.trim()
  if (!number) errors.receiptNumber = 'Ghi số in trên phiếu thu.'
  else if (number.length > RECEIPT_NUMBER_MAX) errors.receiptNumber = `Số phiếu thu tối đa ${RECEIPT_NUMBER_MAX} ký tự.`
  if (!form.hasEvidence) errors.evidence = 'Chụp hoặc chọn ảnh phiếu thu.'
  if (form.note.trim().length > RECEIPT_NOTE_MAX) errors.note = `Ghi chú tối đa ${RECEIPT_NOTE_MAX} ký tự.`
  if (form.collectedDate && !form.collectedTime) errors.collectedAt = 'Chọn giờ thu tiền, hoặc bỏ trống cả ngày.'
  const value = collectedAtValue(form, today)
  if (value) {
    const at = Date.parse(value)
    if (!Number.isFinite(at)) errors.collectedAt = 'Thời điểm thu tiền chưa hợp lệ.'
    else if (at > now + COLLECTED_AT_SKEW_MS) errors.collectedAt = 'Thời điểm thu tiền không được sau giờ hiện tại.'
    else if (cashChosenAt && at < Date.parse(cashChosenAt) - 60_000)
      errors.collectedAt = 'Thời điểm thu tiền không được trước lúc chọn trả tiền mặt.'
  }
  return errors
}

// ---------- Lỗi khi gửi / xét duyệt ----------

type ErrorLike = {
  status?: number
  code?: string | null
  fieldErrors?: Record<string, string>
  retryAfter?: number | null
}

const asError = (error: unknown): ErrorLike => (typeof error === 'object' && error !== null ? (error as ErrorLike) : {})

/** Tệp đã đăng ký mà không dùng được nữa: lần gửi sau tải lại đúng tệp đã chọn */
const REUPLOAD_CODES = new Set([
  'FILE_NOT_FOUND',
  'FILE_NOT_VERIFIED',
  'FILE_WRONG_PURPOSE',
  'FILE_OBJECT_MISSING',
  'FILE_CONTENT_CHANGED',
])

/** Trạng thái thanh toán đã đổi: tải lại, đóng hộp gửi */
const RELOAD_CLOSE_CODES = new Set([
  'PAYMENT_CASH_RECEIPT_ALREADY_SUBMITTED',
  'PAYMENT_CASH_NOT_SELECTED',
  'PAYMENT_ALREADY_PAID',
  'CONTRACT_INSTALLMENT_ALREADY_PAID',
  'PAYMENT_CASH_RECEIPT_CONTEXT_MISMATCH',
  'CONTRACT_INSTALLMENT_NOT_PAYABLE',
  'PAYMENT_ATTEMPT_NOT_FOUND',
])

const UNAVAILABLE_CODES = new Set(['SCHEMA_NOT_READY', 'FEATURE_PENDING_MIGRATION'])

const RECEIPT_FIELDS: Record<string, ReceiptField> = {
  receiptNumber: 'receiptNumber',
  evidenceFileId: 'evidence',
  collectedAt: 'collectedAt',
  note: 'note',
}

export type SubmitFailure =
  /** Lỗi từng ô (VALIDATION_FAILED, số phiếu trùng) */
  | { action: 'fields'; fields: ReceiptErrors }
  /** Ảnh không dùng được cho phiếu này (dùng cho lần thanh toán khác, của tài khoản khác): bỏ ảnh, chụp ảnh khác */
  | { action: 'replace-evidence' }
  /** Tệp đã đăng ký hỏng / mất: giữ ảnh đã chọn, lần gửi sau tải lại */
  | { action: 'reupload' }
  /** Lần trả tiền mặt đã đổi: tải lại khoản, bỏ mã lần thanh toán cũ, giữ ảnh đã tải */
  | { action: 'reload-retry' }
  /** Khoản đã đổi trạng thái (đã có phiếu chờ, đã trả, đã bỏ chọn tiền mặt): tải lại, đóng hộp */
  | { action: 'reload-close' }
  /** Mất mạng, quá giờ, lỗi hệ thống: chưa biết đã gửi được chưa, tải lại khoản trước khi gửi lại */
  | { action: 'ambiguous' }
  | { action: 'rate-limited'; seconds: number }
  | { action: 'unavailable' }
  /** Số tiền khác lúc gửi: chặn, báo liên hệ hỗ trợ */
  | { action: 'support' }
  | { action: 'forbidden' }
  /** Không còn là kỹ thuật viên của hợp đồng / khoản không còn */
  | { action: 'gone' }
  | { action: 'message' }

export function submitFailure(error: unknown): SubmitFailure {
  const e = asError(error)
  const code = e.code ?? null
  const status = e.status ?? 0
  if (status === 429) return { action: 'rate-limited', seconds: e.retryAfter ?? 60 }
  if (code && UNAVAILABLE_CODES.has(code)) return { action: 'unavailable' }
  if (code === 'VALIDATION_FAILED') {
    const fields: ReceiptErrors = {}
    for (const [key, message] of Object.entries(e.fieldErrors ?? {})) {
      const field = RECEIPT_FIELDS[key]
      if (field && !fields[field]) fields[field] = message
    }
    // paymentAttemptId sai: lần thanh toán trên màn đã cũ
    if (e.fieldErrors?.paymentAttemptId && Object.keys(fields).length === 0) return { action: 'reload-retry' }
    return { action: 'fields', fields }
  }
  if (code === 'PAYMENT_CASH_RECEIPT_DUPLICATE')
    return { action: 'fields', fields: { receiptNumber: 'Số phiếu thu này đã dùng cho một lần thanh toán khác.' } }
  if (code === 'PAYMENT_CASH_RECEIPT_EVIDENCE_REUSED' || code === 'FILE_NOT_OWNED')
    return { action: 'replace-evidence' }
  if (code && REUPLOAD_CODES.has(code)) return { action: 'reupload' }
  if (code === 'PAYMENT_CASH_RECEIPT_ATTEMPT_MISMATCH') return { action: 'reload-retry' }
  if (code && RELOAD_CLOSE_CODES.has(code)) return { action: 'reload-close' }
  if (code === 'PAYMENT_CASH_AMOUNT_MISMATCH') return { action: 'support' }
  if (status === 403) return { action: 'forbidden' }
  if (status === 404) return { action: 'gone' }
  if (status === 0 || status === 408 || status >= 500) return { action: 'ambiguous' }
  return { action: 'message' }
}

export type ReviewFailure =
  | { action: 'fields'; fields: { reason?: string; note?: string } }
  /** Phiếu vừa đổi (revision cũ): tải lại, quản lý xem lại rồi quyết định lại */
  | { action: 'stale' }
  /** Phiếu / lần thanh toán đã xong theo cách khác: tải lại */
  | { action: 'reload' }
  /** Ảnh của kỹ thuật viên không còn hợp lệ: chỉ còn yêu cầu bổ sung */
  | { action: 'evidence-invalid' }
  | { action: 'ambiguous' }
  | { action: 'rate-limited'; seconds: number }
  | { action: 'unavailable' }
  | { action: 'support' }
  | { action: 'forbidden' }
  | { action: 'message' }

const REVIEW_RELOAD_CODES = new Set([
  'PAYMENT_CASH_RECEIPT_NOT_REVIEWABLE',
  'PAYMENT_CASH_RECEIPT_NOT_FOUND',
  'PAYMENT_ALREADY_PAID',
  'CONTRACT_INSTALLMENT_ALREADY_PAID',
  'PAYMENT_CASH_NOT_SELECTED',
  'PAYMENT_ATTEMPT_NOT_FOUND',
  'PAYMENT_CASH_ITEM_NOT_PAYABLE',
])

export function reviewFailure(error: unknown): ReviewFailure {
  const e = asError(error)
  const code = e.code ?? null
  const status = e.status ?? 0
  if (status === 429) return { action: 'rate-limited', seconds: e.retryAfter ?? 60 }
  if (code && UNAVAILABLE_CODES.has(code)) return { action: 'unavailable' }
  if (code === 'PAYMENT_CASH_RECEIPT_STALE') return { action: 'stale' }
  if (code === 'VALIDATION_FAILED') {
    const fields: { reason?: string; note?: string } = {}
    if (e.fieldErrors?.reason) fields.reason = e.fieldErrors.reason
    if (e.fieldErrors?.note) fields.note = e.fieldErrors.note
    if (e.fieldErrors?.revision) return { action: 'stale' }
    return { action: 'fields', fields }
  }
  if (code && REVIEW_RELOAD_CODES.has(code)) return { action: 'reload' }
  if (code?.startsWith('FILE_')) return { action: 'evidence-invalid' }
  if (code === 'PAYMENT_CASH_AMOUNT_MISMATCH') return { action: 'support' }
  if (status === 403) return { action: 'forbidden' }
  if (status === 404) return { action: 'reload' }
  if (status === 0 || status === 408 || status >= 500) return { action: 'ambiguous' }
  return { action: 'message' }
}

export const reasonError = (reason: string) => {
  const text = reason.trim()
  if (!text) return 'Ghi điều kỹ thuật viên cần bổ sung.'
  return text.length > REVIEW_REASON_MAX ? `Lý do tối đa ${REVIEW_REASON_MAX} ký tự.` : null
}

export const reviewNoteError = (note: string) =>
  note.trim().length > REVIEW_NOTE_MAX ? `Ghi chú tối đa ${REVIEW_NOTE_MAX} ký tự.` : null

/** Xác nhận / yêu cầu bổ sung được: phiếu còn chờ và lần thanh toán chưa trả */
export const canReview = (row: Pick<StaffCashReceiptView, 'receipt' | 'paymentStatus'> | null | undefined) =>
  row?.receipt.status === 'SUBMITTED' && row.paymentStatus !== 'PAID'

// ---------- Hàng chờ của quản lý ----------

/** Nhãn ngữ cảnh của một dòng: đợt của hợp đồng 30/70 hoặc báo giá hậu mãi */
export function receiptContextLabel(
  row: Pick<
    StaffCashReceiptView,
    'context' | 'installmentSequence' | 'installmentKind' | 'serviceRequestNumber' | 'quotationVersion'
  >,
) {
  if (row.context === 'AFTER_SALES_QUOTATION') {
    const version = row.quotationVersion ? `, báo giá lần ${row.quotationVersion}` : ''
    return `Hậu mãi ${row.serviceRequestNumber ?? ''}${version}`.trim()
  }
  if (row.context === 'INSTALLATION_BALANCE' || row.installmentKind === 'BALANCE' || row.installmentSequence === 2)
    return 'Đợt 2 (70%)'
  return 'Đợt 1 (30%)'
}

/** Phiếu mới vào hàng chờ trong phiên (lần đọc đầu `seen` null thì không báo) */
export function newArrivals(seen: ReadonlySet<string> | null, ids: readonly string[]) {
  if (!seen) return []
  return ids.filter((id) => !seen.has(id))
}

/**
 * Nhịp hỏi lại: `base` khi bình thường; bị giới hạn số lần thì chờ theo Retry-After (ít nhất 60 giây) để không dồn thêm lệnh;
 * `false` là không hỏi
 */
export function pollWithBackoff(base: number | false, error: unknown) {
  if (base === false) return false
  const e = asError(error)
  if (e.status !== 429) return base
  return Math.max(base, (e.retryAfter ?? 0) * 1000, RATE_LIMIT_BACKOFF_MS)
}

/** Nhịp hỏi lại khoản của kỹ thuật viên khi phiếu thu đang chờ; null để luật cũ quyết định */
export function receiptPollMs(view: PaymentView | null | undefined): number | false | null {
  if (!view || !receiptsSupported(view) || view.paymentState !== 'AWAITING_CASH_CONFIRMATION') return null
  const status = currentReceipt(view)?.status
  if (status === 'SUBMITTED') return RECEIPT_SUBMITTED_POLL_MS
  // Đã bị yêu cầu bổ sung: việc tiếp theo là của kỹ thuật viên, chỉ tải lại khi quay lại tab / có mạng lại
  if (status === 'REJECTED') return false
  return null
}

/**
 * Thử lại có kiểm soát cho các lần đọc: 429, mất mạng và lỗi hệ thống tối đa 2 lần; 4xx khác và "hệ thống đang cập nhật" thì
 * không (thử lại vẫn vậy)
 */
export function retryReceiptRead(failureCount: number, error: unknown) {
  const e = asError(error)
  if (e.code && UNAVAILABLE_CODES.has(e.code)) return false
  const status = e.status ?? 0
  return (status === 429 || status === 0 || status >= 500) && failureCount < 2
}

/** Chờ trước lần thử lại: theo Retry-After khi có, không thì tăng dần (2, 4… giây, tối đa 30) */
export function retryDelayMs(attempt: number, error: unknown) {
  const after = asError(error).retryAfter
  return after ? after * 1000 : Math.min(30_000, 2_000 * 2 ** attempt)
}
