import type { PricingApprovalDecisionRequest } from '@/types/req/managerQuotationApprovalsReq'
import type { QuotationView } from '@/types/res/quotationsRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Quản lý duyệt bộ giá có giảm giá / đơn giá dưới giá danh mục / giá 0 của bản nháp báo giá lắp đặt. Chỉ vai trò Manager;
// kinh doanh phụ trách báo giá không tự duyệt được. Xem một bản dùng GET /quotations/{id} của salesQuotationService

const api = ENDPOINTS.managerQuotationApprovals

/** Bản nháp có bộ giá hiện tại đang chờ quyết định, kèm lịch sử thao tác */
export function listPendingPricingApprovals() {
  return get<QuotationView[]>(api.pending)
}

/** Duyệt / không duyệt đúng bộ giá đang chờ; lý do bắt buộc cả hai trường hợp, gửi `revision` đang xem */
export function decidePricingApproval(quotationId: string, body: PricingApprovalDecisionRequest) {
  return post<QuotationView>(api.decide(quotationId), body)
}
