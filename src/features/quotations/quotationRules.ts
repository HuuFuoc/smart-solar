import type { QuotationView } from '@/types/res/quotationsRes'

// Luật báo giá lắp đặt bám QuotationTechnicianCart (CreateCartAsync, AddCartLineAsync, UpdateCartLineAsync, IssueCartAsync,
// CreateCartRevisionAsync), QuotationOnSiteDecisions (RecordOnSiteDecisionAsync) và OnSiteQuotationPayments của backend
// 462733c. Chỉ để bật / tắt nút; backend vẫn kiểm lại. Không import giá trị qua "@/" để chạy được bằng node --test

/** Giới hạn một dòng của giỏ (ValidQuantity) */
export const CART_MAX_QUANTITY = 100_000
export const CART_MAX_LINES = 100

type Cart = Pick<QuotationView, 'quotationId' | 'status' | 'origin' | 'version' | 'previousQuotationId'>

const newestFirst = <T extends Pick<QuotationView, 'version'>>(list: T[]) =>
  [...list].sort((a, b) => b.version - a.version)

/** Giỏ nháp của kỹ thuật viên; bản nháp cũ của kinh doanh / tự động thì kỹ thuật viên không sửa được (backend trả 404) */
export const isTechnicianDraft = (q: Pick<QuotationView, 'status' | 'origin'>) =>
  q.status === 'DRAFT' && q.origin === 'TECHNICIAN'

/** Bản đang có hiệu lực với khách: đang chờ trả lời, khách đồng ý, khách yêu cầu sửa */
const isLive = (q: Pick<QuotationView, 'status'>) =>
  q.status === 'ISSUED' || q.status === 'ACCEPTED' || q.status === 'REVISION_REQUESTED'

/** Bản kỹ thuật viên đang làm: giỏ nháp nếu có, không thì bản đang hiệu lực, không nữa thì bản mới nhất */
export function workingQuotation<T extends Cart>(list: T[]): T | null {
  const sorted = newestFirst(list)
  return sorted.find(isTechnicianDraft) ?? sorted.find(isLive) ?? sorted[0] ?? null
}

/**
 * Tạo giỏ mới: khảo sát kết luận lắp được, chưa có giỏ nháp, và chưa có bản nào đang gửi / đã đồng ý / khách gửi lại (những bản
 * đó trả lời bằng bản sửa). Bản nháp cũ của kinh doanh không chặn: backend đóng nó (LEGACY_DRAFT_REPLACED) khi tạo giỏ
 */
export function canCreateCart(list: Cart[], feasibility: string | null | undefined) {
  if (feasibility === 'NOT_FEASIBLE') return false
  return !list.some(
    (q) => isTechnicianDraft(q) || ['ISSUED', 'ACCEPTED', 'REVISION_REQUESTED', 'REJECTED'].includes(q.status),
  )
}

/**
 * Lập bản sửa từ bản đã gửi, khách yêu cầu sửa hoặc khách từ chối; bản khách đã đồng ý là cuối cùng. Không lập khi đã có bản
 * nháp hoặc đã có bản mới làm từ bản này (backend: QUOTATION_DRAFT_EXISTS, QUOTATION_CANNOT_REVISE)
 */
export function canReviseCart(q: Cart, list: Cart[], feasibility?: string | null) {
  if (feasibility === 'NOT_FEASIBLE') return false
  if (!['ISSUED', 'REVISION_REQUESTED', 'REJECTED'].includes(q.status)) return false
  if (list.some((other) => other.status === 'DRAFT')) return false
  return !list.some((other) => other.previousQuotationId === q.quotationId)
}

/** Lý do chưa gửi khách được một giỏ nháp; rỗng là gửi được (backend còn định giá lại từng dòng lúc gửi) */
export function cartIssueBlockers(
  q: Pick<QuotationView, 'status' | 'origin' | 'lines' | 'totalAmount'>,
  feasibility?: string | null,
): string[] {
  if (!isTechnicianDraft(q)) return []
  const reasons: string[] = []
  if (feasibility === 'NOT_FEASIBLE') reasons.push('Biên bản khảo sát kết luận không lắp được.')
  if (q.lines.length === 0) reasons.push('Thêm ít nhất một sản phẩm.')
  return reasons
}

/** Số lượng của một dòng: lớn hơn 0, tối đa 100 000, tới 3 chữ số thập phân */
export function cartQuantityError(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return 'Số lượng phải lớn hơn 0.'
  if (value > CART_MAX_QUANTITY) return `Số lượng tối đa ${CART_MAX_QUANTITY.toLocaleString('vi-VN')}.`
  if (Math.round(value * 1000) / 1000 !== value) return 'Số lượng có tối đa 3 chữ số thập phân.'
  return null
}

/** Số lượng sau khi thêm lại một sản phẩm đã có trong giỏ (backend cộng dồn vào dòng cũ) */
export function addedQuantity(
  lines: Pick<QuotationView['lines'][number], 'productId' | 'quantity'>[],
  productId: string,
  quantity: number,
) {
  const same = lines.find((l) => l.productId === productId)
  return same ? same.quantity + quantity : quantity
}

/** Loại hàng nên có trong một báo giá lắp đặt; backend không bắt buộc nên chỉ nhắc */
export const CART_EXPECTED_TYPES = ['SOLAR_PANEL', 'INVERTER', 'INSTALLATION_LABOR'] as const

/** Loại hàng còn thiếu trong giỏ. Backend ghi mã loại sản phẩm vào `description` của dòng giỏ */
export function missingCartTypes(q: Pick<QuotationView, 'lines'>) {
  const present = new Set(q.lines.map((l) => (l.description ?? '').trim().toUpperCase()))
  return CART_EXPECTED_TYPES.filter((type) => !present.has(type))
}

/**
 * Dòng không định giá được lúc gửi (400 QUOTATION_PRICE_MISSING, `details.items`): sản phẩm ngừng bán, chưa có giá danh mục hoặc
 * không bán bằng VND. Trả mã dòng để tô đỏ đúng dòng
 */
export function priceProblemLineIds(details: unknown): string[] {
  if (typeof details !== 'object' || details === null) return []
  const items = (details as { items?: unknown }).items
  if (!Array.isArray(items)) return []
  return items
    .map((item) => (typeof item === 'object' && item !== null ? (item as { lineId?: unknown }).lineId : null))
    .filter((id): id is string => typeof id === 'string')
}

/** Lỗi do bản vừa đổi ở nơi khác: tải lại rồi để người dùng tự làm lại, không gửi lại lệnh cũ */
export const isStaleQuotationError = (code: string | null | undefined) =>
  code === 'QUOTATION_STALE_REVISION' || code === 'QUOTATION_NOT_DRAFT' || code === 'QUOTATION_DRAFT_EXISTS'

type BomLine = { productId: string; quantity: number }
type SellableProduct = {
  id?: string | null
  name?: string | null
  status?: string | null
  unitPrice?: number | null
  currency?: string | null
}

/** Sản phẩm vào giỏ được: đang bán, có giá VND (backend: QUOTATION_PRODUCT_UNAVAILABLE, QUOTATION_PRICE_MISSING) */
export const isCartSellable = (p: SellableProduct) =>
  (p.status ?? '').trim().toUpperCase() === 'ACTIVE' &&
  (p.currency ?? 'VND').toUpperCase() === 'VND' &&
  (p.unitPrice ?? 0) > 0

/**
 * Dòng lấy từ bảng vật tư và dịch vụ của biên bản khảo sát sang giỏ. Bỏ sản phẩm đã có trong giỏ (thêm lại thì backend cộng dồn,
 * làm sai số lượng kỹ thuật viên đã chỉnh), gộp sản phẩm trùng, giữ trong số dòng còn trống. `skipped`: tên sản phẩm không vào
 * giỏ được (ngừng bán, chưa có giá, không còn trong danh mục)
 */
export function bomCartPlan(
  bom: { materials?: BomLine[] | null; serviceItems?: BomLine[] | null } | null | undefined,
  lines: Pick<QuotationView['lines'][number], 'productId'>[],
  catalog: SellableProduct[],
) {
  const inCart = new Set(lines.map((l) => l.productId).filter(Boolean))
  const byId = new Map(catalog.filter((p) => p.id).map((p) => [p.id!, p]))
  const merged = new Map<string, number>()
  for (const item of [...(bom?.materials ?? []), ...(bom?.serviceItems ?? [])]) {
    if (!item.productId || !(item.quantity > 0) || inCart.has(item.productId)) continue
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity)
  }
  const items: BomLine[] = []
  const skipped: string[] = []
  for (const [productId, quantity] of merged) {
    const product = byId.get(productId)
    if (product && isCartSellable(product)) items.push({ productId, quantity: Math.round(quantity * 1000) / 1000 })
    else skipped.push(product?.name || 'Sản phẩm không còn trong danh mục')
  }
  const room = Math.max(0, CART_MAX_LINES - lines.length)
  return { items: items.slice(0, room), skipped, overflow: Math.max(0, items.length - room) }
}

// ---------- Trình bày và chốt tại công trình ----------

type Decidable = Pick<QuotationView, 'status' | 'isExpired' | 'surveyChanged' | 'canAccept'>

/** Ghi "khách đồng ý": bản đã chốt (ISSUED), còn hạn, biên bản khảo sát chưa đổi sau khi lập (`canAccept` của backend) */
export const canRecordAgreed = (q: Decidable) => q.status === 'ISSUED' && q.canAccept

/**
 * Ghi "khách không đồng ý" / "khách muốn sửa": bản đã chốt, hoặc bản khách đã đồng ý mà chưa mở thanh toán (khách đổi ý trước khi
 * trả tiền). Đã mở hoặc đã có tiền thì backend từ chối (QUOTATION_PAYMENT_STARTED): huỷ lần đang mở trước
 */
export function canRecordWithdrawal(q: Pick<QuotationView, 'status'>, paymentState?: string | null) {
  if (q.status === 'ISSUED') return true
  if (q.status !== 'ACCEPTED') return false
  return paymentState === 'AWAITING_PAYMENT' || paymentState === 'NOT_PAYABLE'
}

/** Ghi chú của quyết định: bắt buộc khi không đồng ý / muốn sửa, tối đa 1000 ký tự */
export function decisionNoteError(decision: string, note: string): string | null {
  const text = note.trim()
  if (text.length > 1000) return 'Tối đa 1000 ký tự.'
  if (decision !== 'AGREED' && !text) return 'Ghi điều khách nói để lần sau làm đúng ý khách.'
  return null
}

/** "DECLINED_ON_SITE: khách thấy đắt" → "khách thấy đắt" */
export const declineNote = (closeReason: string | null | undefined) =>
  closeReason ? closeReason.replace(/^DECLINED_ON_SITE:\s*/, '') : null

/** Mở thanh toán khi khách đã đồng ý, còn hạn và chưa có lần nào đang mở */
export const canStartPayment = (paymentState: string | null | undefined) => paymentState === 'AWAITING_PAYMENT'

/** Huỷ lần đang mở: mã QR còn chờ, hoặc lựa chọn tiền mặt chưa được xác nhận */
export const canCancelPayment = (paymentState: string | null | undefined) =>
  paymentState === 'ONLINE_IN_PROGRESS' || paymentState === 'AWAITING_CASH_CONFIRMATION'

/** Backend cho 30 lần xem trạng thái / phút: QR 5 giây một lần (12 lần), tiền mặt 1 phút một lần */
export const QR_POLL_MS = 5_000
export const CASH_CONFIRM_POLL_MS = 60_000

export function quotationPaymentPollMs(paymentState: string | null | undefined): number | false {
  if (paymentState === 'ONLINE_IN_PROGRESS') return QR_POLL_MS
  if (paymentState === 'AWAITING_CASH_CONFIRMATION') return CASH_CONFIRM_POLL_MS
  return false
}

/** Chỉ hiện "đã thanh toán" khi backend báo PAID kèm hợp đồng; trang PayOS chuyển về hay mã QR đã quét đều không đủ */
export const isVerifiedPaid = (view: { paymentState: string; contractId: string | null } | null | undefined) =>
  view?.paymentState === 'PAID' && view.contractId != null

/** Lỗi chuyển cách trả: phải huỷ lần đang mở trước (PAYMENT_CASH_SELECTED / PAYMENT_CHECKOUT_IN_PROGRESS) */
export const isSwitchMethodError = (code: string | null | undefined) =>
  code === 'PAYMENT_CASH_SELECTED' || code === 'PAYMENT_CHECKOUT_IN_PROGRESS'
