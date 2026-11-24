import type { Tone } from '@/components/common/ui/badge'
import type { PackageView, SubscriptionView } from '@/types/res/customerAfterSalesRes'
import type { QuotationView } from '@/types/res/quotationsRes'

// Gói dịch vụ đi kèm báo giá lắp đặt. Backend `main` 09e0876 CHƯA hỗ trợ: không có danh sách gói cho kỹ thuật viên, báo giá
// không có dòng gói, thanh toán khoản 70% chỉ có một dòng CONTRACT_INSTALLMENT và PurchaseAsync từ chối gộp gói với hợp đồng
// 30/70 (docs/BUNDLED_SERVICE_PACKAGES_FE_BE_GAP.md). Luật dưới đây chỉ để bật / tắt nút và xem trước; số tiền thật luôn lấy từ
// backend. Không import giá trị qua "@/" để chạy được bằng node --test

export const BUNDLED_KINDS = ['MAINTENANCE', 'DISASTER_PROTECTION'] as const
export type BundledKind = (typeof BUNDLED_KINDS)[number]

export const BUNDLED_KIND_LABELS: Record<BundledKind, string> = {
  MAINTENANCE: 'Gói bảo trì',
  DISASTER_PROTECTION: 'Gói bảo vệ thiên tai',
}

const isBundledKind = (kind: string): kind is BundledKind => (BUNDLED_KINDS as readonly string[]).includes(kind)

/** Giá và quyền lợi của một gói: chung cho gói đang bán (PackageView) và bản chụp lúc mua (SubscriptionView) */
export type PackageTerms = Pick<
  PackageView,
  | 'kind'
  | 'price'
  | 'durationMonths'
  | 'visitMonths'
  | 'coveredDisasterTypes'
  | 'coveragePercent'
  | 'perIncidentLimit'
  | 'termLimit'
>

/**
 * Gói đã gắn vào báo giá / hợp đồng: bản chụp backend ghi lúc gắn, không đọc lại danh mục. Admin đổi giá hay quyền lợi sau đó
 * thì bản chụp không đổi
 */
export type BundledPackage = PackageTerms & {
  packageId: string
  name: string
  description?: string | null
  imageUrl?: string | null
}

/** Chỉ giỏ nháp của kỹ thuật viên mới thêm / đổi / bỏ gói; chốt rồi thì bất biến như dòng hàng (QUOTATION_NOT_DRAFT) */
export const canEditBundledPackages = (q: Pick<QuotationView, 'status' | 'origin'>) =>
  q.status === 'DRAFT' && q.origin === 'TECHNICIAN'

export type PackageChoice =
  | { action: 'add' }
  | { action: 'replace'; replaces: BundledPackage }
  | { action: 'none'; reason: 'locked' | 'unknown-kind' | 'selected' | 'inactive' }

/**
 * Bấm chọn một gói trong hộp thoại thì làm gì: thêm, đổi gói cùng loại đang chọn (mỗi loại tối đa một gói), hay không cho chọn
 * (báo giá đã chốt, gói đã chọn, gói ngừng bán). Gói đã chọn giữ nguyên dù sau đó ngừng bán, vẫn bỏ được
 */
export function packageChoice(
  selected: BundledPackage[],
  pkg: Pick<PackageView, 'packageId' | 'kind' | 'isActive'>,
  editable: boolean,
): PackageChoice {
  if (!editable) return { action: 'none', reason: 'locked' }
  if (!isBundledKind(pkg.kind)) return { action: 'none', reason: 'unknown-kind' }
  if (selected.some((s) => s.packageId === pkg.packageId)) return { action: 'none', reason: 'selected' }
  if (!pkg.isActive) return { action: 'none', reason: 'inactive' }
  const sameKind = selected.find((s) => s.kind === pkg.kind)
  return sameKind ? { action: 'replace', replaces: sameKind } : { action: 'add' }
}

/** Còn loại gói nào chưa chọn thì nút "Thêm gói dịch vụ" mới bật */
export function missingBundledKinds(selected: Pick<BundledPackage, 'kind'>[]): BundledKind[] {
  return BUNDLED_KINDS.filter((kind) => !selected.some((s) => s.kind === kind))
}

/** Gói đã chọn theo loại, bảo trì trước; dữ liệu lỗi có hai gói cùng loại thì giữ gói đầu, như backend nhận một gói mỗi loại */
export function bundledByKind(selected: BundledPackage[]): BundledPackage[] {
  return BUNDLED_KINDS.flatMap((kind) => selected.find((s) => s.kind === kind) ?? [])
}

export type BundledTotals = { maintenance: number; disaster: number; total: number }

/** Cộng giá bản chụp theo loại, số lượng luôn 1. Chỉ để xem trước khi backend chưa trả tổng */
export function bundledTotals(selected: Pick<BundledPackage, 'kind' | 'price'>[]): BundledTotals {
  const sum = (kind: BundledKind) => selected.filter((s) => s.kind === kind).reduce((n, s) => n + s.price, 0)
  const maintenance = sum('MAINTENANCE')
  const disaster = sum('DISASTER_PROTECTION')
  return { maintenance, disaster, total: maintenance + disaster }
}

/**
 * Chia 30/70 như PaymentPlanCalculator.Split: cọc = làm tròn (tổng × 30%) tới đồng, nửa đồng làm tròn ra xa 0; 70% = tổng − cọc.
 * Tính bằng số nguyên để không lệch ở mốc nửa đồng. null khi tổng không phải số đồng nguyên ≥ 2, như backend
 */
export function installmentSplitPreview(total: number): { deposit: number; balance: number } | null {
  if (!Number.isSafeInteger(total) || total < 2) return null
  const deposit = Math.floor((total * 30 + 50) / 100)
  const balance = total - deposit
  if (deposit <= 0 || balance <= 0) return null
  return { deposit, balance }
}

export type BundledPaymentPlan = {
  installationTotal: number
  /** Khoản 1: 30% chi phí lắp đặt, không có tiền gói */
  deposit: number
  /** 70% chi phí lắp đặt */
  balance: number
  packages: BundledTotals
  /** Khoản 2 = 70% lắp đặt + 100% tiền gói */
  secondPayment: number
  grandTotal: number
  /** Có số do giao diện tự tính (chưa có số của backend): chỉ hiện là tạm tính */
  preview: boolean
}

/**
 * Lịch trả của báo giá có gói đi kèm: 30/70 chỉ áp lên chi phí lắp đặt, gói trả đủ 100% cùng khoản 70%, không thu ở khoản 30%.
 * Có số tiền hai khoản của backend (`installments`) thì dùng nguyên số đó; không có thì chia thử như backend và đánh dấu tạm tính
 */
export function bundledPaymentPlan(input: {
  installationTotal: number
  packages: Pick<BundledPackage, 'kind' | 'price'>[]
  installments?: { deposit: number; balance: number } | null
}): BundledPaymentPlan | null {
  const split = input.installments ?? installmentSplitPreview(input.installationTotal)
  if (!split) return null
  const packages = bundledTotals(input.packages)
  return {
    installationTotal: split.deposit + split.balance,
    deposit: split.deposit,
    balance: split.balance,
    packages,
    secondPayment: split.balance + packages.total,
    grandTotal: split.deposit + split.balance + packages.total,
    preview: !input.installments,
  }
}

export type BundledStage =
  | 'AWAITING_PAYMENT'
  | 'CHECKOUT_EXPIRED'
  | 'AWAITING_HANDOVER'
  | 'PAID'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLATION_REQUESTED'
  | 'CANCELLED'
  | 'UNKNOWN'

const STAGES: Record<Exclude<BundledStage, 'UNKNOWN'>, { label: string; tone: Tone }> = {
  AWAITING_PAYMENT: { label: 'Chờ thanh toán', tone: 'warn' },
  CHECKOUT_EXPIRED: { label: 'Hết hạn thanh toán', tone: 'neutral' },
  AWAITING_HANDOVER: { label: 'Chờ bàn giao', tone: 'info' },
  PAID: { label: 'Đã thanh toán', tone: 'info' },
  ACTIVE: { label: 'Đang có hiệu lực', tone: 'ok' },
  EXPIRED: { label: 'Hết hạn', tone: 'neutral' },
  CANCELLATION_REQUESTED: { label: 'Chờ duyệt huỷ', tone: 'info' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

/**
 * Trạng thái hiển thị của một gói đi kèm, chỉ suy từ trạng thái backend (SubscriptionStatuses). "Đang có hiệu lực" chỉ khi
 * backend báo ACTIVE: đã nhận tiền mà chưa có kỳ (`startsAt` null, chưa bàn giao) là "Chờ bàn giao", có kỳ mà chưa tới ngày là
 * "Đã thanh toán". Gói thiên tai đang hiệu lực còn trong thời gian chờ thì trả `coverageStartsAt` để báo ngày bắt đầu bảo vệ
 */
export function bundledSubscriptionStage(
  s: Pick<SubscriptionView, 'status' | 'startsAt' | 'coverageStartsAt' | 'kind'>,
  now: number,
): { stage: BundledStage; label: string; tone: Tone; startsAt: string | null; coverageStartsAt: string | null } {
  const of = (
    stage: Exclude<BundledStage, 'UNKNOWN'>,
    extra: { startsAt?: string | null; coverageStartsAt?: string | null } = {},
  ) => ({
    stage,
    ...STAGES[stage],
    startsAt: extra.startsAt ?? null,
    coverageStartsAt: extra.coverageStartsAt ?? null,
  })
  switch (s.status) {
    case 'AWAITING_PAYMENT':
      return of('AWAITING_PAYMENT')
    case 'CHECKOUT_EXPIRED':
      return of('CHECKOUT_EXPIRED')
    case 'EXPIRED':
      return of('EXPIRED')
    case 'CANCELLATION_REQUESTED':
      return of('CANCELLATION_REQUESTED')
    case 'CANCELLED':
      return of('CANCELLED')
    case 'PAID':
      return s.startsAt ? of('PAID', { startsAt: s.startsAt }) : of('AWAITING_HANDOVER')
    case 'ACTIVE': {
      const coverage = s.kind === 'DISASTER_PROTECTION' && s.coverageStartsAt ? Date.parse(s.coverageStartsAt) : NaN
      return of('ACTIVE', { coverageStartsAt: Number.isFinite(coverage) && coverage > now ? s.coverageStartsAt : null })
    }
    default:
      return { stage: 'UNKNOWN', label: s.status, tone: 'neutral', startsAt: null, coverageStartsAt: null }
  }
}
