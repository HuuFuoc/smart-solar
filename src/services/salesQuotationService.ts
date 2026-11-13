import type {
  ConfirmSurveyVersionRequest,
  FileReferenceRequest,
  InstallationIssueQuotationRequest,
  InstallationQuotationLineRequest,
  PricingApprovalRequest,
  QuotationHeaderRequest,
  QuotationLineUpdateRequest,
} from '@/types/req/salesQuotationsReq'
import type { AutomaticQuotationResult, QuotationView } from '@/types/res/quotationsRes'
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

/**
 * Gửi khách: cần ít nhất một dòng, tổng lớn hơn 0, hạn hiệu lực còn ở tương lai, dòng thiết bị khớp biên bản khảo sát và giá
 * thấp hơn danh mục đã được quản lý duyệt. `reviewNote`: lý do vẫn gửi khi bản tự động còn vấn đề về giá chấp nhận được.
 * Đã gửi thì không sửa được
 */
export function issueQuotation(quotationId: string, body: InstallationIssueQuotationRequest) {
  return post<QuotationView>(api.issue(quotationId), body)
}

/**
 * Chạy lại bước tạo báo giá tự động từ danh sách thiết bị của biên bản khảo sát (bình thường backend đã chạy khi kỹ thuật
 * viên hoàn thành khảo sát). Gọi lại nhiều lần vẫn ra cùng kết quả
 */
export function generateQuotation(surveyRequestId: string) {
  return post<AutomaticQuotationResult>(api.generate(surveyRequestId))
}

/** Báo giá của mình cần xem lại: bản nháp tự động còn vấn đề về giá và bản có biên bản khảo sát đổi sau khi lập, cũ trước */
export function listPendingReview() {
  return get<QuotationView[]>(api.pendingReview)
}

/** Bản nháp lập theo biên bản cũ: sau khi xem lại dòng hàng, ghi nhận theo biên bản hiện tại. Lý do bắt buộc, tối đa 1000 ký tự */
export function confirmSurveyVersion(quotationId: string, body: ConfirmSurveyVersionRequest) {
  return post<QuotationView>(api.confirmSurveyVersion(quotationId), body)
}

/** Xin quản lý duyệt đúng bộ giá đang có (giảm giá, đơn giá thấp hơn danh mục, giá 0). Sửa giá sau đó thì phải xin lại */
export function requestPricingApproval(quotationId: string, body: PricingApprovalRequest) {
  return post<QuotationView>(api.pricingApprovalRequest(quotationId), body)
}

/** Bản nháp mới chép từ bản đã gửi hoặc bản khách yêu cầu sửa; bản cũ chỉ bị thay khi gửi bản mới */
export function createRevision(quotationId: string) {
  return post<QuotationView>(api.revisions(quotationId))
}

/**
 * Gắn PDF báo giá (tệp QUOTATION_DOCUMENT đã xác minh do chính người này tải). Bản nháp thay tệp được; bản đã gửi khách chỉ
 * gắn được khi chưa có tệp. Không có `revision`
 */
export function attachDocument(quotationId: string, body: FileReferenceRequest) {
  return put<QuotationView>(api.document(quotationId), body)
}
