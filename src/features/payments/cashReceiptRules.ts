import type { Tone } from '@/components/common/ui/badge'
import type { CashReceiptRequest } from '@/types/req/cashReceiptsReq'
import type { CashReceiptView, StaffCashReceiptView } from '@/types/res/cashReceiptsRes'
import type { PaymentLineView } from '@/types/res/staffPaymentsRes'
import { SERVICE_REQUEST_KINDS } from '../../common/afterSales.ts'
import { VN_TIME_ZONE, formatMoment, todayVn, vnTimestamp } from '../scheduling/schedulingDisplay.ts'

// Phiếu thu tiền mặt kỹ thuật viên gửi (backend 9ae01e7, PR #24). Gửi phiếu không phải đã trả: lần thanh toán vẫn PENDING tới khi
// quản lý / quản trị duyệt; bị yêu cầu bổ sung thì gửi lại cho cùng lần thanh toán, khách không trả lần hai. Số tiền luôn lấy từ
// backend, không cho sửa

export const RECEIPT_NUMBER_MAX = 100
export const RECEIPT_NOTE_MAX = 500
export const REVIEW_REASON_MAX = 500
/** Backend cho đồng hồ máy kỹ thuật viên lệch tới 5 phút về tương lai */
const CLOCK_SKEW_MS = 5 * 60_000

// ---------- Nhãn ----------

type Meta = { label: string; tone: Tone }

/** Kỹ thuật viên: đỏ là việc của mình (gửi lại phiếu) */
const TECHNICIAN_STATUSES: Record<string, Meta> = {
  SUBMITTED: { label: 'Chờ quản lý duyệt', tone: 'info' },
  ACCEPTED: { label: 'Quản lý đã duyệt', tone: 'ok' },
  REJECTED: { label: 'Cần bổ sung phiếu', tone: 'danger' },
  WITHDRAWN: { label: 'Đã đóng', tone: 'neutral' },
}

/** Quản lý / quản trị: đỏ là phiếu chờ mình duyệt */
const STAFF_STATUSES: Record<string, Meta> = {
  SUBMITTED: { label: 'Chờ duyệt', tone: 'danger' },
  ACCEPTED: { label: 'Đã duyệt', tone: 'ok' },
  REJECTED: { label: 'Đã yêu cầu bổ sung', tone: 'warn' },
  WITHDRAWN: { label: 'Đã đóng', tone: 'neutral' },
}

export function receiptStatusMeta(status: string, viewer: 'technician' | 'staff'): Meta {
  return (viewer === 'staff' ? STAFF_STATUSES : TECHNICIAN_STATUSES)[status] ?? { label: status, tone: 'neutral' }
}

const CONTEXTS: Record<string, string> = {
  INSTALLATION_DEPOSIT: 'Cọc 30%',
  INSTALLATION_BALANCE: 'Thanh toán 70%',
  AFTER_SALES_QUOTATION: 'Hậu mãi',
}

/** Loại khoản của một dòng hàng đợi: "Cọc 30%" / "Thanh toán 70%" / "Hậu mãi" */
export function receiptContextLabel(row: Pick<StaffCashReceiptView, 'context'>) {
  return CONTEXTS[row.context] ?? 'Khoản khác'
}

/** Khoản cụ thể: "Hợp đồng HD-…" hoặc "AS-… bản 2, Báo lỗi"; thiếu dữ liệu thì bỏ phần đó, không in chữ rỗng */
export function receiptContextDetail(
  row: Pick<
    StaffCashReceiptView,
    'context' | 'contractNumber' | 'serviceRequestNumber' | 'serviceRequestKind' | 'quotationVersion'
  >,
) {
  if (row.context === 'AFTER_SALES_QUOTATION') {
    const request = [row.serviceRequestNumber, row.quotationVersion != null ? `bản ${row.quotationVersion}` : null]
      .filter(Boolean)
      .join(' ')
    const kind = row.serviceRequestKind ? (SERVICE_REQUEST_KINDS[row.serviceRequestKind] ?? null) : null
    return [request, kind].filter(Boolean).join(', ')
  }
  return row.contractNumber ? `Hợp đồng ${row.contractNumber}` : ''
}

/** Bộ lọc hàng đợi; mặc định là phiếu chờ duyệt */
export const RECEIPT_STATUS_FILTERS = [
  { value: 'SUBMITTED', label: 'Chờ duyệt' },
  { value: 'ACCEPTED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Yêu cầu bổ sung' },
  { value: '', label: 'Tất cả' },
] as const

export const RECEIPT_KIND_FILTERS = [
  { value: '', label: 'Mọi loại' },
  { value: 'INSTALLMENT', label: 'Lắp đặt 30/70' },
  { value: 'SERVICE_QUOTATION', label: 'Hậu mãi' },
] as const

// ---------- Kỹ thuật viên ----------

/** Phiếu của lần tiền mặt đang mở: `review` đang chờ duyệt (không gửi thêm, không bỏ chọn tiền mặt), `rejected` cần gửi lại */
export function receiptStep(receipt: Pick<CashReceiptView, 'status'> | null | undefined) {
  if (receipt?.status === 'SUBMITTED') return 'review' as const
  if (receipt?.status === 'REJECTED') return 'rejected' as const
  return 'capture' as const
}

/** Đang chờ duyệt thì backend chặn bỏ chọn tiền mặt / đổi sang QR / ghi khách không đồng ý (409) nên ẩn các nút đó */
export const isUnderReview = (receipt: Pick<CashReceiptView, 'status'> | null | undefined) =>
  receipt?.status === 'SUBMITTED'

/** Mọi phiếu trừ phiếu đang hiện, cũ trước: lịch sử gửi / bị trả lại */
export function earlierReceipts(
  all: CashReceiptView[] | null | undefined,
  current: CashReceiptView | null | undefined,
) {
  return (all ?? []).filter((r) => r.cashReceiptId !== current?.cashReceiptId)
}

// ---------- Giờ thu tiền (giờ Việt Nam) ----------

const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: VN_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** Ngày và giờ hiện tại ở Việt Nam, để điền sẵn ô "Thời điểm thu" */
export function nowVn(now: Date = new Date()) {
  return { date: todayVn(now), time: clock.format(now) }
}

export type ReceiptForm = {
  hasPhoto: boolean
  receiptNumber: string
  /** YYYY-MM-DD và HH:mm theo giờ Việt Nam */
  date: string
  time: string
  /** Chưa sửa ô giờ thì gửi `keptAt` (null: backend lấy lúc gửi) */
  timeTouched: boolean
  /**
   * Gửi lại sau khi bị yêu cầu bổ sung: giờ thu của phiếu cũ, gửi nguyên (tới giây). Tiền đã thu lúc đó; lấy lúc gửi lại thì
   * backend xét hạn báo giá theo giờ sai và tiền thu đúng hạn có thể thành tiền chưa áp
   */
  keptAt: string | null
  note: string
}

export type ReceiptFormErrors = Partial<Record<'photo' | 'receiptNumber' | 'collectedAt' | 'note', string>>

/** `cashChosenAt`: lúc mở lần tiền mặt (`current.createdAt`); tiền không thể thu trước lúc đó */
export function receiptFormErrors(form: ReceiptForm, cashChosenAt: string | null, now: Date = new Date()) {
  const errors: ReceiptFormErrors = {}
  if (!form.hasPhoto) errors.photo = 'Chụp hoặc chọn ảnh phiếu thu.'
  const number = form.receiptNumber.trim()
  if (!number) errors.receiptNumber = 'Ghi số phiếu thu.'
  else if (number.length > RECEIPT_NUMBER_MAX) errors.receiptNumber = `Tối đa ${RECEIPT_NUMBER_MAX} ký tự.`
  if (form.timeTouched) {
    const at = form.date && /^\d{2}:\d{2}$/.test(form.time) ? Date.parse(vnTimestamp(form.date, form.time)) : NaN
    const chosen = cashChosenAt ? Date.parse(cashChosenAt) : NaN
    if (Number.isNaN(at)) errors.collectedAt = 'Chọn ngày và giờ thu tiền.'
    else if (at > now.getTime() + CLOCK_SKEW_MS) errors.collectedAt = 'Chưa tới giờ này.'
    // So theo phút: ô giờ không có giây
    else if (!Number.isNaN(chosen) && at < Math.floor(chosen / 60_000) * 60_000)
      errors.collectedAt = `Phải sau lúc khách chọn trả tiền mặt (${formatMoment(cashChosenAt)}).`
  }
  if (form.note.trim().length > RECEIPT_NOTE_MAX) errors.note = `Tối đa ${RECEIPT_NOTE_MAX} ký tự.`
  return errors
}

/** Body khi form đã hợp lệ. Chọn đúng phút khách chọn tiền mặt thì gửi lúc chọn (ô giờ không có giây, backend so tới giây) */
export function cashReceiptBody(
  form: ReceiptForm,
  paymentAttemptId: string,
  evidenceFileId: string,
  cashChosenAt: string | null,
): CashReceiptRequest {
  let collectedAt = form.keptAt
  if (form.timeTouched) {
    collectedAt = vnTimestamp(form.date, form.time)
    if (cashChosenAt && Date.parse(collectedAt) < Date.parse(cashChosenAt)) collectedAt = cashChosenAt
  }
  return {
    paymentAttemptId,
    receiptNumber: form.receiptNumber.trim(),
    evidenceFileId,
    collectedAt,
    note: form.note.trim() || null,
  }
}

/** Lý do yêu cầu bổ sung: bắt buộc, tối đa 500 ký tự, kỹ thuật viên đọc được */
export function reviewReasonError(reason: string) {
  const text = reason.trim()
  if (!text) return 'Ghi điều kỹ thuật viên cần sửa.'
  if (text.length > REVIEW_REASON_MAX) return `Tối đa ${REVIEW_REASON_MAX} ký tự.`
  return null
}

// ---------- Kết quả duyệt ----------

/**
 * Dòng có tiền đã ghi nhận mà không áp được (thu sau hạn báo giá, báo giá không còn nhận tiền): tiền nằm ở sổ tiền chưa áp, báo
 * giá không thành đã trả. Không coi là thanh toán xong
 */
export const unappliedLines = (lines: PaymentLineView[] | null | undefined) =>
  (lines ?? []).filter((l) => l.status === 'REVIEW_REQUIRED')
