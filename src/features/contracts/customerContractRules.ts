import type { SignedDocumentRequest } from '@/types/req/customerContractsReq'
import type { PaymentAttemptView } from '@/types/res/customerAfterSalesRes'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { ContractPaymentView } from '@/types/res/staffPaymentsRes'

// Luật hợp đồng lắp đặt phía khách, bám ContractHandlers.SubmitSignedDocumentAsync và PaymentService (CreateOrGetAttemptAsync,
// GetForCustomerAsync, CancelCurrentAsync) của backend `main` (7c79fa8). Chỉ để bật / tắt nút và báo trước khi gửi;
// backend vẫn kiểm lại. Không import giá trị qua "@/" để chạy được bằng node --test

/** Khách thấy hợp đồng từ lúc chờ ký trở đi (ContractStatuses.CustomerVisible) */
export const CUSTOMER_VISIBLE_STATUSES: readonly string[] = [
  'AWAITING_SIGNATURE',
  'UNDER_REVIEW',
  'SIGNATURE_REJECTED',
  'SIGNED',
  'PAID',
  'SUPERSEDED',
]

/** Việc của khách: ký (hoặc ký lại) và thanh toán */
export const CUSTOMER_TODO_CONTRACT_STATUSES: readonly string[] = ['AWAITING_SIGNATURE', 'SIGNATURE_REJECTED', 'SIGNED']

export const isCustomerTodo = (c: Pick<ContractView, 'status'>) => CUSTOMER_TODO_CONTRACT_STATUSES.includes(c.status)

// ---------- Ký ----------

/** Gửi bản ký được: đang chờ ký hoặc bản trước bị từ chối, và PDF chính thức đã có SHA-256 do backend tính */
export const canSubmitSigned = (c: Pick<ContractView, 'status' | 'officialDocument'>) =>
  (c.status === 'AWAITING_SIGNATURE' || c.status === 'SIGNATURE_REJECTED') && Boolean(c.officialDocument?.sha256)

/**
 * Bản chính thức khách xác nhận đã ký, chụp lúc mở hộp thoại ký. Gửi đúng SHA-256 này, không lấy SHA-256 của bản tải lại
 * sau đó: hợp đồng đổi phiên bản trong lúc khách ký thì backend từ chối và khách phải ký lại đúng bản mới
 */
export type SigningSnapshot = {
  contractId: string
  contractNumber: string
  version: number
  officialSha256: string
  canonicalHash: string | null
}

export function signingSnapshot(
  c: Pick<ContractView, 'contractId' | 'contractNumber' | 'version' | 'status' | 'officialDocument' | 'canonicalHash'>,
): SigningSnapshot | null {
  if (!canSubmitSigned(c)) return null
  return {
    contractId: c.contractId,
    contractNumber: c.contractNumber,
    version: c.version,
    officialSha256: c.officialDocument!.sha256!,
    canonicalHash: c.canonicalHash,
  }
}

export const sameHash = (a: string | null | undefined, b: string | null | undefined) =>
  Boolean(a) && Boolean(b) && a!.trim().toLowerCase() === b!.trim().toLowerCase()

/** PDF chính thức của hợp đồng (sau khi tải lại) còn đúng bản khách đã xác nhận không */
export const snapshotStillCurrent = (
  snapshot: SigningSnapshot,
  c: Pick<ContractView, 'contractId' | 'status' | 'officialDocument'>,
) =>
  c.contractId === snapshot.contractId &&
  canSubmitSigned(c) &&
  sameHash(c.officialDocument?.sha256, snapshot.officialSha256)

export const signedDocumentBody = (snapshot: SigningSnapshot, fileId: string): SignedDocumentRequest => ({
  fileId,
  officialDocumentSha256: snapshot.officialSha256,
})

/**
 * Lỗi bắt khách xem lại bản chính thức rồi ký lại; không bao giờ tự gửi lại với SHA-256 mới. FILE_CONTENT_CHANGED: tệp trên
 * kho đã đổi sau khi xác minh, không biết là bản chính thức hay bản ký nên làm lại cả hai bước
 */
export const RESIGN_ERROR_CODES: readonly string[] = [
  'CONTRACT_WRONG_DOCUMENT_VERSION',
  'CONTRACT_INVALID_STATE',
  'CONTRACT_NOT_FOUND',
  'FILE_CONTENT_CHANGED',
]

/** Lỗi của chính tệp bản ký (đổi, mất, đã gửi rồi, không phải của khách): chọn và tải tệp lại */
export const REUPLOAD_ERROR_CODES: readonly string[] = [
  'FILE_CONTENT_CHANGED',
  'FILE_ALREADY_LINKED',
  'FILE_NOT_FOUND',
  'FILE_NOT_VERIFIED',
  'FILE_WRONG_PURPOSE',
  'FILE_NOT_OWNED',
]

/** Lần gửi bản ký bị từ chối gần nhất, để khách đọc lý do trước khi ký lại */
export function lastRejection(c: Pick<ContractView, 'submissions' | 'rejectionReason'>) {
  const rejected = (c.submissions ?? []).filter((s) => s.outcome === 'REJECTED')
  return rejected.at(-1) ?? null
}

// ---------- Thanh toán ----------

/** PaymentStatuses.Payable: backend chỉ đối soát với PayOS khi link ở hai trạng thái này */
export const PAYABLE_STATUSES: readonly string[] = ['PENDING', 'PROCESSING']

export const isPayableStatus = (status: string | null | undefined) =>
  Boolean(status) && PAYABLE_STATUSES.includes(status!)

/** Backend giới hạn 30 lần xem trạng thái mỗi phút; 5 giây một lần là 12 lần */
export const PAYMENT_POLL_MS = 5_000

/** Chỉ hợp đồng đã duyệt bản ký mới thanh toán được, một lần 100 % */
export const canPay = (c: Pick<ContractView, 'status'>) => c.status === 'SIGNED'

/** Link còn trả tiền được của hợp đồng (kể cả link mua gói kèm hợp đồng) */
export function liveAttempt(view: Pick<ContractPaymentView, 'current'> | null | undefined): PaymentAttemptView | null {
  const current = view?.current
  return current && isPayableStatus(current.status) ? current : null
}

/**
 * Link mua gói kèm hợp đồng: tổng lớn hơn tiền hợp đồng (PaymentService.CreateCheckoutAsync thêm dòng gói vào cùng link).
 * Link riêng của hợp đồng luôn đúng bằng tổng hợp đồng
 */
export const isCombinedCheckout = (
  attempt: Pick<PaymentAttemptView, 'amount'>,
  view: Pick<ContractPaymentView, 'amount'>,
) => attempt.amount > view.amount

/** Hỏi lại trạng thái khi hợp đồng chờ thanh toán và đang có link còn chờ */
export const shouldPollPayment = (view: Pick<ContractPaymentView, 'contractStatus' | 'current'> | null | undefined) =>
  view?.contractStatus === 'SIGNED' && liveAttempt(view) !== null

/** Tạo link: hợp đồng đã ký, trạng thái thanh toán đã tải và chưa có link còn chờ (backend vẫn trả lại link cũ nếu có) */
export const canCreatePayment = (view: ContractPaymentView | null | undefined) =>
  view != null && view.contractStatus === 'SIGNED' && liveAttempt(view) === null

/** Huỷ ở đây chỉ cho link riêng của hợp đồng; link mua gói kèm hợp đồng thì huỷ đơn gói để gói không bị treo */
export function canCancelPayment(view: ContractPaymentView | null | undefined) {
  const live = liveAttempt(view)
  return live !== null && !isCombinedCheckout(live, view!)
}

/** Lần thanh toán đã nhận tiền nhưng cần Smart Solar xử lý tay: số tiền lệch hoặc trả hai lần */
export const attemptsNeedingStaff = <T extends Pick<PaymentAttemptView, 'status'>>(attempts: T[]) =>
  attempts.filter((a) => a.status === 'REVIEW_REQUIRED' || a.status === 'REFUND_REQUIRED')

/** Giây còn lại tới hạn link theo giờ máy. Chỉ để hiện: hết giờ thì hỏi lại hệ thống, không tự coi là đã huỷ */
export function secondsLeft(expiresAt: string, now: number) {
  const at = Date.parse(expiresAt)
  return Number.isNaN(at) ? 0 : Math.max(0, Math.floor((at - now) / 1000))
}

/** "14:05" hoặc "1:02:05" */
export function formatCountdown(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

// ---------- Danh sách ----------

/** Bản mới hơn thay bản này (cùng số hợp đồng, phiên bản lớn hơn) */
export function newerVersion(c: Pick<ContractView, 'contractNumber' | 'version'>, list: ContractView[]) {
  return (
    list
      .filter((x) => x.contractNumber === c.contractNumber && x.version > c.version)
      .sort((a, b) => b.version - a.version)[0] ?? null
  )
}

/** Mỗi số hợp đồng một dòng: phiên bản mới nhất khách thấy. Việc của khách lên đầu */
export function latestPerContract(list: ContractView[]) {
  const latest = new Map<string, ContractView>()
  for (const c of list) {
    const seen = latest.get(c.contractNumber)
    if (!seen || c.version > seen.version) latest.set(c.contractNumber, c)
  }
  const rank = (c: ContractView) => (isCustomerTodo(c) ? 0 : c.status === 'UNDER_REVIEW' ? 1 : 2)
  return [...latest.values()].sort(
    (a, b) => rank(a) - rank(b) || (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''),
  )
}
