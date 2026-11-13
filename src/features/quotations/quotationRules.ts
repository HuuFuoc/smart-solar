import type { PricingIssue, QuotationView } from '@/types/res/quotationsRes'

// Luật báo giá lắp đặt bám QuotationHandlers của backend (IssueAsync, CreateRevisionAsync, ConfirmSurveyVersionAsync,
// RequestPricingApprovalAsync, RejectAsync, AttachDocumentAsync). Chỉ để bật / tắt nút; backend vẫn kiểm lại.
// Không import giá trị qua "@/" để chạy được bằng node --test

/** Lý do xin duyệt giá, quyết định duyệt giá, xác nhận theo biên bản mới, ghi chú khi gửi bản tự động */
export const REVIEW_REASON_MAX = 1000

/** Gắn PDF báo giá: bản nháp thay tệp được; bản đã gửi khách chỉ gắn được khi chưa có tệp */
export function canAttachQuotationDocument(q: Pick<QuotationView, 'status' | 'documentFileId'>) {
  return q.status === 'DRAFT' || (q.status === 'ISSUED' && q.documentFileId === null)
}

/** Khách từ chối được bản đang chờ trả lời, kể cả bản đã hết hạn */
export const canRejectQuotation = (q: Pick<QuotationView, 'status'>) => q.status === 'ISSUED'

/**
 * Lập bản sửa: bản đã gửi, khách yêu cầu sửa, khách từ chối, hoặc bản khách đã đồng ý mà biên bản khảo sát đổi sau đó
 * (bản đó không lập hợp đồng được nữa; đã có hợp đồng thì backend trả QUOTATION_CANNOT_REVISE)
 */
export function canReviseQuotation(q: Pick<QuotationView, 'status' | 'surveyChanged'>) {
  return (
    q.status === 'ISSUED' ||
    q.status === 'REVISION_REQUESTED' ||
    q.status === 'REJECTED' ||
    (q.status === 'ACCEPTED' && q.surveyChanged)
  )
}

/** Bản nháp lập theo biên bản cũ phải được kinh doanh xác nhận theo biên bản mới trước khi gửi */
export const canConfirmSurveyVersion = (q: Pick<QuotationView, 'status' | 'surveyChanged'>) =>
  q.status === 'DRAFT' && q.surveyChanged

/** Xin duyệt khi bộ giá hiện tại chưa có yêu cầu, hoặc quản lý đã không duyệt */
export function canRequestPricingApproval(q: Pick<QuotationView, 'status' | 'pricingApproval'>) {
  const approval = q.pricingApproval?.status
  return q.status === 'DRAFT' && (approval === 'REQUIRED' || approval === 'REJECTED')
}

// Vấn đề về giá của bản tự động mà kinh doanh ghi lý do là gửi được; mã khác phải xử lý xong
const ACKNOWLEDGEABLE_ISSUES = [
  'PRODUCT_UNAVAILABLE',
  'WRONG_ITEM_KIND',
  'CURRENCY_NOT_SUPPORTED',
  'CONDITIONS_REQUIRE_REVIEW',
]

export const isBlockingIssue = (issue: Pick<PricingIssue, 'code'>) => !ACKNOWLEDGEABLE_ISSUES.includes(issue.code)

/** Lý do về biên bản khảo sát và giá làm bản nháp chưa gửi khách được; rỗng là không vướng */
export function pricingBlockers(q: Pick<QuotationView, 'surveyChanged' | 'pricingReview' | 'pricingApproval'>) {
  const reasons: string[] = []
  if (q.surveyChanged)
    reasons.push('Biên bản khảo sát đã được bổ sung: xem lại dòng hàng rồi xác nhận theo biên bản mới.')
  const blocking = q.pricingReview?.outstanding.filter(isBlockingIssue).length ?? 0
  if (blocking > 0) reasons.push(`Còn ${blocking} vấn đề về giá phải xử lý.`)
  const approval = q.pricingApproval?.status
  if (approval === 'REQUIRED') reasons.push('Có giá thấp hơn danh mục: xin quản lý duyệt giá.')
  if (approval === 'PENDING') reasons.push('Đang chờ quản lý duyệt giá.')
  if (approval === 'REJECTED') reasons.push('Quản lý không duyệt giá: sửa giá hoặc xin duyệt lại.')
  return reasons
}

/** Lý do bắt buộc của các lệnh xin duyệt, quyết định duyệt, xác nhận theo biên bản mới */
export function reviewReasonError(text: string) {
  if (!text.trim()) return 'Ghi lý do.'
  if (text.trim().length > REVIEW_REASON_MAX) return `Lý do tối đa ${REVIEW_REASON_MAX} ký tự.`
  return null
}

/**
 * "PV-550: biên bản 20, báo giá 18; INV-10K: biên bản 1, báo giá 0" từ `details.mismatches` của lỗi QUOTATION_BOM_MISMATCH;
 * null khi lỗi không kèm danh sách
 */
export function bomMismatchText(details: unknown) {
  const list = (details as { mismatches?: unknown } | null)?.mismatches
  if (!Array.isArray(list) || list.length === 0) return null
  return list
    .map((m: { sku?: string | null; surveyQuantity?: number; quotedQuantity?: number }) => {
      return `${m.sku || 'sản phẩm chưa có mã'}: biên bản ${m.surveyQuantity ?? 0}, báo giá ${m.quotedQuantity ?? 0}`
    })
    .join('; ')
}
