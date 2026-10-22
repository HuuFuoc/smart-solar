import type { Tone } from '@/components/common/ui/badge'
import { QUOTATION_EVENT_TYPES, QUOTATION_LIMITS, QUOTATION_STATUSES } from '@/common/quotation'
import { addDays, todayVn, vnDate } from '@/features/scheduling/schedulingDisplay'
import type { QuotationLineView, QuotationView } from '@/types/res/quotationsRes'
import { formatMoney } from '@/utils/format'
import { readDecimal, readGroupedNumber } from '@/utils/number'

// Nhãn, định dạng và điều kiện của báo giá lắp đặt, dùng chung cho kinh doanh và khách

export type QuotationViewer = 'sales' | 'customer'

/** Báo giá chờ trả lời mà đã quá hạn thì ghi "Hết hạn" thay cho trạng thái */
export function quotationStatusMeta(
  q: Pick<QuotationView, 'status' | 'isExpired'>,
  viewer: QuotationViewer,
): { label: string; tone: Tone } {
  if (q.status === 'ISSUED' && q.isExpired) return { label: 'Hết hạn', tone: 'warn' }
  const meta = QUOTATION_STATUSES[q.status]
  return meta ? { label: meta[viewer], tone: meta.tone } : { label: q.status, tone: 'neutral' }
}

export const quotationEventLabel = (type: string) => QUOTATION_EVENT_TYPES[type] ?? type

export const formatQuotationMoney = (amount: number, currency = 'VND') => formatMoney(amount, currency)

const quantityFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 })
export const formatQuantity = (quantity: number) => quantityFormat.format(quantity)

const percentFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
export const formatPercent = (value: number) => `${percentFormat.format(value)}%`

/** "22/10/2026" theo giờ Việt Nam */
export function formatDateVn(iso: string | null | undefined) {
  const day = iso ? vnDate(iso) : ''
  if (!day) return '—'
  const [y, m, d] = day.split('-')
  return `${d}/${m}/${y}`
}

/** "QT-20261022-ABC234, bản 2" */
export const quotationTitle = (q: Pick<QuotationView, 'quoteNumber' | 'version'>) =>
  `${q.quoteNumber}, bản ${q.version}`

/** "Huawei, SUN2000-5KTL, mã INV-5K": phần nhận dạng sản phẩm dưới tên dòng */
export function lineIdentity(line: Pick<QuotationLineView, 'brand' | 'model' | 'sku'>) {
  return [line.brand, line.model, line.sku && `mã ${line.sku}`].filter(Boolean).join(', ')
}

/** Đơn giá khác giá danh mục lúc thêm dòng */
export const isRepriced = (line: Pick<QuotationLineView, 'unitPrice' | 'catalogUnitPrice'>) =>
  line.catalogUnitPrice != null && line.catalogUnitPrice !== line.unitPrice

/** Mới nhất lên đầu */
export const byVersionDesc = (a: QuotationView, b: QuotationView) => b.version - a.version

/** Bản đang có hiệu lực với khách (đã gửi, khách đã đồng ý hoặc đã yêu cầu sửa); bản nháp và bản đã bị thay thì không */
export const isLive = (q: QuotationView) =>
  q.status === 'ISSUED' || q.status === 'ACCEPTED' || q.status === 'REVISION_REQUESTED'

/** Bản kinh doanh đang làm: bản nháp nếu có, không thì bản đang hiệu lực, không nữa thì bản mới nhất */
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

/** Lý do chưa gửi khách được, theo đúng điều kiện của backend; rỗng là gửi được */
export function sendBlockers(q: QuotationView, now = Date.now()) {
  const reasons: string[] = []
  if (q.lines.length === 0) reasons.push('Thêm ít nhất một dòng hàng.')
  else if (q.totalAmount <= 0) reasons.push('Tổng tiền phải lớn hơn 0.')
  if (!q.validUntil) reasons.push('Đặt hạn hiệu lực của báo giá.')
  else if (new Date(q.validUntil).getTime() <= now) reasons.push('Hạn hiệu lực đã qua, đặt hạn mới.')
  return reasons
}

// Hạn hiệu lực: chọn ngày, gửi cuối ngày đó theo giờ Việt Nam
const VALID_UNTIL_TIME = 'T23:59:59+07:00'

export const validUntilFromDate = (date: string) => (date ? `${date}${VALID_UNTIL_TIME}` : null)

/** Ngày chọn được: từ hôm nay tới trước giới hạn 90 ngày của backend một ngày (backend tính từ lúc lưu) */
export function validUntilRange(now = new Date()) {
  const today = todayVn(now)
  return { min: today, max: addDays(today, QUOTATION_LIMITS.maxValidityDays - 1) }
}

export const defaultValidUntil = (now = new Date()) =>
  validUntilFromDate(addDays(todayVn(now), QUOTATION_LIMITS.defaultValidityDays))

/** Tiền gõ trong ô: "12.000.000" hay "12000000" đều được; trống là 0; sai thì NaN */
export function readMoney(text: string) {
  if (text.trim() === '') return 0
  return readGroupedNumber(text) ?? Number.NaN
}

export const isMoney = (value: number) => Number.isInteger(value) && value >= 0 && value <= QUOTATION_LIMITS.maxAmount

/** Số lượng cho phép số lẻ ("2,5" m cáp) */
export function readQuantity(text: string) {
  return readDecimal(text) ?? Number.NaN
}

export const isQuantity = (value: number) => value > 0 && value <= QUOTATION_LIMITS.maxQuantity

/** Số tiền in lại trong ô sửa: "12.000.000" */
export const moneyText = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount)
