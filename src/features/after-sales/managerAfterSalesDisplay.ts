import {
  DISASTER_CLAIM_STATUSES,
  DISASTER_TYPES,
  REFUND_STATUSES,
  SALES_TASK_QUEUE_STATUSES,
} from '@/common/afterSales'
import type { Tone } from '@/components/common/ui/badge'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { RefundView } from '@/types/res/managerAfterSalesRes'

// Nhãn và câu lỗi cho các quyết định của quản lý / quản trị sau bán

const neutral = (label: string): { label: string; tone: Tone } => ({ label, tone: 'neutral' })

export const claimStatusMeta = (status: string) => DISASTER_CLAIM_STATUSES[status] ?? neutral(status)
export const disasterTypeLabel = (type: string) => DISASTER_TYPES[type] ?? type
export const taskQueueStatusMeta = (status: string) => SALES_TASK_QUEUE_STATUSES[status] ?? neutral(status)
export const refundStatusMeta = (status: string) => REFUND_STATUSES[status] ?? neutral(status)

/** Nguồn của khoản hoàn: huỷ gói, yêu cầu sửa chữa / bảo trì, hoặc khoản thanh toán không áp dụng được */
export function refundSourceLabel(r: Pick<RefundView, 'subscriptionId' | 'requestId' | 'quotationId'>) {
  if (r.subscriptionId) return `Gói dịch vụ ${shortCode(r.subscriptionId)}`
  if (r.requestId) return `Yêu cầu bảo hành, sửa chữa ${shortCode(r.requestId)}`
  if (r.quotationId) return `Báo giá ${shortCode(r.quotationId)}`
  return 'Khoản thanh toán'
}

// AFTER_SALES_INVALID_STATE dùng chung cho nhiều luật; câu gốc của backend cho biết luật nào
const INVALID_STATE_MESSAGES: [RegExp, string][] = [
  [/^The request is (already )?closed\.$/, 'Yêu cầu đã đóng. Đã tải lại để xem trạng thái mới.'],
  [/^A duplicate must belong to the same installation\.$/, 'Yêu cầu gốc phải thuộc cùng công trình.'],
  [
    /^A request with a paid quotation cannot be closed as a duplicate\.$/,
    'Khách đã thanh toán báo giá của yêu cầu này nên không đóng vì trùng được.',
  ],
  [/^The refund cannot exceed what the customer paid\.$/, 'Số tiền hoàn vượt quá số khách đã trả.'],
  [
    /^Only an open one-time maintenance request can be closed this way\.$/,
    'Chỉ bảo trì lẻ còn mở mới kết thúc theo cách này.',
  ],
  [/^The maintenance was already performed\.$/, 'Kỹ thuật viên đã làm bảo trì nên không kết thúc theo cách này được.'],
  [/claim cannot be decided\.$/, 'Hỗ trợ của gói thiên tai đã được quyết định. Đã tải lại để xem kết quả.'],
  [/^This refund is already decided\.$/, 'Khoản này đã được quyết định. Đã tải lại danh sách.'],
  [/^No cancellation is waiting\.$/, 'Gói này không còn yêu cầu huỷ nào chờ xét. Đã tải lại.'],
  [/^The task is closed\.$/, 'Việc này đã xong hoặc đã huỷ. Đã tải lại danh sách.'],
  [/^Work has started: use the exceptional stop instead\.$/, 'Việc đã bắt đầu: dùng "Dừng việc" thay vì đồng ý huỷ.'],
]

// Câu gốc của backend khi đối tượng vừa đổi ở nơi khác: dữ liệu tải lại làm khối / hộp thoại đang mở biến mất, nên báo bằng
// toast thay vì dòng lỗi trong khối
const CHANGED_MEANWHILE = [
  /^The request is (already )?closed\.$/,
  /claim cannot be decided\.$/,
  /^This refund is already decided\.$/,
  /^No cancellation is waiting\.$/,
  /^The task is closed\.$/,
  /^The maintenance was already performed\.$/,
]

/** Lỗi do yêu cầu / khoản / việc vừa đổi trạng thái ở nơi khác (không phải do ô nhập sai) */
export function changedMeanwhile(error: unknown) {
  return (
    isApiError(error) &&
    error.code === 'AFTER_SALES_INVALID_STATE' &&
    CHANGED_MEANWHILE.some((pattern) => pattern.test(error.serverMessage ?? ''))
  )
}

/** Câu lỗi của một quyết định: dịch câu gốc của backend khi mã lỗi là chung */
export function managerActionError(error: unknown) {
  if (isApiError(error) && error.code === 'AFTER_SALES_INVALID_STATE' && error.serverMessage) {
    const hit = INVALID_STATE_MESSAGES.find(([pattern]) => pattern.test(error.serverMessage!))
    if (hit) return hit[1]
  }
  if (isApiError(error) && error.code === 'SERVICE_REQUEST_NOT_FOUND' && /original/i.test(error.serverMessage ?? ''))
    return 'Không tìm thấy yêu cầu gốc. Chọn lại yêu cầu khác.'
  return errorMessage(error)
}
