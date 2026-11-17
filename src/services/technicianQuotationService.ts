import type {
  CartLineQuantityRequest,
  CartLineRequest,
  TechnicianCartCreateRequest,
} from '@/types/req/technicianQuotationsReq'
import type { QuotationView } from '@/types/res/quotationsRes'
import { del, get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Giỏ báo giá của kỹ thuật viên đã hoàn thành khảo sát tại công trình. Chỉ chọn sản phẩm danh mục và số lượng: đơn giá, thuế,
// tổng do backend tính theo giá danh mục, không có ô giá / giảm giá / thuế. Mỗi lệnh sửa gửi `revision` đang xem (lệch thì 409)

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
 * Gửi khách: backend định giá lại mọi dòng theo danh mục lúc gửi, tính thuế theo cài đặt, hạn hiệu lực và điều khoản mặc
 * định. Sản phẩm hết bán / chưa có giá thì 400 QUOTATION_PRICE_MISSING hoặc 409 QUOTATION_PRODUCT_UNAVAILABLE
 */
export function issueQuotation(quotationId: string, revision: number) {
  return post<QuotationView>(api.issue(quotationId), { revision })
}

/** Bản nháp mới trả lời khách (yêu cầu sửa, từ chối) hoặc sửa bản đang gửi; bản cũ chỉ bị thay khi gửi bản mới */
export function createRevision(quotationId: string) {
  return post<QuotationView>(api.revisions(quotationId))
}
