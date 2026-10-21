import type { IssueQuotationRequest } from '@/types/req/salesAfterSalesReq'
import type { ServiceRequestView } from '@/types/res/customerAfterSalesRes'
import type { SalesTaskView, WarrantyOptionView } from '@/types/res/salesAfterSalesRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Hàng đợi sau bán hàng của kinh doanh: nhận việc báo giá rồi lập báo giá cho yêu cầu đó

const api = ENDPOINTS.salesAfterSales

/** Thời hạn bảo hành sửa chữa đang dùng (kind=REPAIR) */
export function listRepairWarrantyOptions() {
  return get<WarrantyOptionView[]>(api.warrantyOptions, { params: { kind: 'REPAIR' } })
}

/** Việc chưa ai nhận */
export function listOpenTasks() {
  return get<SalesTaskView[]>(api.openTasks)
}

/** Việc bạn đã nhận, kể cả đã xong */
export function listMyTasks() {
  return get<SalesTaskView[]>(api.myTasks)
}

export function claimTask(taskId: string) {
  return post<SalesTaskView>(api.claimTask(taskId))
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
