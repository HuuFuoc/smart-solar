import {
  receiptStatusMeta,
  reviewFailure,
  submitFailure,
  type ReviewFailure,
  type SubmitFailure,
} from '@/features/cash-receipts/cashReceiptRules'
import { paymentPlanErrorMessage } from '@/features/payment-plan/paymentPlanDisplay'
import { isApiError, messageForCode } from '@/services/api/errors'

// Câu của phiếu thu tiền mặt: nhãn trạng thái theo người xem, câu lỗi theo việc phải làm tiếp (xem cashReceiptRules)

export { receiptStatusMeta }

/** Nhãn cho kỹ thuật viên: "đã gửi, chờ quản lý" thay vì "chờ xác nhận" */
export function technicianStatusLabel(status: string | null | undefined) {
  if (status === 'SUBMITTED') return 'Đã gửi phiếu thu, chờ quản lý xác nhận'
  if (status === 'ACCEPTED') return 'Quản lý đã xác nhận phiếu thu'
  if (status === 'REJECTED') return 'Quản lý yêu cầu bổ sung'
  return receiptStatusMeta(status).label
}

const RATE_LIMITED = (seconds: number) => `Bạn thao tác quá nhanh. Thử lại sau ${seconds} giây.`
const UNAVAILABLE =
  'Hệ thống đang cập nhật nên tạm thời chưa dùng được phiếu thu. Giữ phiếu thu giấy, thử lại sau ít phút.'

/** Câu báo khi gửi phiếu thu lỗi; lỗi từng ô hiện cạnh ô, câu chung chỉ nhắc kiểm tra */
export function submitErrorText(error: unknown, failure: SubmitFailure = submitFailure(error)) {
  const code = isApiError(error) ? error.code : null
  switch (failure.action) {
    case 'fields':
      return 'Kiểm tra lại các ô được đánh dấu.'
    case 'replace-evidence':
      return code === 'FILE_NOT_OWNED'
        ? 'Ảnh này do tài khoản khác tải lên nên không dùng được. Chụp ảnh phiếu thu bằng tài khoản của bạn.'
        : (messageForCode(code) ?? 'Ảnh này không dùng được cho khoản này. Chụp ảnh khác.')
    case 'reupload':
      return 'Ảnh đã tải lên không còn dùng được. Bấm gửi lại để tải ảnh lên lần nữa.'
    case 'reload-retry':
    case 'reload-close':
      return messageForCode(code) ?? 'Khoản này vừa thay đổi. Đã tải lại.'
    case 'ambiguous':
      return 'Chưa rõ phiếu thu đã tới hệ thống chưa (mất kết nối hoặc hệ thống chậm). Đã tải lại trạng thái; khoản chưa có phiếu đang chờ thì gửi lại.'
    case 'rate-limited':
      return RATE_LIMITED(failure.seconds)
    case 'unavailable':
      return UNAVAILABLE
    case 'support':
      return 'Số tiền phải thu của khoản này đã đổi so với lúc chọn tiền mặt nên chưa gửi được phiếu thu. Báo quản lý hoặc bộ phận hỗ trợ.'
    case 'forbidden':
      return 'Tài khoản của bạn không được gửi phiếu thu cho khoản này.'
    case 'gone':
      return messageForCode(code) ?? 'Không tìm thấy khoản này, hoặc bạn không còn phụ trách hợp đồng.'
    default:
      return paymentPlanErrorMessage(error)
  }
}

/** Câu báo khi tải ảnh phiếu thu lên lỗi (xin link, PUT lên kho, đăng ký tệp) */
export function uploadErrorText(error: unknown) {
  if (!isApiError(error)) return 'Chưa tải được ảnh phiếu thu lên. Thử lại.'
  if (error.status === 429) return RATE_LIMITED(error.retryAfter ?? 60)
  if (error.code === 'SCHEMA_NOT_READY' || error.code === 'FEATURE_PENDING_MIGRATION') return UNAVAILABLE
  if (error.code === 'FILE_TYPE_NOT_ALLOWED') return 'Chỉ nhận ảnh JPEG, PNG, WebP hoặc tệp PDF.'
  if (error.code === 'FILE_TOO_LARGE') return 'Tệp rỗng hoặc lớn hơn 15 MB. Chụp lại hoặc chọn tệp nhỏ hơn.'
  if (error.code === 'FILE_UPLOAD_NOT_ALLOWED')
    return 'Tài khoản của bạn chưa được tải ảnh phiếu thu lên. Báo quản lý xác nhận tiền mặt trực tiếp.'
  return `Chưa tải được ảnh phiếu thu lên: ${error.message}`
}

/** Lỗi tải lên do chính tệp (sai loại, quá cỡ): bỏ tệp, chụp / chọn tệp khác */
export const uploadRejectsFile = (error: unknown) =>
  isApiError(error) && (error.code === 'FILE_TYPE_NOT_ALLOWED' || error.code === 'FILE_TOO_LARGE')

/** Câu báo khi xác nhận / yêu cầu bổ sung lỗi */
export function reviewErrorText(error: unknown, failure: ReviewFailure = reviewFailure(error)) {
  const code = isApiError(error) ? error.code : null
  switch (failure.action) {
    case 'fields':
      return 'Kiểm tra lại các ô được đánh dấu.'
    case 'stale':
      return messageForCode('PAYMENT_CASH_RECEIPT_STALE')!
    case 'reload':
      return messageForCode(code) ?? 'Phiếu thu vừa thay đổi. Đã tải lại.'
    case 'evidence-invalid':
      return 'Ảnh phiếu thu của kỹ thuật viên không còn hợp lệ nên chưa xác nhận được. Yêu cầu kỹ thuật viên gửi lại.'
    case 'ambiguous':
      return 'Chưa rõ thao tác đã được ghi chưa (mất kết nối hoặc hệ thống chậm). Đã tải lại phiếu thu, xem trạng thái rồi làm lại nếu cần.'
    case 'rate-limited':
      return RATE_LIMITED(failure.seconds)
    case 'unavailable':
      return UNAVAILABLE
    case 'support':
      return 'Số tiền trên phiếu thu khác số phải thu hiện tại nên không xác nhận được. Liên hệ bộ phận hỗ trợ.'
    case 'forbidden':
      return 'Chỉ quản lý hoặc quản trị được xét duyệt phiếu thu.'
    default:
      return paymentPlanErrorMessage(error)
  }
}

/** Câu khi không tải được hàng chờ / chi tiết */
export function readErrorText(error: unknown) {
  if (isApiError(error)) {
    if (error.code === 'SCHEMA_NOT_READY' || error.code === 'FEATURE_PENDING_MIGRATION') return UNAVAILABLE
    if (error.status === 403) return 'Chỉ quản lý hoặc quản trị xem được phiếu thu tiền mặt.'
    if (error.status === 404 && !error.code)
      return 'Hệ thống chưa có chức năng phiếu thu tiền mặt. Xác nhận tiền mặt ở mục Thu tiền.'
  }
  return paymentPlanErrorMessage(error)
}
