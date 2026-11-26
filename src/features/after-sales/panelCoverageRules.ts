import type { PurchaseRequest, PurchaseTargetAssetRequest } from '@/types/req/customerAfterSalesReq'
import type {
  KindCapacityView,
  PackageView,
  PanelAssetView,
  PanelEligibilityView,
  SubscriptionView,
} from '@/types/res/customerAfterSalesRes'

// Gói mua riêng theo tấm pin sau bàn giao (backend 763cb0b, PanelCoverage.cs, ServicePackageHandlers.PlanPanelPurchaseAsync).
// Trả 100% trước, một link thanh toán riêng; không bao giờ gộp vào khoản 30/70 của hợp đồng. Số tấm còn mua được là `availableUnits`
// của backend; FE chỉ cộng số tấm khách chọn để gửi `quantity` (= tổng `units`), không tự tính lại phần đã có gói.
// Không import giá trị qua "@/" để chạy được bằng node --test

/** assetId → số tấm muốn bảo vệ của dòng đó (0 là không chọn). Mỗi dòng chỉ một khoá nên không thể trùng dòng */
export type PanelSelection = Record<string, number>

export const isPerPanelPackage = (p: Pick<PackageView, 'pricingUnit'>) => p.pricingUnit === 'PER_PANEL'

export const kindCapacity = (view: Pick<PanelEligibilityView, 'kinds'>, kind: string): KindCapacityView | null =>
  view.kinds.find((k) => k.kind === kind) ?? null

/** Số tấm còn mua được của một dòng tấm pin cho một loại gói (backend tính; thiếu thì 0) */
export const panelAvailable = (panel: Pick<PanelAssetView, 'coverage'>, kind: string) =>
  panel.coverage.find((c) => c.kind === kind)?.availableUnits ?? 0

export const panelHeld = (panel: Pick<PanelAssetView, 'coverage'>, kind: string) =>
  panel.coverage.find((c) => c.kind === kind)?.heldUnits ?? 0

/** Tổng số tấm đã chọn (dòng 0 tấm không tính) */
export const selectionUnits = (selection: PanelSelection) =>
  Object.values(selection).reduce((sum, units) => sum + (units > 0 ? units : 0), 0)

/** Dòng tấm pin gửi đi: bỏ dòng 0 tấm, mỗi tài sản một lần */
export const targetAssets = (selection: PanelSelection): PurchaseTargetAssetRequest[] =>
  Object.entries(selection)
    .filter(([, units]) => units > 0)
    .map(([assetId, units]) => ({ assetId, units }))

export type SelectionErrors = { rows: Record<string, string>; total: string | null }

/**
 * Lỗi của lựa chọn tấm pin, theo đúng giới hạn backend trả: mỗi dòng là số nguyên từ 1 tới số tấm còn mua được của dòng; tài sản
 * phải là tấm pin đang hoạt động của công trình; tổng ít nhất 1 tấm và không quá số còn mua được của loại gói
 */
export function selectionErrors(
  view: Pick<PanelEligibilityView, 'panels' | 'kinds'>,
  kind: string,
  selection: PanelSelection,
): SelectionErrors {
  const rows: Record<string, string> = {}
  for (const [assetId, units] of Object.entries(selection)) {
    if (units === 0) continue
    const panel = view.panels.find((p) => p.assetId === assetId)
    if (!panel) {
      rows[assetId] = 'Tấm pin này không còn trong danh sách của công trình.'
      continue
    }
    const available = panelAvailable(panel, kind)
    if (!Number.isInteger(units) || units < 1) rows[assetId] = 'Số tấm là số nguyên từ 1 trở lên.'
    else if (available === 0) rows[assetId] = 'Tấm pin này không còn mua thêm được gói loại này.'
    else if (units > available) rows[assetId] = `Chỉ còn mua được tối đa ${available} tấm.`
  }
  const total = selectionUnits(selection)
  const capacity = kindCapacity(view, kind)?.availableUnits ?? 0
  return {
    rows,
    total:
      total < 1
        ? 'Chọn ít nhất một tấm pin.'
        : total > capacity
          ? `Công trình chỉ còn mua được ${capacity} tấm cho loại gói này.`
          : null,
  }
}

export const hasSelectionErrors = (e: SelectionErrors) => Object.keys(e.rows).length > 0 || e.total !== null

/** Hai ô id gói theo loại; backend từ chối id sai loại */
const packageIds = (kind: string, packageId: string) => ({
  maintenancePackageId: kind === 'MAINTENANCE' ? packageId : null,
  disasterPackageId: kind === 'DISASTER_PROTECTION' ? packageId : null,
})

/**
 * Body mua gói theo hệ thống (PER_INSTALLATION_LEGACY) như trước: không bao giờ kèm `quantity`, `targetAssets`,
 * `renewsSubscriptionId` (backend trả 400 SERVICE_PACKAGE_PRICING_UNIT_VALIDATION_FAILED cho gói cũ có các trường này)
 */
export function legacyPurchaseBody(input: {
  contractId: string
  kind: string
  packageId: string
  includeContract: boolean
  paymentMethod: 'ONLINE' | 'CASH'
}): PurchaseRequest {
  return {
    contractId: input.contractId,
    ...packageIds(input.kind, input.packageId),
    includeContract: input.includeContract,
    paymentMethod: input.paymentMethod,
  }
}

/**
 * Body mua gói PER_PANEL cho các tấm đã chọn: `includeContract` luôn false (không gộp với hợp đồng), `quantity` = tổng `units`,
 * mỗi dòng tấm pin một lần. Một lần mua chỉ một loại gói nên không trộn gói theo tấm pin với gói theo hệ thống
 */
export function panelPurchaseBody(input: {
  contractId: string
  kind: string
  packageId: string
  selection: PanelSelection
  paymentMethod: 'ONLINE' | 'CASH'
}): PurchaseRequest {
  const targets = targetAssets(input.selection)
  return {
    contractId: input.contractId,
    ...packageIds(input.kind, input.packageId),
    includeContract: false,
    paymentMethod: input.paymentMethod,
    quantity: selectionUnits(input.selection),
    targetAssets: targets,
  }
}

/** Body gia hạn một kỳ PANEL: backend lấy các tấm của kỳ đó (không gửi `targetAssets`), kỳ mới bắt đầu khi kỳ cũ hết */
export function renewalBody(input: {
  contractId: string
  kind: string
  packageId: string
  renewsSubscriptionId: string
  paymentMethod: 'ONLINE' | 'CASH'
}): PurchaseRequest {
  return {
    contractId: input.contractId,
    ...packageIds(input.kind, input.packageId),
    includeContract: false,
    paymentMethod: input.paymentMethod,
    renewsSubscriptionId: input.renewsSubscriptionId,
  }
}

export type PurchaseBlock = 'not-paid' | 'not-handed-over' | 'cancelled' | 'no-panels' | 'kind-blocked' | 'sold-out'

/**
 * Vì sao chưa mua được gói loại này cho công trình, theo đúng cờ backend trả: hợp đồng chưa trả đủ, chưa bàn giao, công trình đã
 * huỷ, chưa có tấm pin, loại gói bị chặn (`blocker`), hết tấm còn mua được. null là mua được
 */
export function purchaseBlock(
  view: Pick<PanelEligibilityView, 'contractFullyPaid' | 'handedOver' | 'reason' | 'panels' | 'kinds'>,
  kind: string,
): PurchaseBlock | null {
  if (!view.contractFullyPaid) return 'not-paid'
  if (!view.handedOver) return 'not-handed-over'
  if (view.reason && /cancelled/i.test(view.reason)) return 'cancelled'
  if (view.panels.length === 0) return 'no-panels'
  const capacity = kindCapacity(view, kind)
  if (!capacity) return 'sold-out'
  if (capacity.blocker) return 'kind-blocked'
  return capacity.availableUnits > 0 ? null : 'sold-out'
}

/** Kỳ gói đang giữ quyền lợi theo backend (SubscriptionStatuses.HoldsTerm) */
const HOLDS_TERM = ['PAID', 'ACTIVE', 'CANCELLATION_REQUESTED']

/**
 * Có nên hiện nút gia hạn cho kỳ này: kỳ PANEL đang giữ quyền lợi và còn ngày kết thúc phía trước (đúng điều kiện backend dùng để
 * liệt kê kỳ gia hạn được). Gia hạn được thật hay không vẫn theo `renewableSubscriptionIds` của backend lúc mở hộp gia hạn
 */
export function mayRenew(s: Pick<SubscriptionView, 'coverageScope' | 'status' | 'endsAt'>, now = Date.now()): boolean {
  if (s.coverageScope !== 'PANEL' || !HOLDS_TERM.includes(s.status) || !s.endsAt) return false
  return Date.parse(s.endsAt) > now
}

/** Kỳ này có trong danh sách gia hạn được của loại gói đó không */
export const isRenewable = (view: Pick<PanelEligibilityView, 'kinds'>, kind: string, subscriptionId: string) =>
  kindCapacity(view, kind)?.renewableSubscriptionIds.includes(subscriptionId) ?? false

/** Gói PER_PANEL đang bán của một loại, để gia hạn / mua thêm */
export const perPanelPackagesOfKind = (view: Pick<PanelEligibilityView, 'perPanelPackages'>, kind: string) =>
  view.perPanelPackages.filter((p) => p.kind === kind && p.isActive)
