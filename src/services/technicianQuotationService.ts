import type { OnSiteDecision } from '@/common/quotation'
import type {
  CartLineQuantityRequest,
  CartLineRequest,
  OnSiteDecisionRequest,
  QuotationPaymentRequest,
  TechnicianCartCreateRequest,
} from '@/types/req/technicianQuotationsReq'
import type { QuotationPaymentView, QuotationView } from '@/types/res/quotationsRes'
import { del, get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Báo giá lắp đặt của kỹ thuật viên đã hoàn thành khảo sát tại công trình. Giỏ chỉ chọn sản phẩm danh mục và số lượng: đơn giá,
// thuế, tổng do backend tính theo giá danh mục, không có ô giá / giảm giá / thuế. Chốt giá rồi trình bày trên máy kỹ thuật viên,
// ghi khách đồng ý / không / muốn sửa, mở thanh toán QR PayOS hoặc tiền mặt; tiền được xác minh thì backend tự lập hợp đồng.
// Mỗi lệnh sửa gửi `revision` đang xem (lệch thì 409)

const api = ENDPOINTS.technicianQuotations

/** Mọi bản của yêu cầu mình đã khảo sát (kể cả bản nháp, bản đã bị thay, báo giá cũ của kinh doanh) */
export function listForSurveyRequest(surveyRequestId: string) {
  return get<QuotationView[]>(api.bySurveyRequest(surveyRequestId))
}

/** Một bản, kèm lịch sử thao tác */
export function getQuotation(quotationId: string) {
  return get<QuotationView>(api.byId(quotationId))
}

/**
 * Tạo giỏ nháp (201), hoặc trả lại giỏ nháp đang có của mình. Cần khảo sát đã hoàn thành và lắp được; đã có bản gửi khách
 * thì phải lập bản sửa từ bản đó (409 QUOTATION_ACTIVE_EXISTS)
 */
export function createCart(surveyRequestId: string, body: TechnicianCartCreateRequest = {}) {
  return post<QuotationView>(api.create(surveyRequestId), body)
}

/** Thêm sản phẩm danh mục; thêm lại sản phẩm đã có trong giỏ thì cộng số lượng */
export function addLine(quotationId: string, body: CartLineRequest) {
  return post<QuotationView>(api.lines(quotationId), body)
}

/** Đổi số lượng một dòng (đơn giá đọc lại từ danh mục) */
export function updateLine(quotationId: string, lineId: string, body: CartLineQuantityRequest) {
  return put<QuotationView>(api.line(quotationId, lineId), body)
}

export function removeLine(quotationId: string, lineId: string, revision: number) {
  return del<QuotationView>(api.line(quotationId, lineId), { params: { revision } })
}

/**
 * Chốt giá để trình bày tại công trình (không gửi gì vào ứng dụng của khách): backend định giá lại mọi dòng theo danh mục, tính
 * thuế theo cài đặt, hạn hiệu lực và điều khoản mặc định. Sản phẩm hết bán / chưa có giá thì 400 QUOTATION_PRICE_MISSING hoặc
 * 409 QUOTATION_PRODUCT_UNAVAILABLE
 */
export function issueQuotation(quotationId: string, revision: number) {
  return post<QuotationView>(api.issue(quotationId), { revision })
}

/** Bản nháp mới khi khách muốn sửa / không đồng ý, hoặc sửa bản đã chốt; bản cũ chỉ bị thay khi chốt bản mới */
export function createRevision(quotationId: string) {
  return post<QuotationView>(api.revisions(quotationId))
}

/**
 * Ghi điều khách quyết định tại công trình, bằng tài khoản kỹ thuật viên. AGREED: bản đã chốt, còn hạn, biên bản chưa đổi →
 * ACCEPTED. DECLINED / REVISION_NEEDED (ghi chú bắt buộc): đóng bản đã chốt, hoặc rút đồng ý khi chưa mở thanh toán (đã mở thì
 * 409 QUOTATION_PAYMENT_STARTED)
 */
export function recordOnSiteDecision(
  quotationId: string,
  decision: OnSiteDecision,
  revision: number,
  note: string | null,
) {
  const body: OnSiteDecisionRequest = { decision, revision, note }
  return post<QuotationView>(api.onSiteDecision(quotationId), body)
}

/**
 * Mở thanh toán của báo giá khách đã đồng ý: ONLINE trả mã QR / link PayOS để hiện trên máy kỹ thuật viên, CASH ghi khách trả
 * tiền mặt (quản lý / quản trị xác nhận). Gọi lại cùng cách trả thì nhận lại lần đang mở; đổi cách trả thì huỷ trước
 */
export function startPayment(quotationId: string, method: QuotationPaymentRequest['method']) {
  return post<QuotationPaymentView>(api.payment(quotationId), { method })
}

/** Trạng thái thanh toán; link đang mở được backend hỏi thẳng PayOS (trang PayOS chuyển về không phải bằng chứng đã trả) */
export function getPayment(quotationId: string) {
  return get<QuotationPaymentView>(api.payment(quotationId))
}

/** Huỷ lần đang mở (đổi cách trả, hoặc khách dừng). PayOS đã báo nhận tiền thì 409 PAYMENT_ALREADY_PAID */
export function cancelPayment(quotationId: string) {
  return post<QuotationPaymentView>(api.paymentCancel(quotationId))
}
