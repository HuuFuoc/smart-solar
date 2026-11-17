import type { QuotationView } from '@/types/res/quotationsRes'
import { get } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Báo giá lắp đặt phía nhân viên văn phòng, chỉ đọc: kinh doanh xem yêu cầu mình phụ trách, quản lý / quản trị xem mọi yêu cầu.
// Kỹ thuật viên đã khảo sát lập và gửi báo giá (technicianQuotationService); lệnh ghi cũ của kinh doanh đã bị backend gỡ (410)

const api = ENDPOINTS.salesQuotations

/** Mọi bản của một yêu cầu khảo sát (kể cả nháp và bản đã bị thay) */
export function listForSurveyRequest(surveyRequestId: string) {
  return get<QuotationView[]>(api.bySurveyRequest(surveyRequestId))
}

/** Một bản, kèm lịch sử thao tác */
export function getQuotation(quotationId: string) {
  return get<QuotationView>(api.byId(quotationId))
}
