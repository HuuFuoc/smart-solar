import type { AfterSalesReasonRequest, PurchaseRequest } from '@/types/req/customerAfterSalesReq'
import type {
  PackageView,
  PaymentAttemptView,
  PurchaseView,
  ServicePackageKind,
  SubscriptionView,
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
