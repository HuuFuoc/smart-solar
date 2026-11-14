import type { QuotationView } from '@/types/res/quotationsRes'
import type { ContractView, SignatureSubmissionView } from '@/types/res/customerContractsRes'
import type { WarrantyOptionView } from '@/types/res/salesAfterSalesRes'
import type { PaymentAttemptView } from '@/types/res/customerAfterSalesRes'
import type { OfficialDocumentRequest } from '@/types/req/salesContractsReq'

// Luật hợp đồng lắp đặt phía nhân viên, bám ContractHandlers của backend (CreateAsync, UpdateTermsAsync, IssueAsync,
// AttachOfficialDocumentAsync, PublishAsync, ReviewAsync, CreateAmendmentAsync). Chỉ để bật / tắt nút và báo lỗi trước khi
// gửi; backend vẫn kiểm lại. Không import giá trị qua "@/" để chạy được bằng node --test

/** Điều khoản dài hơn bị backend cắt (Trim 8000) */
export const CONTRACT_TERMS_MAX = 8000
/** Cột rejection_reason */
export const REJECTION_REASON_MAX = 2000

/** Người xem trang hợp đồng phía nhân viên */
export type ContractViewer = 'sales' | 'manager' | 'admin'

/** Bản bị phụ lục thay (SUPERSEDED) hoặc bản nháp đã huỷ (DISCARDED, backend từ 31/10) không còn ràng buộc */
export const isLiveContract = (c: Pick<ContractView, 'status'>) => c.status !== 'SUPERSEDED' && c.status !== 'DISCARDED'

export const byVersionDesc = (a: ContractView, b: ContractView) => b.version - a.version

/** Bản đang làm việc của một yêu cầu: phiên bản còn hiệu lực mới nhất (phụ lục nháp nếu đang soạn) */
export function currentContract(list: ContractView[]): ContractView | null {
  return [...list].sort(byVersionDesc).find(isLiveContract) ?? null
}

/** Bản đang ràng buộc khách khi đang soạn phụ lục: bản đã phát hành mới nhất còn hiệu lực */
export function bindingContract(list: ContractView[]): ContractView | null {
  return [...list].sort(byVersionDesc).find((c) => isLiveContract(c) && c.status !== 'DRAFT') ?? null
}

/** Báo giá khách đã đồng ý của yêu cầu (mỗi yêu cầu nhiều nhất một bản) */
export function acceptedQuotation(quotations: QuotationView[]): QuotationView | null {
  return quotations.find((q) => q.status === 'ACCEPTED') ?? null
}

/**
 * Lập được hợp đồng từ báo giá: báo giá ACCEPTED và chưa có phiên bản nào khác SUPERSEDED từ báo giá đó
 * (backend: CONTRACT_QUOTATION_NOT_ACCEPTED, CONTRACT_ALREADY_EXISTS; từ 31/10 bản nháp đã huỷ cũng chặn)
 */
export function canCreateContract(quotation: QuotationView | null, contracts: ContractView[]) {
  if (!quotation || quotation.status !== 'ACCEPTED') return false
  return !contracts.some((c) => c.quotationId === quotation.quotationId && c.status !== 'SUPERSEDED')
}

export const canEditDraft = (c: Pick<ContractView, 'status'>) => c.status === 'DRAFT'

/** Chỉ huỷ được bản nháp đầu tiên của báo giá, không phải phụ lục nháp (backend: CONTRACT_NOT_DISCARDABLE) */
export const canDiscard = (c: Pick<ContractView, 'status' | 'previousContractId'>) =>
  c.status === 'DRAFT' && c.previousContractId === null

/** Lý do chưa phát hành được bản nháp (backend: CONTRACT_TERMS_REQUIRED, CONTRACT_WARRANTY_REQUIRED) */
export function issueBlockers(c: Pick<ContractView, 'status' | 'warrantyMonths' | 'terms'>): string[] {
  if (c.status !== 'DRAFT') return []
  const blockers: string[] = []
  if (!c.terms?.trim()) blockers.push('Chưa ghi điều khoản hợp đồng.')
  if (c.warrantyMonths == null) blockers.push('Chưa chọn thời hạn bảo hành lắp đặt.')
  return blockers
}

/** PDF chính thức gắn sau khi phát hành và trước khi gửi khách; gắn lại được (thay tệp) tới lúc gửi */
export const canAttachOfficialDocument = (c: Pick<ContractView, 'status' | 'canonicalHash'>) =>
  c.status === 'ISSUED' && Boolean(c.canonicalHash)

/** Gửi khách ký: đã phát hành và đã gắn PDF chính thức (backend: CONTRACT_DOCUMENT_MISSING) */
export const canPublish = (c: Pick<ContractView, 'status' | 'officialDocument'>) =>
  c.status === 'ISSUED' && c.officialDocument != null

/** Lần gửi bản ký đang chờ duyệt (mỗi lúc nhiều nhất một) */
export function pendingSubmission(c: Pick<ContractView, 'submissions'>): SignatureSubmissionView | null {
  return c.submissions?.find((s) => s.outcome === 'PENDING') ?? null
}

/** Kinh doanh phụ trách hoặc quản lý duyệt bản ký; quản trị không có quyền duyệt (controller chỉ cho Sales, Manager) */
export const canReview = (c: Pick<ContractView, 'status' | 'submissions'>, viewer: ContractViewer) =>
  viewer !== 'admin' && c.status === 'UNDER_REVIEW' && pendingSubmission(c) !== null

/** Bản ký khách gửi có đúng là bản in từ PDF chính thức hiện tại không (so SHA-256 do backend tính) */
export function submissionMatchesOfficial(
  submission: Pick<SignatureSubmissionView, 'officialDocumentSha256'>,
  c: Pick<ContractView, 'officialDocument'>,
) {
  const official = c.officialDocument?.sha256
  return Boolean(official) && submission.officialDocumentSha256.toLowerCase() === official!.toLowerCase()
}

/**
 * Lập phụ lục: bản đã phát hành, chưa thanh toán, chưa bị thay, và chưa có bản nháp nào khác của cùng báo giá
 * (backend: CONTRACT_INVALID_STATE, CONTRACT_ALREADY_EXISTS). `versions`: mọi phiên bản của yêu cầu
 */
export function canAmend(c: ContractView, versions: ContractView[]) {
  if (['DRAFT', 'PAID', 'SUPERSEDED', 'DISCARDED'].includes(c.status)) return false
  return !versions.some((v) => v.quotationId === c.quotationId && v.status === 'DRAFT')
}

/** Lý do vì sao không lập được phụ lục, để ghi cạnh chỗ đáng lẽ có nút */
export function amendBlocker(c: ContractView, versions: ContractView[]): string | null {
  if (c.status === 'PAID') return 'Hợp đồng đã thanh toán nên không sửa được nữa.'
  if (c.status === 'SUPERSEDED') return 'Phiên bản này đã bị phụ lục thay.'
  if (c.status === 'DRAFT' || c.status === 'DISCARDED') return null
  const draft = versions.find((v) => v.quotationId === c.quotationId && v.status === 'DRAFT')
  return draft ? `Đang có phụ lục nháp (phiên bản ${draft.version}); phát hành bản đó trước.` : null
}

/** Ô điều khoản */
export function termsError(text: string) {
  return text.trim().length > CONTRACT_TERMS_MAX ? `Điều khoản tối đa ${CONTRACT_TERMS_MAX} ký tự.` : null
}

/** Lý do từ chối bản ký (backend: CONTRACT_REJECTION_REASON_REQUIRED) */
export function rejectionReasonError(text: string) {
  if (!text.trim()) return 'Ghi lý do để khách biết cần ký lại thế nào.'
  if (text.trim().length > REJECTION_REASON_MAX) return `Lý do tối đa ${REJECTION_REASON_MAX} ký tự.`
  return null
}

/** Thời hạn bảo hành lắp đặt đang bật, ít tháng trước */
export function activeWarrantyOptions(options: WarrantyOptionView[]) {
  return options.filter((o) => o.isActive && o.kind === 'INSTALLATION').sort((a, b) => a.months - b.months)
}

export function defaultWarrantyOption(options: WarrantyOptionView[]) {
  return activeWarrantyOptions(options).find((o) => o.isDefault) ?? null
}

/**
 * Thời hạn gửi lên: chọn "mặc định" thì gửi null để backend tự lấy (lập mới: tuỳ chọn mặc định; phụ lục và sửa nháp: giữ
 * thời hạn đang có). Số đã chọn phải là tuỳ chọn đang bật (backend: CONTRACT_WARRANTY_VALIDATION_FAILED)
 */
export function warrantyMonthsToSend(choice: string, options: WarrantyOptionView[]): number | null | 'invalid' {
  if (choice === '') return null
  const months = Number(choice)
  return activeWarrantyOptions(options).some((o) => o.months === months) ? months : 'invalid'
}

/** Body gắn PDF chính thức: revision và canonicalHash của đúng phiên bản đang xem lúc mở hộp thoại, không tự tính */
export function officialDocumentBody(
  c: Pick<ContractView, 'revision' | 'canonicalHash'>,
  fileId: string,
): OfficialDocumentRequest | null {
  if (!c.canonicalHash) return null
  return { revision: c.revision, fileId, canonicalHash: c.canonicalHash }
}

/** "a1b2c3d4 e5f6…": phần đầu của mã nội dung để đối chiếu bằng mắt */
export function shortHash(hash: string | null | undefined, groups = 3) {
  if (!hash) return '—'
  const parts = hash.toLowerCase().match(/.{1,4}/g) ?? []
  return parts.length > groups ? `${parts.slice(0, groups).join(' ')}…` : parts.join(' ')
}

/** Lần thanh toán cần người xử lý tay: số tiền không khớp, hoặc trả lần hai cho hợp đồng đã thanh toán */
export function paymentsNeedingAttention(attempts: PaymentAttemptView[]) {
  return attempts.filter((a) => a.status === 'REVIEW_REQUIRED' || a.status === 'REFUND_REQUIRED')
}

/** Hợp đồng chờ khách trả tiền: hỏi lại trạng thái thanh toán định kỳ */
export const isAwaitingPayment = (c: Pick<ContractView, 'status'>) => c.status === 'SIGNED'

/** Có thể đã có lần thanh toán để xem (chỉ hợp đồng đã ký mới tạo được link) */
export const hasPaymentStage = (c: Pick<ContractView, 'status' | 'signedAt'>) =>
  c.status === 'SIGNED' || c.status === 'PAID' || (c.status === 'SUPERSEDED' && c.signedAt != null)
