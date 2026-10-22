import type { QuotationView } from '@/types/res/quotationsRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Báo giá lắp đặt của khách: chỉ thấy bản đã gửi, đồng ý hoặc yêu cầu sửa

const api = ENDPOINTS.customerQuotations

/** Mọi bản đã gửi của mọi yêu cầu khảo sát của khách */
export function listMyQuotations() {
  return get<QuotationView[]>(api.base)
}

export function getMyQuotation(quotationId: string) {
  return get<QuotationView>(api.byId(quotationId))
}

/** Chỉ bản đang chờ trả lời và chưa hết hạn; đồng ý lại bản đã đồng ý vẫn trả 200 */
export function acceptQuotation(quotationId: string) {
  return post<QuotationView>(api.accept(quotationId))
}

/** Lý do bắt buộc, tối đa 2000 ký tự. Bản này giữ nguyên, kinh doanh gửi bản mới */
export function requestRevision(quotationId: string, reason: string) {
  return post<QuotationView>(api.revisionRequest(quotationId), { reason })
}
