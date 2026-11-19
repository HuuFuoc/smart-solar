import type { InstallmentPaymentRequest } from '@/types/req/paymentPlanReq'
import type { InstallmentPaymentView } from '@/types/res/paymentPlanRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Thanh toán từng khoản của hợp đồng 30/70 (1 = 30%, 2 = 70%). Kỹ thuật viên đã khảo sát mở / huỷ tại công trình, khách mở / huỷ
// trong ứng dụng, nhân viên khác chỉ đọc. Mở lại cùng cách trả thì nhận lại lần đang mở. Tiền mặt chỉ là lựa chọn: quản lý /
// quản trị xác nhận ở bàn thu tiền; chỉ PayOS xác minh hoặc quản lý xác nhận mới thành PAID

const api = ENDPOINTS.installments

/** Ai đang thao tác: quyết định đường dẫn (backend tách theo vai trò, sai người thì 404) */
export type InstallmentActor = 'technician' | 'customer' | 'staff'

export type InstallmentTarget = { contractId: string; sequence: number }

function paymentPath(actor: InstallmentActor, { contractId, sequence }: InstallmentTarget) {
  if (actor === 'technician') return api.technician(contractId, sequence)
  if (actor === 'customer') return api.customer(contractId, sequence)
  return api.staff(contractId, sequence)
}

/** Trạng thái thanh toán của một khoản; link PayOS đang mở được backend đối soát khi đọc */
export function getInstallmentPayment(actor: InstallmentActor, target: InstallmentTarget) {
  return get<InstallmentPaymentView>(paymentPath(actor, target))
}

/** Mở thanh toán (ONLINE trả mã QR / link, CASH ghi lựa chọn tiền mặt). Nhân viên không mở được */
export function startInstallmentPayment(
  actor: Exclude<InstallmentActor, 'staff'>,
  target: InstallmentTarget,
  method: InstallmentPaymentRequest['method'],
) {
  const body: InstallmentPaymentRequest = { method }
  return post<InstallmentPaymentView>(paymentPath(actor, target), body)
}

/** Huỷ lần đang mở (đổi cách trả). PayOS đã báo nhận tiền thì 409 PAYMENT_ALREADY_PAID */
export function cancelInstallmentPayment(actor: Exclude<InstallmentActor, 'staff'>, target: InstallmentTarget) {
  const url =
    actor === 'technician'
      ? api.technicianCancel(target.contractId, target.sequence)
      : api.customerCancel(target.contractId, target.sequence)
  return post<InstallmentPaymentView>(url)
}
