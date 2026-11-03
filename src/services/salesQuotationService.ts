import type {
  InstallationQuotationLineRequest,
  QuotationHeaderRequest,
  QuotationLineUpdateRequest,
} from '@/types/req/salesQuotationsReq'
import type { QuotationView } from '@/types/res/quotationsRes'
import { del, get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Báo giá lắp đặt phía kinh doanh. Chỉ sửa được bản nháp, mỗi lệnh sửa gửi `revision` đang xem (lệch thì 409)
// Backend tự tính mọi tổng tiền, FE không gửi tổng

const api = ENDPOINTS.salesQuotations

/** Mọi bản của một yêu cầu khảo sát (kể cả nháp và bản đã bị thay) */
export function listForSurveyRequest(surveyRequestId: string) {
  return get<QuotationView[]>(api.bySurveyRequest(surveyRequestId))
}

/** Một bản, kèm lịch sử thao tác */
export function getQuotation(quotationId: string) {
  return get<QuotationView>(api.byId(quotationId))
}

/** Lập bản nháp đầu tiên; cần khảo sát tại công trình đã hoàn thành */
export function createQuotation(surveyRequestId: string, body: QuotationHeaderRequest) {
  return post<QuotationView>(api.bySurveyRequest(surveyRequestId), body)
}

/** Ghi đè phần chi phí, hạn hiệu lực, điều khoản, ghi chú của bản nháp */
export function updateHeader(quotationId: string, body: QuotationHeaderRequest) {
  return put<QuotationView>(api.byId(quotationId), body)
}

/** Dòng chọn từ danh mục chỉ cần `productId` (bỏ trống đơn giá thì lấy giá danh mục); dòng tự ghi cần tên, đơn vị, đơn giá */
export function addLine(quotationId: string, body: InstallationQuotationLineRequest) {
  return post<QuotationView>(api.lines(quotationId), body)
}

export function updateLine(quotationId: string, lineId: string, body: QuotationLineUpdateRequest) {
  return put<QuotationView>(api.line(quotationId, lineId), body)
}

export function removeLine(quotationId: string, lineId: string, revision: number) {
  return del<QuotationView>(api.line(quotationId, lineId), { params: { revision } })
}

/** Gửi khách: cần ít nhất một dòng, tổng lớn hơn 0 và hạn hiệu lực còn ở tương lai. Đã gửi thì không sửa được */
export function issueQuotation(quotationId: string, revision: number) {
  return post<QuotationView>(api.issue(quotationId), { revision })
}

/** Bản nháp mới chép từ bản đã gửi hoặc bản khách yêu cầu sửa; bản cũ chỉ bị thay khi gửi bản mới */
export function createRevision(quotationId: string) {
  return post<QuotationView>(api.revisions(quotationId))
}
