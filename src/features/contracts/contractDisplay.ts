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
import { issueBlockers, type ContractViewer } from '@/features/contracts/contractRules'
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

/** Việc tiếp theo của một phiên bản hợp đồng và của ai. Đỏ chỉ khi người đang xem phải làm */
export function contractNextStep(c: ContractView, viewer: ContractViewer): TrackerNext {
  const sales = viewer === 'sales'
  switch (c.status) {
    case 'DRAFT': {
      const blockers = issueBlockers(c)
      return sales
        ? {
            tone: 'danger',
            title: c.previousContractId ? 'Phụ lục nháp chưa phát hành' : 'Bản nháp hợp đồng chưa phát hành',
            body: blockers.length
              ? `${blockers.join(' ')} Sửa bản nháp rồi phát hành.`
              : 'Kiểm tra điều khoản, thời hạn bảo hành rồi phát hành để có mã nội dung cho PDF chính thức.',
            action: { label: 'Mở bản nháp', icon: 'edit', target: 'contract-actions' },
          }
        : { tone: 'info', title: 'Kinh doanh đang soạn hợp đồng' }
    }
    case 'ISSUED':
      if (!c.officialDocument)
        return sales
          ? {
              tone: 'danger',
              title: 'Cần gắn PDF hợp đồng chính thức',
              body: 'Tạo PDF từ đúng phiên bản này (ghi mã nội dung trên PDF), tải lên rồi xác nhận.',
              action: { label: 'Gắn PDF', icon: 'upload_file', target: 'contract-actions' },
            }
          : { tone: 'info', title: 'Kinh doanh đang chuẩn bị PDF hợp đồng' }
      return sales
        ? {
            tone: 'danger',
            title: 'Đã gắn PDF, chưa gửi khách ký',
            body: CONTRACT_DOCUMENT_LINKS
              ? 'Gửi khách ký để khách tải PDF, ký tay và gửi lại bản ký.'
              : 'Gửi khách ký, rồi gửi đúng tệp PDF đã gắn cho khách để khách ký tay và gửi lại bản ký.',
            action: { label: 'Gửi khách ký', icon: 'send', target: 'contract-actions' },
          }
        : { tone: 'info', title: 'Kinh doanh chưa gửi hợp đồng cho khách ký' }
    case 'AWAITING_SIGNATURE':
      return {
        tone: 'info',
        title: 'Chờ khách ký và gửi bản ký',
        body: `Gửi khách lúc ${formatMoment(c.publishedAt)}. Gọi khách nếu cần hướng dẫn.`,
      }
    case 'UNDER_REVIEW':
      return viewer === 'admin'
        ? { tone: 'info', title: 'Khách đã gửi bản ký, chờ kinh doanh hoặc quản lý duyệt' }
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
        body: 'Khách thanh toán qua PayOS trên cổng khách hàng. Chỉ hệ thống xác nhận đã nhận tiền.',
      }
    case 'PAID':
      return {
        tone: 'ok',
        title: 'Khách đã thanh toán đủ',
        body: sales
          ? `Thanh toán lúc ${formatMoment(c.paidAt)}. Quản lý tạo dự án thi công từ hợp đồng này.`
          : `Thanh toán lúc ${formatMoment(c.paidAt)}. Tạo dự án thi công ở mục Thi công.`,
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
