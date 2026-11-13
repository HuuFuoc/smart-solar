import type { QuotationView } from '@/types/res/quotationsRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Báo giá lắp đặt của khách: chỉ thấy bản đã gửi; đồng ý, yêu cầu sửa hoặc từ chối

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

/** Từ chối bản đang chờ trả lời; lý do không bắt buộc, tối đa 2000 ký tự. Không đổi lại được, yêu cầu khảo sát vẫn mở */
export function rejectQuotation(quotationId: string, reason: string | null) {
  return post<QuotationView>(api.reject(quotationId), { reason })
}

/** Lý do bắt buộc, tối đa 2000 ký tự. Bản này giữ nguyên, kinh doanh gửi bản mới */
export function requestRevision(quotationId: string, reason: string) {
  return post<QuotationView>(api.revisionRequest(quotationId), { reason })
}
