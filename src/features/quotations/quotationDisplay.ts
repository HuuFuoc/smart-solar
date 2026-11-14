import type { Tone } from '@/components/common/ui/badge'
import {
  AUTOMATIC_QUOTATION_OUTCOMES,
  QUOTATION_EVENT_TYPES,
  QUOTATION_LIMITS,
  QUOTATION_STATUSES,
} from '@/common/quotation'
import { bomMismatchText, pricingBlockers, type BomLineFix } from '@/features/quotations/quotationRules'
import { addDays, todayVn } from '@/features/scheduling/schedulingDisplay'
import { errorMessage, isApiError } from '@/services/api/errors'
import type {
  PriceAdjustment,
  PricingBasis,
  PricingIssue,
  QuotationLineView,
  QuotationView,
} from '@/types/res/quotationsRes'
import { formatMoney } from '@/utils/format'
import { readDecimal, readGroupedNumber } from '@/utils/number'

// Nhãn, định dạng và điều kiện của báo giá lắp đặt, dùng chung cho kinh doanh và khách

export type QuotationViewer = 'sales' | 'customer'

/** Báo giá chờ trả lời mà biên bản khảo sát đã đổi hoặc đã quá hạn thì ghi điều đó thay cho trạng thái */
export function quotationStatusMeta(
  q: Pick<QuotationView, 'status' | 'isExpired' | 'surveyChanged'>,
  viewer: QuotationViewer,
): { label: string; tone: Tone } {
  if (q.status === 'ISSUED' && q.surveyChanged)
    return viewer === 'sales'
      ? { label: 'Biên bản khảo sát đã đổi', tone: 'warn' }
      : { label: 'Đang được cập nhật', tone: 'info' }
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

export { formatDateVn } from '@/features/scheduling/schedulingDisplay'

/** "QT-20261022-ABC234, bản 2" */
export const quotationTitle = (q: Pick<QuotationView, 'quoteNumber' | 'version'>) =>
  `${q.quoteNumber}, bản ${q.version}`

/** Mô tả dòng để hiện; báo giá tự lập ghi mã "MATERIAL" vào mô tả dòng thiết bị, không phải chữ cho người đọc */
export const lineDescription = (line: { description: string | null }) =>
  line.description && line.description.trim().toUpperCase() !== 'MATERIAL' ? line.description : null

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
  return [...reasons, ...pricingBlockers(q)]
}

/** Một chỗ giá thấp hơn danh mục, viết thành câu cho kinh doanh và quản lý */
export function adjustmentText(a: PriceAdjustment, q: Pick<QuotationView, 'lines' | 'currency'>) {
  const money = (amount: number | null) => formatQuotationMoney(amount ?? 0, q.currency)
  if (a.kind === 'DISCOUNT') return `Giảm giá ${money(a.amount)} trên cả báo giá`
  const line = q.lines.find((l) => l.lineNumber === a.lineNumber)
  const name = `Dòng ${a.lineNumber}${line ? `, ${line.name}` : ''}`
  if (a.kind === 'ZERO_PRICE') return `${name}: đơn giá 0`
  return `${name}: đơn giá ${money(a.unitPrice)}, danh mục ${money(a.catalogUnitPrice)}, giảm ${money(a.amount)}`
}

/** Vấn đề về giá của bản tự động theo lời cho kinh doanh. Tên sản phẩm lấy từ danh sách thiết bị của biên bản khảo sát */
export function pricingIssueText(issue: PricingIssue, basis: PricingBasis | null) {
  const item = basis && [...basis.materials, ...basis.services].find((i) => i.productId === issue.productId)
  const name = item?.name || item?.sku || 'Một sản phẩm'
  switch (issue.code) {
    case 'PRODUCT_UNAVAILABLE':
      return `${name} không còn trong danh mục đang bán.`
    case 'WRONG_ITEM_KIND':
      return `${name} bị ghi nhầm nhóm thiết bị và dịch vụ trong biên bản khảo sát.`
    case 'CURRENCY_NOT_SUPPORTED':
      return `${name} không bán bằng VND.`
    case 'PRICE_MISSING':
      return `${name} chưa có giá danh mục: nhập đơn giá cho dòng này.`
    // Tấm pin, inverter phải có trong biên bản khảo sát: tự thêm dòng thì lệch biên bản, không gửi được
    case 'MISSING_SOLAR_PANEL':
      return 'Chưa có dòng tấm pin. Nhờ kỹ thuật viên thêm tấm pin vào biên bản khảo sát, rồi sửa dòng theo biên bản.'
    case 'MISSING_INVERTER':
      return 'Chưa có dòng inverter. Nhờ kỹ thuật viên thêm inverter vào biên bản khảo sát, rồi sửa dòng theo biên bản.'
    case 'LABOR_NOT_SPECIFIED':
      return 'Chưa có chi phí nhân công lắp đặt: bấm "Chi phí, điều khoản" rồi nhập ô "Nhân công lắp đặt".'
    case 'CONDITIONS_REQUIRE_REVIEW':
      return 'Kỹ thuật viên ghi lắp được kèm điều kiện: xem lại giá cho các điều kiện đó.'
    case 'INVALID_TOTAL':
      return 'Tổng tiền phải lớn hơn 0.'
    default:
      return 'Có vấn đề về giá cần kiểm tra lại.'
  }
}

export const automaticOutcomeText = (outcome: string) =>
  AUTOMATIC_QUOTATION_OUTCOMES[outcome] ?? 'Chưa tạo được báo giá. Thử lại sau ít phút.'

/** Một lệnh sửa dòng cho khớp biên bản khảo sát, viết thành câu; tên sản phẩm cần thêm lấy từ danh mục */
export function bomFixText(fix: BomLineFix, productName: (productId: string) => string | undefined) {
  if (fix.kind === 'add')
    return `${productName(fix.productId) ?? 'Một sản phẩm trong biên bản'}: biên bản ${formatQuantity(fix.quantity)}, báo giá chưa có. Thêm dòng theo giá danh mục.`
  if (fix.kind === 'update')
    return `${fix.name}: biên bản ${formatQuantity(fix.quantity)}, báo giá ${formatQuantity(fix.quoted)}. Sửa số lượng.`
  return `${fix.name}: không có trong biên bản. Bỏ dòng.`
}

/** Câu lỗi của lệnh báo giá; dòng thiết bị lệch biên bản khảo sát thì ghi rõ lệch ở sản phẩm nào */
export function quotationErrorMessage(error: unknown) {
  // Câu chung của mã này viết cho khách (bản đã gửi không đồng ý được nữa); bản nháp của kinh doanh vẫn dùng tiếp được
  if (isApiError(error) && error.code === 'QUOTATION_SURVEY_CHANGED')
    return 'Biên bản khảo sát vừa được bổ sung: sửa dòng theo biên bản và xác nhận theo biên bản mới rồi mới gửi khách được.'
  const mismatch = isApiError(error) && error.code === 'QUOTATION_BOM_MISMATCH' ? bomMismatchText(error.details) : null
  return mismatch ? `${errorMessage(error)} ${mismatch}.` : errorMessage(error)
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
