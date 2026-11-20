import type { Tone } from '@/components/common/ui/badge'
import type { TrackerNext, TrackerStep } from '@/components/common/ui/progress-tracker'
import {
  CONTRACT_EVENT_TYPES,
  CONTRACT_STATUSES,
  PAYMENT_EVENT_SOURCES,
  PAYMENT_EVENT_TYPES,
  CONTRACT_DOCUMENT_LINKS,
  SIGNATURE_OUTCOMES,
  STAFF_PAYMENT_ATTEMPT_STATUSES,
} from '@/common/contract'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  canWriteContract,
  type ContractViewer,
  isPrepaidContract,
  issueBlockers,
} from '@/features/contracts/contractRules'
import { isApiError, messageForCode } from '@/services/api/errors'
import type { ContractView } from '@/types/res/customerContractsRes'
import { formatMoney } from '@/utils/format'

// Nhãn, định dạng và việc tiếp theo của hợp đồng lắp đặt phía nhân viên

export function contractStatusMeta(
  status: string,
  viewer: 'staff' | 'customer' = 'staff',
): { label: string; tone: Tone } {
  const meta = CONTRACT_STATUSES[status]
  return meta ? { label: meta[viewer], tone: meta.tone } : { label: status, tone: 'neutral' }
}

export const contractStatusLabel = (status: string | null | undefined) =>
  status ? (CONTRACT_STATUSES[status]?.staff ?? status) : '—'

export const contractEventLabel = (type: string) => CONTRACT_EVENT_TYPES[type] ?? type

export const signatureOutcomeMeta = (outcome: string) =>
  SIGNATURE_OUTCOMES[outcome] ?? { label: outcome, tone: 'neutral' as Tone }

export const paymentStatusMeta = (status: string) =>
  STAFF_PAYMENT_ATTEMPT_STATUSES[status] ?? { label: status, tone: 'neutral' as Tone }

export const paymentSourceLabel = (source: string) => PAYMENT_EVENT_SOURCES[source] ?? source

export const paymentEventLabel = (type: string) => PAYMENT_EVENT_TYPES[type] ?? type

export const formatContractMoney = (c: Pick<ContractView, 'totalAmount' | 'currency'>) =>
  formatMoney(c.totalAmount, c.currency)

/** "Phiên bản 2 (phụ lục)" */
export const versionLabel = (c: Pick<ContractView, 'version' | 'previousContractId'>) =>
  c.previousContractId ? `Phiên bản ${c.version} (phụ lục)` : `Phiên bản ${c.version}`

/** "HD-20261103-ABCDEF, phiên bản 2" */
export const contractTitle = (c: Pick<ContractView, 'contractNumber' | 'version'>) =>
  `${c.contractNumber}, phiên bản ${c.version}`

export const warrantyText = (months: number | null | undefined) => {
  if (months == null) return 'Chưa chọn'
  if (months % 12 === 0) return `${months / 12} năm (${months} tháng)`
  return `${months} tháng`
}

// Câu riêng cho trang hợp đồng, rõ hơn câu chung trong bảng lỗi
const CONTRACT_ERROR_OVERRIDES: Record<string, string> = {
  FILE_CONTENT_CHANGED:
    'Tệp PDF chính thức hoặc bản ký đã thay đổi sau khi xác minh nên không duyệt được. Từ chối bản ký để khách gửi lại; nếu PDF chính thức bị đổi thì lập phụ lục.',
  FILE_STORAGE_UNAVAILABLE: 'Chưa kiểm tra lại được tệp PDF và bản ký. Thử duyệt lại sau ít phút.',
  FILE_NOT_FOUND: 'Không dùng được tệp vừa tải: tệp phải do chính bạn tải lên cho hợp đồng này. Tải lại tệp.',
}

/** Câu lỗi của mọi thao tác hợp đồng, kèm số giây phải chờ khi bị giới hạn số lần */
export function contractErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 429)
      return error.retryAfter
        ? `Bạn thao tác quá nhanh (tối đa 10 lệnh mỗi phút). Thử lại sau ${error.retryAfter} giây.`
        : 'Bạn thao tác quá nhanh (tối đa 10 lệnh mỗi phút). Chờ một lát rồi thử lại.'
    const override = error.code ? CONTRACT_ERROR_OVERRIDES[error.code] : undefined
    return override ?? messageForCode(error.code) ?? error.message
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.'
}

/** Lỗi lúc tải tệp lên: không dùng câu riêng của bước duyệt bản ký (cùng mã lỗi nhưng khác việc) */
export function uploadErrorMessage(error: unknown) {
  if (isApiError(error) && error.status !== 429) return messageForCode(error.code) ?? error.message
  return contractErrorMessage(error)
}

// Thứ tự các bước trên khối Tình hình; bản ký bị từ chối quay lại bước khách ký
const STEP_RANK: Record<string, number> = {
  DRAFT: 0,
  ISSUED: 1,
  AWAITING_SIGNATURE: 2,
  SIGNATURE_REJECTED: 2,
  UNDER_REVIEW: 3,
  SIGNED: 4,
  PAID: 5,
}

/** Các bước của một phiên bản. Bản bị thay / đã huỷ không còn bước đang làm, bước đã qua suy từ các mốc thời gian */
export function contractTrackerSteps(c: ContractView): TrackerStep[] {
  if (isPrepaidContract(c)) return prepaidTrackerSteps(c)
  const ended = !(c.status in STEP_RANK)
  const rank = ended ? (c.signedAt ? 4 : c.publishedAt ? 2 : c.issuedAt ? 1 : 0) : STEP_RANK[c.status]!
  const steps: { label: string; detail?: string }[] = [
    { label: 'Bản nháp' },
    { label: 'Phát hành, gắn PDF', detail: c.issuedAt ? formatMoment(c.issuedAt) : undefined },
    { label: 'Khách ký', detail: c.publishedAt ? `Gửi ${formatMoment(c.publishedAt)}` : undefined },
    { label: 'Duyệt bản ký', detail: c.signedAt ? formatMoment(c.signedAt) : undefined },
    { label: 'Thanh toán', detail: c.paidAt ? formatMoment(c.paidAt) : undefined },
  ]
  return steps.map((step, i) => ({
    ...step,
    state: i < rank ? 'done' : i === rank && !ended ? 'current' : 'todo',
  }))
}

/** Hợp đồng trả trước: tiền đã xác minh trước khi có hợp đồng, nên bước thanh toán đứng đầu và đã xong */
function prepaidTrackerSteps(c: ContractView): TrackerStep[] {
  const ended = !(c.status in STEP_RANK)
  const rank = ended ? (c.signedAt ? 4 : c.publishedAt ? 2 : c.issuedAt ? 1 : 0) : Math.min(STEP_RANK[c.status]!, 4)
  const steps: { label: string; detail?: string }[] = [
    { label: 'Bản nháp' },
    { label: 'Phát hành, gắn PDF', detail: c.issuedAt ? formatMoment(c.issuedAt) : undefined },
    { label: 'Ký bản giấy', detail: c.publishedAt ? `Lập hồ sơ ${formatMoment(c.publishedAt)}` : undefined },
    { label: 'Duyệt bản ký', detail: c.signedAt ? formatMoment(c.signedAt) : undefined },
  ]
  return [
    { label: 'Đã thanh toán', detail: formatMoment(c.paymentConfirmedAt), state: 'done' as const },
    ...steps.map((step, i) => ({
      ...step,
      state: (c.status === 'PAID' || i < rank
        ? 'done'
        : i === rank && !ended
          ? 'current'
          : 'todo') as TrackerStep['state'],
    })),
  ]
}

/** Việc tiếp theo của một phiên bản hợp đồng và của ai. Đỏ chỉ khi người đang xem phải làm (quản lý / quản trị soạn và duyệt) */
export function contractNextStep(c: ContractView, viewer: ContractViewer): TrackerNext {
  const staff = canWriteContract(viewer)
  if (isPrepaidContract(c) && (c.status === 'AWAITING_SIGNATURE' || c.status === 'SIGNATURE_REJECTED'))
    return staff
      ? {
          tone: 'danger',
          title: 'Cần tải bản giấy khách đã ký',
          body: `Khách đã trả ${formatContractMoney(c)} lúc ${formatMoment(c.paymentConfirmedAt)}. In PDF chính thức, khách ký tại công trình, rồi tải bản quét lên và duyệt; duyệt xong hợp đồng thành đã thanh toán, không thu lại.`,
          action: { label: 'Tải bản ký', icon: 'upload_file', target: 'contract-review' },
        }
      : {
          tone: 'info',
          title: 'Chờ bản giấy khách ký tại công trình',
          body: 'Khách đã thanh toán. Bạn tải được bản quét nếu là người phụ trách yêu cầu.',
          action: { label: 'Tải bản ký', icon: 'upload_file', target: 'contract-review' },
        }
  switch (c.status) {
    case 'DRAFT': {
      const blockers = issueBlockers(c)
      return staff
        ? {
            tone: 'danger',
            title: c.previousContractId ? 'Phụ lục nháp chưa phát hành' : 'Bản nháp hợp đồng chưa phát hành',
            body: `${isPrepaidContract(c) ? `Khách đã trả đủ lúc ${formatMoment(c.paymentConfirmedAt)}. ` : ''}${
              blockers.length
                ? `${blockers.join(' ')} Sửa bản nháp rồi phát hành.`
                : 'Kiểm tra điều khoản, thời hạn bảo hành rồi phát hành để có mã nội dung cho PDF chính thức.'
            }`,
            action: { label: 'Mở bản nháp', icon: 'edit', target: 'contract-actions' },
          }
        : { tone: 'info', title: 'Quản lý đang hoàn thiện hợp đồng' }
    }
    case 'ISSUED':
      if (!c.officialDocument)
        return staff
          ? {
              tone: 'danger',
              title: 'Cần gắn PDF hợp đồng chính thức',
              body: 'Tạo PDF từ đúng phiên bản này (ghi mã nội dung trên PDF), tải lên rồi xác nhận.',
              action: { label: 'Gắn PDF', icon: 'upload_file', target: 'contract-actions' },
            }
          : { tone: 'info', title: 'Quản lý đang chuẩn bị PDF hợp đồng' }
      return staff
        ? {
            tone: 'danger',
            title: 'Đã gắn PDF, chưa gửi khách ký',
            body: CONTRACT_DOCUMENT_LINKS
              ? 'Gửi khách ký để khách tải PDF, ký tay và gửi lại bản ký.'
              : 'Gửi khách ký để khách in hợp đồng từ cổng khách hàng, ký tay và gửi lại bản ký.',
            action: { label: 'Gửi khách ký', icon: 'send', target: 'contract-actions' },
          }
        : { tone: 'info', title: 'Quản lý chưa gửi hợp đồng cho khách ký' }
    case 'AWAITING_SIGNATURE':
      return {
        tone: 'info',
        title: 'Chờ khách ký và gửi bản ký',
        body: `Gửi khách lúc ${formatMoment(c.publishedAt)}. Gọi khách nếu cần hướng dẫn.`,
      }
    case 'UNDER_REVIEW':
      return !staff
        ? { tone: 'info', title: 'Khách đã gửi bản ký, chờ quản lý duyệt' }
        : {
            tone: 'danger',
            title: 'Khách đã gửi bản ký, cần duyệt',
            body: 'So bản ký với PDF chính thức rồi duyệt hoặc từ chối (ghi lý do).',
            action: { label: 'Duyệt bản ký', icon: 'fact_check', target: 'contract-review' },
          }
    case 'SIGNATURE_REJECTED':
      return {
        tone: 'info',
        title: 'Chờ khách gửi lại bản ký',
        body: c.rejectionReason ? `Lý do từ chối: ${c.rejectionReason}` : undefined,
      }
    case 'SIGNED':
      return {
        tone: 'info',
        title: 'Đã ký, chờ khách thanh toán',
        body: staff
          ? 'Khách trả qua PayOS (hệ thống tự xác nhận) hoặc chọn tiền mặt (bạn ghi nhận ở khối Thanh toán khi nhận tiền).'
          : 'Khách trả qua PayOS hoặc tiền mặt; quản lý ghi nhận tiền mặt. Kỹ thuật viên hẹn ngày thi công với khách.',
      }
    case 'PAID':
      return {
        tone: 'ok',
        title: isPrepaidContract(c) ? 'Đã thanh toán và đã duyệt bản ký' : 'Khách đã thanh toán đủ',
        body: staff
          ? `Thanh toán lúc ${formatMoment(c.paymentConfirmedAt ?? c.paidAt)}. Lịch thi công đã hẹn được xác nhận tự động; chưa có lịch thì tạo dự án ở mục Thi công.`
          : `Thanh toán lúc ${formatMoment(c.paidAt)}. Quản lý theo dõi thi công từ hợp đồng này.`,
      }
    case 'SUPERSEDED':
      return {
        tone: 'neutral',
        title: 'Phiên bản này đã bị phụ lục thay',
        body: 'Xem phiên bản mới ở danh sách phiên bản.',
      }
    case 'DISCARDED':
      return { tone: 'neutral', title: 'Bản nháp đã huỷ' }
    default:
      return { tone: 'neutral', title: contractStatusLabel(c.status) }
  }
}

const decimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
const whole = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

/** Tiền gọn cho ô số liệu: [số, đơn vị], vd. ["32,4", "tỷ đ"], ["535,97", "triệu đ"], ["2.182", "đ"] */
export function compactVnd(amount: number): [string, string] {
  const abs = Math.abs(amount)
  if (abs >= 1e9) return [decimal.format(amount / 1e9), 'tỷ đ']
  if (abs >= 1e6) return [decimal.format(amount / 1e6), 'triệu đ']
  return [whole.format(amount), 'đ']
}

/** "63,6%" của phần trên tổng; tổng 0 thì null */
export function shareText(part: number, total: number) {
  if (total <= 0) return null
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format((part / total) * 100)}%`
}
