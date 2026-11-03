import type { FollowUpRequest, IssueQuotationRequest } from '@/types/req/salesAfterSalesReq'
import type { ServiceRequestView } from '@/types/res/customerAfterSalesRes'
import type { SalesTaskView, WarrantyOptionView } from '@/types/res/salesAfterSalesRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Hàng đợi sau bán hàng của kinh doanh: nhận việc rồi lập báo giá cho yêu cầu đó, hoặc gọi nhắc khách và ghi lại kết quả

const api = ENDPOINTS.salesAfterSales

/**
 * Thời hạn bảo hành đang dùng mà kinh doanh được chọn (chỉ trả tuỳ chọn đang bật): REPAIR cho báo giá sửa chữa,
 * INSTALLATION cho hợp đồng lắp đặt
 */
export function listWarrantyOptions(kind: 'REPAIR' | 'INSTALLATION') {
  return get<WarrantyOptionView[]>(api.warrantyOptions, { params: { kind } })
}

/** Việc chưa ai nhận */
export function listOpenTasks() {
  return get<SalesTaskView[]>(api.openTasks)
}

/** Việc bạn đã nhận còn mở */
export function listMyTasks() {
  return get<SalesTaskView[]>(api.myTasks)
}

export function claimTask(taskId: string) {
  return post<SalesTaskView>(api.claimTask(taskId))
}

/** Việc mình đã nhận (CLAIMED) thành đang làm (IN_PROGRESS) */
export function startTask(taskId: string) {
  return post<SalesTaskView>(api.startTask(taskId))
}

/**
 * Ghi một lần liên hệ khách của việc nhắc (đặt lịch bảo trì, nghiệm thu). Có `outcome` khác WILL_BOOK_LATER thì việc đóng;
 * UNREACHABLE của việc nhắc bảo trì làm lượt bảo trì thành chưa thực hiện (không bị trừ)
 */
export function recordFollowUp(taskId: string, body: FollowUpRequest) {
  return post<SalesTaskView>(api.followUp(taskId), body)
}

/** Chi tiết yêu cầu như quản lý thấy (có lịch sử) */
export function getRequest(requestId: string) {
  return get<ServiceRequestView>(api.request(requestId))
}

/**
 * Lập báo giá (hoặc bản mới thay bản đang chờ khách). Báo lỗi: mỗi hạng mục khách trả tiền đúng một dòng có itemId;
 * bảo trì lẻ: các dòng tự ghi, không itemId. Tiền là số nguyên VND, mỗi dòng phải lớn hơn 0
 */
export function issueQuotation(requestId: string, body: IssueQuotationRequest) {
  return post<ServiceRequestView>(api.quotations(requestId), body)
}
