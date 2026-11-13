import type { PriceAdjustment, PricingIssue, QuotationView } from '@/types/res/quotationsRes'
import { PRICING_ISSUES, QUOTATION_LIMITS } from '../../common/quotation.ts'

// Luật báo giá lắp đặt bám QuotationHandlers (AttachDocumentAsync, IssueAsync, RequestPricingApprovalAsync,
// DecidePricingApprovalAsync, ConfirmSurveyVersionAsync) của backend `main`. Chỉ để bật / tắt nút và báo trước khi gửi; backend
// vẫn kiểm lại. Không import giá trị qua "@/" để chạy được bằng node --test

/** Gắn PDF báo giá: bản nháp thay tệp được; bản đã gửi khách chỉ gắn được khi chưa có tệp */
export function canAttachQuotationDocument(q: Pick<QuotationView, 'status' | 'documentFileId'>) {
  return q.status === 'DRAFT' || (q.status === 'ISSUED' && q.documentFileId === null)
}

type ApprovalPart = Pick<QuotationView, 'status' | 'pricingApproval'>

/** Thiếu trường (backend cũ, hoặc khách xem) là không cần duyệt */
export const pricingApprovalStatus = (q: Pick<QuotationView, 'pricingApproval'>) =>
  q.pricingApproval?.status ?? 'NOT_REQUIRED'

export const priceAdjustments = (q: Pick<QuotationView, 'pricingApproval'>): PriceAdjustment[] =>
  q.pricingApproval?.adjustments ?? []

/** Giảm giá, đơn giá dưới giá danh mục hoặc giá 0 mà quản lý chưa duyệt đúng bộ giá này thì backend không cho gửi khách */
export function approvalBlocksIssue(q: ApprovalPart) {
  const status = pricingApprovalStatus(q)
  return q.status === 'DRAFT' && status !== 'NOT_REQUIRED' && status !== 'APPROVED'
}

/** Xin duyệt được khi bộ giá hiện tại chưa xin, hoặc lần trước bị từ chối (xin lại với lý do mới) */
export function canRequestPricingApproval(q: ApprovalPart) {
  const status = pricingApprovalStatus(q)
  return q.status === 'DRAFT' && (status === 'REQUIRED' || status === 'REJECTED')
}

/** Quản lý chỉ quyết định khi đúng bộ giá hiện tại đang chờ */
export const canDecidePricingApproval = (q: ApprovalPart) =>
  q.status === 'DRAFT' && pricingApprovalStatus(q) === 'PENDING'

/** Lý do bắt buộc, tối đa 1000 ký tự (xin duyệt, duyệt / không duyệt, xác nhận theo biên bản mới) */
export function approvalReasonError(reason: string) {
  const text = reason.trim()
  if (!text) return 'Nhập lý do.'
  if (text.length > QUOTATION_LIMITS.approvalReasonLength)
    return `Lý do tối đa ${QUOTATION_LIMITS.approvalReasonLength} ký tự.`
  return undefined
}

/** Tổng số tiền giảm so với giá danh mục và giảm giá phần đầu; null khi backend không trả số */
export function totalReduction(adjustments: PriceAdjustment[]) {
  if (adjustments.length === 0) return null
  let total = 0
  for (const a of adjustments) {
    if (a.amount == null) {
      if (a.kind === 'ZERO_PRICE') continue
      return null
    }
    total += a.amount
  }
  return total
}

export const isAcknowledgeable = (issue: Pick<PricingIssue, 'code'>) =>
  PRICING_ISSUES[issue.code]?.acknowledgeable === true

/** Vấn đề giá của bản nháp tự lập mà phải sửa xong mới gửi được (thiếu giá, thiếu tấm pin / inverter / nhân công, tổng sai) */
export const blockingPricingIssues = (q: Pick<QuotationView, 'pricingReview'>) =>
  (q.pricingReview?.outstanding ?? []).filter((i) => !isAcknowledgeable(i))

/** Còn vấn đề chấp nhận được: gửi khách phải kèm ghi chú */
export const reviewNoteRequired = (q: Pick<QuotationView, 'pricingReview'>) => q.pricingReview?.noteRequired === true

export function reviewNoteError(note: string, required: boolean) {
  const text = note.trim()
  if (required && !text) return 'Ghi lý do chấp nhận các điểm còn lưu ý trước khi gửi.'
  if (text.length > QUOTATION_LIMITS.reviewNoteLength)
    return `Ghi chú tối đa ${QUOTATION_LIMITS.reviewNoteLength} ký tự.`
  return undefined
}

/** Lập bản sửa: bản đã gửi, khách yêu cầu sửa hoặc từ chối; bản khách đã đồng ý chỉ khi biên bản khảo sát đổi sau đó */
export function canReviseQuotation(q: Pick<QuotationView, 'status' | 'surveyChanged'>) {
  if (q.status === 'ISSUED' || q.status === 'REVISION_REQUESTED' || q.status === 'REJECTED') return true
  return q.status === 'ACCEPTED' && q.surveyChanged === true
}

/** Biên bản khảo sát đã bổ sung sau khi lập bản nháp: phải xác nhận lại (hoặc sửa dòng) mới gửi được */
export const surveyChangedDraft = (q: Pick<QuotationView, 'status' | 'surveyChanged'>) =>
  q.status === 'DRAFT' && q.surveyChanged === true

/** Một dòng chênh lệch giữa dòng thiết bị và bảng vật tư của biên bản (chi tiết lỗi QUOTATION_BOM_MISMATCH) */
export type BomMismatch = { productId: string; sku: string | null; surveyQuantity: number; quotedQuantity: number }

export function bomMismatchesOf(details: unknown): BomMismatch[] {
  if (typeof details !== 'object' || details === null) return []
  const list = (details as { mismatches?: unknown }).mismatches
  if (!Array.isArray(list)) return []
  return list.filter(
    (m): m is BomMismatch =>
      typeof m === 'object' &&
      m !== null &&
      typeof (m as BomMismatch).surveyQuantity === 'number' &&
      typeof (m as BomMismatch).quotedQuantity === 'number',
  )
}
