import type { PricingApprovalDecisionRequest } from '@/types/req/managerQuotationApprovalsReq'
import type { QuotationView } from '@/types/res/quotationsRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Quản lý duyệt bộ giá thấp hơn danh mục của báo giá lắp đặt (quản trị không có quyền này). Người lập báo giá không tự duyệt

const api = ENDPOINTS.managerQuotations

/** Bản nháp đang chờ duyệt đúng bộ giá hiện tại */
export function listPricingApprovals() {
  return get<QuotationView[]>(api.pricingApprovals)
}

/** Duyệt hoặc không duyệt; lý do bắt buộc, tối đa 1000 ký tự. `revision` của bản đang xem, lệch thì 409 */
export function decidePricingApproval(quotationId: string, body: PricingApprovalDecisionRequest) {
  return post<QuotationView>(api.pricingApproval(quotationId), body)
}
