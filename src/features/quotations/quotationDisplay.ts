import type { Tone } from '@/components/common/ui/badge'
import { PRODUCT_TYPES } from '@/common/product'
import { QUOTATION_EVENT_TYPES, QUOTATION_ORIGINS, QUOTATION_STATUSES } from '@/common/quotation'
import { isApiError, messageForCode } from '@/services/api/errors'
import type { QuotationLineView, QuotationView } from '@/types/res/quotationsRes'
import { formatMoney } from '@/utils/format'
import { readDecimal } from '@/utils/number'

// Nhãn, định dạng và điều kiện của báo giá lắp đặt, dùng chung cho nhân viên (kỹ thuật viên, kinh doanh, quản lý) và khách

export type QuotationViewer = 'staff' | 'customer'

/** Báo giá chờ trả lời mà biên bản khảo sát đã đổi hoặc đã quá hạn thì ghi điều đó thay cho trạng thái */
export function quotationStatusMeta(
  q: Pick<QuotationView, 'status' | 'isExpired' | 'surveyChanged'>,
  viewer: QuotationViewer,
): { label: string; tone: Tone } {
  if (q.status === 'ISSUED' && q.surveyChanged)
    return viewer === 'staff'
      ? { label: 'Biên bản khảo sát đã đổi', tone: 'warn' }
      : { label: 'Đang được cập nhật', tone: 'info' }
  if (q.status === 'ISSUED' && q.isExpired) return { label: 'Hết hạn', tone: 'warn' }
  const meta = QUOTATION_STATUSES[q.status]
  return meta ? { label: meta[viewer], tone: meta.tone } : { label: q.status, tone: 'neutral' }
}

export const quotationEventLabel = (type: string) => QUOTATION_EVENT_TYPES[type] ?? type

export const quotationOriginLabel = (origin: string) => QUOTATION_ORIGINS[origin] ?? origin

export const formatQuotationMoney = (amount: number, currency = 'VND') => formatMoney(amount, currency)

const quantityFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 })
export const formatQuantity = (quantity: number) => quantityFormat.format(quantity)

const percentFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
export const formatPercent = (value: number) => `${percentFormat.format(value)}%`

export { formatDateVn } from '@/features/scheduling/schedulingDisplay'

/** "QT-20261022-ABC234, bản 2" */
export const quotationTitle = (q: Pick<QuotationView, 'quoteNumber' | 'version'>) =>
  `${q.quoteNumber}, bản ${q.version}`

const PRODUCT_TYPE_LABELS = new Map<string, string>(PRODUCT_TYPES.map((t) => [t.value, t.label]))

/** Loại sản phẩm của dòng giỏ báo giá: backend ghi mã loại ("SOLAR_PANEL") vào mô tả dòng */
export const lineTypeLabel = (line: { description: string | null }) =>
  PRODUCT_TYPE_LABELS.get((line.description ?? '').trim().toUpperCase()) ?? null

/** Mô tả dòng để hiện; mã loại sản phẩm và mã "MATERIAL" của báo giá tự lập cũ không phải chữ cho người đọc */
export function lineDescription(line: { description: string | null }) {
  const text = line.description?.trim()
  if (!text || /^[A-Z_]+$/.test(text)) return null
  return text
}

/** "Tấm pin, Huawei, SUN2000-5KTL, mã INV-5K": phần nhận dạng sản phẩm dưới tên dòng */
export function lineIdentity(line: Pick<QuotationLineView, 'brand' | 'model' | 'sku' | 'description'>) {
  return [lineTypeLabel(line), line.brand, line.model, line.sku && `mã ${line.sku}`].filter(Boolean).join(', ')
}

/** Đơn giá khác giá danh mục lúc thêm dòng (chỉ báo giá cũ của kinh doanh mới đổi được giá) */
export const isRepriced = (line: Pick<QuotationLineView, 'unitPrice' | 'catalogUnitPrice'>) =>
  line.catalogUnitPrice != null && line.catalogUnitPrice !== line.unitPrice

/** Mới nhất lên đầu */
export const byVersionDesc = (a: QuotationView, b: QuotationView) => b.version - a.version

/** Bản đang có hiệu lực với khách (đã gửi, khách đã đồng ý hoặc đã yêu cầu sửa); bản nháp và bản đã bị thay thì không */
export const isLive = (q: QuotationView) =>
  q.status === 'ISSUED' || q.status === 'ACCEPTED' || q.status === 'REVISION_REQUESTED'

/** Bản đang làm: bản nháp nếu có, không thì bản đang hiệu lực, không nữa thì bản mới nhất */
export function currentQuotation(list: QuotationView[]) {
  const sorted = [...list].sort(byVersionDesc)
  return sorted.find((q) => q.status === 'DRAFT') ?? sorted.find(isLive) ?? sorted[0]
}

/** Khách: bản mới nhất của mỗi yêu cầu khảo sát (bản cũ xem trong trang chi tiết) */
export function latestPerRequest(list: QuotationView[]) {
  const latest = new Map<string, QuotationView>()
  for (const q of list) {
    const seen = latest.get(q.surveyRequestId)
    if (!seen || q.version > seen.version) latest.set(q.surveyRequestId, q)
  }
  return [...latest.values()]
}

// Câu riêng cho giỏ báo giá của kỹ thuật viên, rõ hơn câu chung trong bảng lỗi
const CART_ERROR_OVERRIDES: Record<string, string> = {
  QUOTATION_PRICE_MISSING:
    'Có sản phẩm chưa có giá trong danh mục nên chưa gửi được. Bỏ dòng đó hoặc nhờ quản trị cập nhật giá sản phẩm.',
  QUOTATION_PRODUCT_UNAVAILABLE: 'Sản phẩm này đã ngừng bán hoặc không bán bằng VND. Chọn sản phẩm khác.',
  QUOTATION_SURVEY_NOT_FOUND: 'Bạn không phải kỹ thuật viên đã khảo sát yêu cầu này nên không làm báo giá được.',
  QUOTATION_INVALID_LINE: 'Dòng hàng chưa hợp lệ: số lượng lớn hơn 0, tối đa 100.000, hoặc giỏ đã đủ 100 dòng.',
  QUOTATION_NOT_FOUND: 'Không tìm thấy báo giá, hoặc bạn không phải kỹ thuật viên đã khảo sát yêu cầu này.',
  QUOTATION_ACTIVE_EXISTS: 'Yêu cầu này đã có báo giá đã chốt. Lập bản sửa từ báo giá đó.',
  QUOTATION_NOT_DRAFT: 'Báo giá đã chốt nên không sửa được nữa. Lập bản sửa để đổi nội dung.',
  PAYMENT_CASH_SELECTED: 'Đã ghi khách trả tiền mặt. Bỏ chọn tiền mặt trước nếu khách muốn quét QR.',
  PAYMENT_CHECKOUT_IN_PROGRESS: 'Đang có mã QR chờ khách quét. Huỷ mã QR trước nếu khách muốn trả tiền mặt.',
  PAYMENT_ALREADY_PAID: 'Báo giá này đã được thanh toán. Trang đã tải lại.',
  PAYMENT_ATTEMPT_NOT_FOUND: 'Không còn lần thanh toán nào đang mở. Trang đã tải lại.',
  PAYMENT_TOO_MANY_ATTEMPTS: 'Đã mở thanh toán nhiều lần trong ít phút. Chờ vài phút rồi thử lại.',
}

/** Câu lỗi của lệnh báo giá, kèm số giây phải chờ khi bị giới hạn số lần */
export function quotationErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 429)
      return error.retryAfter
        ? `Bạn thao tác quá nhanh. Thử lại sau ${error.retryAfter} giây.`
        : 'Bạn thao tác quá nhanh. Chờ một lát rồi thử lại.'
    if (error.status === 410) return messageForCode('ENDPOINT_RETIRED') ?? error.message
    const override = error.code ? CART_ERROR_OVERRIDES[error.code] : undefined
    return override ?? messageForCode(error.code) ?? error.message
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.'
}

/** Số lượng cho phép số lẻ ("2,5" m cáp) */
export function readQuantity(text: string) {
  return readDecimal(text) ?? Number.NaN
}
