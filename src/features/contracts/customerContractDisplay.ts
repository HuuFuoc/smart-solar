import type { TrackerNext, TrackerStep } from '@/components/common/ui/progress-tracker'
import { formatContractMoney } from '@/features/contracts/contractDisplay'
import { isPrepaid, lastRejection, paidMoment } from '@/features/contracts/customerContractRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { isApiError } from '@/services/api/errors'
import type { ContractView } from '@/types/res/customerContractsRes'

// Bước, việc tiếp theo và câu lỗi của hợp đồng lắp đặt phía khách. Đỏ chỉ khi khách phải làm

const STEP_RANK: Record<string, number> = {
  AWAITING_SIGNATURE: 0,
  SIGNATURE_REJECTED: 0,
  UNDER_REVIEW: 1,
  SIGNED: 2,
  PAID: 3,
}

// Hợp đồng trả trước: thanh toán xong rồi mới hoàn tất hồ sơ, ký bản giấy tại công trình
const PREPAID_RANK: Record<string, number> = {
  AWAITING_SIGNATURE: 1,
  SIGNATURE_REJECTED: 1,
  UNDER_REVIEW: 2,
  SIGNED: 3,
  PAID: 3,
}

function prepaidSteps(c: ContractView): TrackerStep[] {
  const ended = !(c.status in PREPAID_RANK)
  const rank = ended ? (c.signedAt ? 3 : 1) : PREPAID_RANK[c.status]!
  const steps = [
    { label: 'Thanh toán', detail: formatMoment(paidMoment(c)) },
    { label: 'Ký hợp đồng', detail: c.publishedAt ? `Lập lúc ${formatMoment(c.publishedAt)}` : undefined },
    { label: 'Duyệt bản ký', detail: c.signedAt ? formatMoment(c.signedAt) : undefined },
    { label: 'Thi công' },
  ]
  return steps.map((step, i) => ({
    ...step,
    state: i < rank ? 'done' : i === rank && !ended ? 'current' : 'todo',
  }))
}

export function customerContractSteps(c: ContractView): TrackerStep[] {
  if (isPrepaid(c)) return prepaidSteps(c)
  const ended = !(c.status in STEP_RANK)
  const rank = ended ? (c.paidAt ? 3 : c.signedAt ? 2 : 0) : STEP_RANK[c.status]!
  const steps = [
    { label: 'Ký hợp đồng', detail: c.publishedAt ? `Nhận lúc ${formatMoment(c.publishedAt)}` : undefined },
    { label: 'Duyệt bản ký', detail: c.signedAt ? formatMoment(c.signedAt) : undefined },
    { label: 'Thanh toán', detail: c.paidAt ? formatMoment(c.paidAt) : undefined },
    { label: 'Thi công' },
  ]
  return steps.map((step, i) => ({
    ...step,
    state: i < rank ? 'done' : i === rank && !ended ? 'current' : 'todo',
  }))
}

export function customerContractNext(c: ContractView): TrackerNext {
  if (isPrepaid(c) && c.status !== 'PAID' && c.status !== 'SUPERSEDED')
    return {
      tone: 'info',
      title:
        c.status === 'UNDER_REVIEW' || c.status === 'SIGNED'
          ? 'Smart Solar đang kiểm tra bản ký'
          : 'Smart Solar đang hoàn tất hồ sơ hợp đồng',
      body: `Bạn đã thanh toán ${formatContractMoney(c)} lúc ${formatMoment(paidMoment(c))}. Bản hợp đồng ký tại công trình do nhân viên gửi lên, bạn không cần làm gì thêm.`,
    }
  switch (c.status) {
    case 'AWAITING_SIGNATURE':
      return {
        tone: 'danger',
        title: 'Bạn cần ký hợp đồng',
        body: 'In hợp đồng, ký tay, quét thành một tệp PDF rồi gửi lại ở đây.',
        action: { label: 'Gửi bản đã ký', icon: 'draw', target: 'contract-sign' },
      }
    case 'SIGNATURE_REJECTED': {
      const reason = lastRejection(c)?.rejectionReason ?? c.rejectionReason
      return {
        tone: 'danger',
        title: 'Bản ký chưa được duyệt, bạn cần ký lại',
        body: reason ? `Lý do: ${reason}` : undefined,
        action: { label: 'Gửi lại bản ký', icon: 'draw', target: 'contract-sign' },
      }
    }
    case 'UNDER_REVIEW':
      return {
        tone: 'info',
        title: 'Smart Solar đang kiểm tra bản ký',
        body: c.signedDocument?.confirmedAt ? `Bạn gửi lúc ${formatMoment(c.signedDocument.confirmedAt)}.` : undefined,
      }
    case 'SIGNED':
      return {
        tone: 'danger',
        title: 'Bạn cần thanh toán hợp đồng',
        body: `Thanh toán một lần ${formatContractMoney(c)} qua PayOS hoặc tiền mặt. Đã chọn tiền mặt thì chờ Smart Solar xác nhận.`,
        action: { label: 'Thanh toán', icon: 'payments', target: 'contract-payment' },
      }
    case 'PAID':
      return {
        tone: 'ok',
        title: 'Đã thanh toán đủ',
        body: 'Lịch thi công đã hẹn được xác nhận tự động; tiến độ lắp đặt hiện ở mục Lắp đặt.',
      }
    case 'SUPERSEDED':
      return {
        tone: 'neutral',
        title: 'Phiên bản này đã có phụ lục thay',
        body: 'Ký và thanh toán trên phiên bản mới.',
      }
    default:
      return { tone: 'neutral', title: c.status }
  }
}

// Câu riêng cho khách, rõ hơn câu chung trong bảng lỗi (bảng đó viết cho nhân viên)
const CUSTOMER_CONTRACT_ERRORS: Record<string, string> = {
  CONTRACT_NOT_FOUND: 'Không tìm thấy hợp đồng này trong tài khoản của bạn.',
  CONTRACT_INVALID_STATE:
    'Hợp đồng không còn chờ bản ký (có thể đã có phiên bản mới). Trang đã tải lại, xem trạng thái mới.',
  CONTRACT_WRONG_DOCUMENT_VERSION:
    'Bản bạn ký không phải PDF chính thức hiện tại của hợp đồng. Xem lại mã nội dung trên PDF rồi ký đúng bản mới.',
  FILE_CONTENT_CHANGED: 'Tệp đã thay đổi sau khi được kiểm tra. Kiểm tra lại PDF chính thức rồi tải lên bản ký mới.',
  FILE_ALREADY_LINKED: 'Tệp này đã được gửi trước đó. Chọn tệp bản ký mới.',
  FILE_NOT_OWNED: 'Tệp này không phải do tài khoản của bạn tải lên. Chọn lại tệp.',
  PAYMENT_CONTRACT_NOT_SIGNED: 'Hợp đồng chưa được duyệt bản ký nên chưa thanh toán được.',
  PAYMENT_ALREADY_PAID: 'Hợp đồng đã được thanh toán (có thể qua báo giá tại công trình). Trang đã tải lại.',
  PAYMENT_TOO_MANY_ATTEMPTS: 'Hợp đồng này đã có nhiều link thanh toán trong 10 phút qua. Chờ vài phút rồi thử lại.',
  PAYMENT_ATTEMPT_NOT_FOUND: 'Không còn link nào đang chờ thanh toán. Trang đã tải lại.',
  PAYMENT_CHECKOUT_IN_PROGRESS:
    'Hợp đồng đang có một link thanh toán khác (có thể là link mua gói kèm hợp đồng). Thanh toán hoặc huỷ link đó trước.',
}

/** Câu lỗi của thao tác hợp đồng phía khách, kèm số giây phải chờ khi bị giới hạn số lần */
export function customerContractError(error: unknown) {
  if (isApiError(error)) {
    const own = error.code ? CUSTOMER_CONTRACT_ERRORS[error.code] : undefined
    if (own) return own
    if (error.status === 429)
      return error.retryAfter
        ? `Bạn thao tác quá nhanh. Thử lại sau ${error.retryAfter} giây.`
        : 'Bạn thao tác quá nhanh. Chờ một lát rồi thử lại.'
    return error.message
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.'
}
