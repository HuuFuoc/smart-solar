import type {
  AfterSalesReasonRequest,
  CompletionDecisionRequest,
  CreateFaultRequest,
  OneTimeMaintenanceRequest,
  PurchaseRequest,
} from '@/types/req/customerAfterSalesReq'
import type {
  PackageView,
  PaymentAttemptView,
  PurchaseView,
  ServicePackageKind,
  ServiceEvidenceUrlView,
  ServiceRequestSummary,
  ServiceRequestView,
  SubscriptionView,
  WarrantyView,
} from '@/types/res/customerAfterSalesRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Gói dịch vụ sau lắp đặt của khách: gói đang bán, mua (luôn qua một link PayOS), gói đã mua, huỷ trước khi hiệu lực
// Mua không cấp quyền lợi gì cho tới khi PayOS xác nhận đã nhận tiền; trạng thái luôn đọc lại từ backend

/** GET .../packages?kind=: chỉ gói đang bán */
export function listPackages(kind: ServicePackageKind) {
  return get<PackageView[]>(ENDPOINTS.customerAfterSales.packages, { params: { kind } })
}

/**
 * POST .../purchases. Hợp đồng PAID thì `includeContract: false`; hợp đồng SIGNED (chưa thanh toán) thì phải
 * `includeContract: true` và link gồm cả tiền hợp đồng. Trả về link thanh toán và id các gói vừa tạo (AWAITING_PAYMENT)
 */
export function purchase(body: PurchaseRequest) {
  return post<PurchaseView>(ENDPOINTS.customerAfterSales.purchases, body)
}

/** GET .../subscriptions: mọi gói đã mua của khách, mọi loại */
export function listSubscriptions() {
  return get<SubscriptionView[]>(ENDPOINTS.customerAfterSales.subscriptions)
}

/**
 * POST .../subscriptions/{id}/cancel (bắt buộc lý do). Chưa thanh toán: huỷ ngay, link chung bị huỷ nên các gói khác
 * cùng link thành CHECKOUT_EXPIRED. Đã thanh toán: thành yêu cầu huỷ chờ quản lý duyệt. Gói đang hiệu lực: 409
 */
export function cancelSubscription(subscriptionId: string, body: AfterSalesReasonRequest) {
  return post<SubscriptionView>(ENDPOINTS.customerAfterSales.cancelSubscription(subscriptionId), body)
}

/** GET .../payments/{attemptId}: trạng thái một link thanh toán, backend tự đối soát với PayOS khi link còn mở */
export function getPayment(attemptId: string) {
  return get<PaymentAttemptView>(ENDPOINTS.customerAfterSales.payment(attemptId))
}

// Bảo hành, sửa chữa, bảo trì lẻ. Chỉ làm được trên công trình đã bàn giao; mọi thao tác ghi trả về yêu cầu mới nhất

const api = ENDPOINTS.customerAfterSales

/** Hạn bảo hành lắp đặt và thiết bị của công trình */
export function getWarranty(projectId: string) {
  return get<WarrantyView>(api.warranty(projectId))
}

/** Báo lỗi: mô tả ít nhất 5 ký tự, thiết bị nghi bị lỗi không bắt buộc */
export function createFault(body: CreateFaultRequest) {
  return post<ServiceRequestView>(api.faultRequests, body)
}

/** Bảo trì lẻ: giờ muốn hẹn phải cách hôm nay ít nhất số ngày backend cấu hình (mặc định 7) */
export function requestOneTimeMaintenance(body: OneTimeMaintenanceRequest) {
  return post<ServiceRequestView>(api.oneTimeMaintenance, body)
}

/** Mọi yêu cầu của khách, mọi công trình */
export function listRequests() {
  return get<ServiceRequestSummary[]>(api.requests)
}

export function getRequest(requestId: string) {
  return get<ServiceRequestView>(api.request(requestId))
}

/** Chưa trả tiền thì huỷ ngay; đã trả tiền thì thành yêu cầu huỷ chờ quản lý xét */
export function cancelRequest(requestId: string, body: AfterSalesReasonRequest) {
  return post<ServiceRequestView>(api.cancelRequest(requestId), body)
}

/** Nghiệm thu: đồng ý, hoặc không đồng ý kèm lý do (thành khiếu nại cho quản lý xét) */
export function decideCompletion(requestId: string, body: CompletionDecisionRequest) {
  return post<ServiceRequestView>(api.completion(requestId), body)
}

/** Đồng ý giờ hẹn quản lý đề xuất khi giờ đó khác giờ khách chọn */
export function confirmAppointment(requestId: string) {
  return post<ServiceRequestView>(api.confirmAppointment(requestId))
}

export function acceptQuotation(quotationId: string) {
  return post<ServiceRequestView>(api.acceptQuotation(quotationId))
}

export function rejectQuotation(quotationId: string, body: AfterSalesReasonRequest) {
  return post<ServiceRequestView>(api.rejectQuotation(quotationId), body)
}

/** Link xem ảnh của yêu cầu, ký sẵn và hết hạn sau vài phút */
export function getEvidenceUrl(requestId: string, evidenceId: string) {
  return get<ServiceEvidenceUrlView>(api.evidenceUrl(requestId, evidenceId), { params: { disposition: 'inline' } })
}

/** Tạo (hoặc lấy lại) link PayOS cho báo giá đã đồng ý. Đã trả tiền hay chưa phải hỏi lại bằng getPayment */
export function checkoutQuotation(quotationId: string) {
  return post<PaymentAttemptView>(api.checkoutQuotation(quotationId))
}
