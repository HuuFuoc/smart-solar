import {
  COLLECTION_STATUSES,
  INSTALLMENT_KINDS,
  INSTALLMENT_PAYMENT_STATES,
  INSTALLMENT_STATUSES,
  OWNERSHIP_STATUSES,
  PAYMENT_PLAN_STAGES,
  SIGNATURE_SET_STATUSES,
} from '@/common/paymentPlan'
import type { Tone } from '@/components/common/ui/badge'
import type { TrackerNext, TrackerStep } from '@/components/common/ui/progress-tracker'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { isApiError, messageForCode, errorMessage } from '@/services/api/errors'
import type { ContractPaymentPlanView, InstallmentView } from '@/types/res/paymentPlanRes'
import { formatMoney } from '@/utils/format'

// Nhãn và câu của gói thanh toán 30/70. Tiền theo Intl vi-VN, giờ theo giờ Việt Nam (formatMoment)

const meta = (table: Record<string, { label: string; tone: Tone }>, key: string | null | undefined) =>
  (key ? table[key] : undefined) ?? { label: key ?? '—', tone: 'neutral' as Tone }

export const formatVnd = (amount: number | null | undefined) => formatMoney(amount, 'VND')

export function stageMeta(stage: string | null | undefined, viewer: 'staff' | 'customer' = 'staff') {
  const found = stage ? PAYMENT_PLAN_STAGES[stage] : undefined
  return found ? { label: found[viewer], tone: found.tone } : { label: stage ?? '—', tone: 'neutral' as Tone }
}

export const installmentStatusMeta = (status: string | null | undefined) => meta(INSTALLMENT_STATUSES, status)
export const installmentPaymentStateMeta = (state: string | null | undefined) => meta(INSTALLMENT_PAYMENT_STATES, state)
export const signatureSetMeta = (status: string | null | undefined) => meta(SIGNATURE_SET_STATUSES, status)
export const collectionStatusMeta = (status: string | null | undefined) => meta(COLLECTION_STATUSES, status)

export const installmentName = (i: Pick<InstallmentView, 'kind' | 'sequence'>) =>
  INSTALLMENT_KINDS[i.kind] ?? `Khoản ${i.sequence}`

export const ownershipText = (status: string | null | undefined) =>
  (status ? OWNERSHIP_STATUSES[status] : undefined) ?? '—'

/** "Hạn 22/11/2026 23:30" (giờ Việt Nam) */
export const dueText = (dueAt: string | null | undefined) => (dueAt ? `Hạn ${formatMoment(dueAt)}` : null)

/** Câu lỗi của mọi thao tác 30/70, kèm số giây phải chờ khi bị giới hạn số lần */
export function paymentPlanErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 429)
      return error.retryAfter
        ? `Bạn thao tác quá nhanh. Thử lại sau ${error.retryAfter} giây.`
        : 'Bạn thao tác quá nhanh. Chờ một lát rồi thử lại.'
    if (error.code === 'CONTRACT_SIGNED_PAGES_INCOMPLETE') {
      const missing = (error.details as { missingPages?: unknown } | null)?.missingPages
      if (Array.isArray(missing) && missing.length > 0)
        return `Còn thiếu trang ${missing.join(', ')} nên chưa chốt được.`
    }
    return messageForCode(error.code) ?? error.message
  }
  return errorMessage(error)
}

const STAGE_RANK: Record<string, number> = {
  DRAFT_CREATED: 0,
  DEPOSIT_VERIFIED: 1,
  READY_FOR_INSTALLATION: 2,
  BALANCE_DUE: 3,
  BALANCE_OVERDUE: 3,
  FULLY_PAID: 4,
}

/** Bốn bước của hợp đồng 30/70; hợp đồng đã huỷ không còn bước đang làm */
export function planTrackerSteps(plan: ContractPaymentPlanView): TrackerStep[] {
  const ended = !(plan.stage in STAGE_RANK)
  const rank = ended ? 0 : STAGE_RANK[plan.stage]!
  const deposit = plan.installments.find((i) => i.kind === 'DEPOSIT')
  const balance = plan.installments.find((i) => i.kind === 'BALANCE')
  const steps: { label: string; detail?: string }[] = [
    { label: 'Trả 30%', detail: deposit?.paidAt ? formatMoment(deposit.paidAt) : undefined },
    {
      label: 'Ký hợp đồng giấy',
      detail: plan.signature?.finalizedAt ? formatMoment(plan.signature.finalizedAt) : undefined,
    },
    { label: 'Thi công, nghiệm thu' },
    {
      label: 'Trả 70%',
      detail: balance?.paidAt
        ? formatMoment(balance.paidAt)
        : balance?.dueAt
          ? `Hạn ${formatMoment(balance.dueAt)}`
          : undefined,
    },
  ]
  return steps.map((step, i) => ({ ...step, state: i < rank ? 'done' : i === rank && !ended ? 'current' : 'todo' }))
}

export type PlanViewer = 'customer' | 'technician' | 'sales' | 'manager' | 'admin'

/** Việc tiếp theo và là của ai: đỏ khi người đang xem phải làm, xanh dương khi chờ người khác */
export function planNextStep(plan: ContractPaymentPlanView, viewer: PlanViewer): TrackerNext {
  const due = plan.installments.find((i) => i.kind === 'BALANCE')?.dueAt
  switch (plan.stage) {
    case 'DRAFT_CREATED':
      if (viewer === 'technician')
        return {
          tone: 'danger',
          title: 'Thu khoản 30% của khách',
          body: 'Khách đọc đủ điều khoản rồi trả 30% bằng mã QR hoặc tiền mặt. Có tiền được xác minh mới cho khách ký giấy.',
          action: { label: 'Thu 30%', icon: 'payments', target: 'installments' },
        }
      if (viewer === 'customer')
        return {
          tone: 'danger',
          title: 'Đọc hợp đồng và trả 30%',
          body: 'Đọc toàn bộ điều khoản ở mục Nội dung trước. Trả 30% xong bạn ký bản giấy với kỹ thuật viên; khoản 70% trả sau khi nghiệm thu.',
          action: { label: 'Trả 30%', icon: 'payments', target: 'installments' },
        }
      return {
        tone: 'info',
        title: 'Chờ khách trả 30%',
        body: 'Kỹ thuật viên thu tại công trình hoặc khách trả trong ứng dụng.',
      }
    case 'DEPOSIT_VERIFIED':
      if (viewer === 'technician' || viewer === 'manager' || viewer === 'admin')
        return {
          tone: viewer === 'technician' ? 'danger' : 'info',
          title: 'Cho khách ký hợp đồng giấy, rồi tải ảnh từng trang',
          body: 'Ghi số trang, chụp đủ các trang 1..N rồi chốt. Chốt xong hợp đồng sẵn sàng thi công.',
          action: { label: 'Tải trang ký', icon: 'photo_camera', target: 'paper-signature' },
        }
      return {
        tone: 'info',
        title: viewer === 'customer' ? 'Ký bản giấy với kỹ thuật viên' : 'Chờ khách ký hợp đồng giấy',
        body: 'Đã nhận 30%. Kỹ thuật viên mang bản in để khách ký rồi chụp lại từng trang.',
      }
    case 'READY_FOR_INSTALLATION':
      return {
        tone: 'ok',
        title: 'Đã ký giấy, sẵn sàng thi công',
        body: 'Thi công theo lịch đã hẹn và các hồ sơ bắt buộc. Khoản 70% mở khi khách nghiệm thu, hạn 72 giờ.',
      }
    case 'BALANCE_DUE':
      return viewer === 'customer'
        ? {
            tone: 'danger',
            title: 'Trả khoản 70%',
            body: due ? `Hạn ${formatMoment(due)} (giờ Việt Nam).` : undefined,
            action: { label: 'Trả 70%', icon: 'payments', target: 'installments' },
          }
        : { tone: 'info', title: 'Chờ khách trả 70%', body: due ? `Hạn ${formatMoment(due)}.` : undefined }
    case 'BALANCE_OVERDUE':
      return viewer === 'customer'
        ? {
            tone: 'danger',
            title: 'Khoản 70% đã quá hạn',
            body: 'Bạn vẫn trả được; khoản trả muộn được ghi lại. Liên hệ Smart Solar nếu cần hỗ trợ.',
            action: { label: 'Trả 70%', icon: 'payments', target: 'installments' },
          }
        : {
            tone: viewer === 'sales' ? 'danger' : 'warn',
            title: 'Khoản 70% đã quá hạn',
            body: 'Theo dõi ở mục Thu hồi công nợ. Hạn trong hợp đồng không đổi.',
          }
    case 'FULLY_PAID':
      return { tone: 'neutral', title: 'Đã trả đủ 100%' }
    case 'DISCARDED':
      return { tone: 'neutral', title: 'Hợp đồng đã huỷ trước khi trả 30%' }
    default:
      return { tone: 'neutral', title: stageMeta(plan.stage).label }
  }
}

/** Lỗi 409 vì dữ liệu vừa đổi ở nơi khác: tải lại rồi người dùng tự làm lại */
export const isStaleError = (error: unknown) =>
  isApiError(error) &&
  (error.code === 'CONTRACT_STALE_REVISION' ||
    error.code === 'INSTALLATION_STALE_REVISION' ||
    error.code === 'COLLECTION_INVALID_TRANSITION')
