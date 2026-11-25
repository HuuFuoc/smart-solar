import type { PackageView } from '@/types/res/customerAfterSalesRes'
import type { QuotationServicePackageView, QuotationView } from '@/types/res/quotationsRes'

// Gói dịch vụ đi kèm báo giá lắp đặt, tính theo tấm pin (backend 763cb0b, QuotationServicePackages.cs). Số tấm pin, số lượng gói,
// thành tiền và mọi tổng đều đọc từ QuotationView backend trả về; FE không nhân giá với số tấm và không gửi giá hay số lượng.
// Chỉ để bật / tắt nút và giải thích; backend vẫn kiểm lại. Không import giá trị qua "@/" để chạy được bằng node --test

/** Hai loại gói, mỗi loại tối đa một gói trên một bản báo giá; bảo trì trước, thiên tai sau */
export const BUNDLED_KINDS = ['MAINTENANCE', 'DISASTER_PROTECTION'] as const
export type BundledKind = (typeof BUNDLED_KINDS)[number]

type Packages = Pick<QuotationView, 'servicePackages'>

/** Máy chủ đã chạy bản có gói đi kèm: QuotationView có mảng `servicePackages` (máy chủ cũ không trả trường này) */
export const supportsServicePackages = (q: Packages) => Array.isArray(q.servicePackages)

export const quotationPackages = (q: Packages): QuotationServicePackageView[] =>
  Array.isArray(q.servicePackages) ? q.servicePackages : []

export const hasServicePackages = (q: Packages) => quotationPackages(q).length > 0

export const packageOfKind = (q: Packages, kind: string) => quotationPackages(q).find((p) => p.kind === kind) ?? null

/** Gói theo thứ tự loại (bảo trì trước) để mọi màn liệt kê giống nhau */
export const packagesInKindOrder = <T extends { kind: string }>(list: T[]) =>
  [...list].sort((a, b) => kindRank(a.kind) - kindRank(b.kind))

const kindRank = (kind: string) => {
  const i = (BUNDLED_KINDS as readonly string[]).indexOf(kind)
  return i === -1 ? BUNDLED_KINDS.length : i
}

type Totals = Pick<
  QuotationView,
  | 'totalAmount'
  | 'installationTotal'
  | 'maintenancePackagesTotal'
  | 'disasterPackagesTotal'
  | 'servicePackagesTotal'
  | 'grandTotal'
>

/**
 * Các tổng của báo giá, đúng số backend trả. `totalAmount` giữ nghĩa chi phí lắp đặt (dòng hàng + thuế báo giá); số trình bày cho
 * khách là `grandTotal`. Máy chủ cũ không có các trường gói: khi đó báo giá không có gói và tổng cho khách chính là `totalAmount`
 */
export function quotationAmounts(q: Totals) {
  return {
    installation: q.installationTotal ?? q.totalAmount,
    maintenance: q.maintenancePackagesTotal ?? 0,
    disaster: q.disasterPackagesTotal ?? 0,
    packages: q.servicePackagesTotal ?? 0,
    grand: q.grandTotal ?? q.totalAmount,
  }
}

/** Tổng giá trị báo giá trình bày cho khách (danh sách bản, hộp chốt, hộp ghi quyết định, màn trình bày) */
export const customerTotal = (q: Pick<QuotationView, 'totalAmount' | 'grandTotal'>) => q.grandTotal ?? q.totalAmount

/** Số tấm pin để gắn gói: số nguyên dương do backend tính, không thì null */
export function validPanelQuantity(q: Pick<QuotationView, 'panelQuantity'>) {
  const n = q.panelQuantity
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null
}

const SOLAR_PANEL = 'SOLAR_PANEL'

/**
 * Vì sao chưa gắn được gói, chỉ để giải thích (backend vẫn quyết định): `none` không có dòng tấm pin, `fractional` tổng tấm pin lẻ.
 * Giỏ của kỹ thuật viên ghi mã loại sản phẩm vào mô tả dòng; backend đếm mọi dòng SOLAR_PANEL chọn từ danh mục
 */
export function panelQuantityProblem(q: Pick<QuotationView, 'panelQuantity' | 'lines'>): 'none' | 'fractional' | null {
  if (validPanelQuantity(q) !== null) return null
  const panels = q.lines.filter((l) => l.productId && (l.description ?? '').trim().toUpperCase() === SOLAR_PANEL)
  const sum = Math.round(panels.reduce((s, l) => s + l.quantity, 0) * 1000) / 1000
  return panels.length > 0 && sum > 0 && !Number.isInteger(sum) ? 'fractional' : 'none'
}

type Editable = Pick<QuotationView, 'status' | 'origin' | 'servicePackages' | 'panelQuantity' | 'lines'>

/**
 * Gói đi kèm sửa được chỉ trên giỏ nháp của kỹ thuật viên, khi máy chủ có gói đi kèm. Chọn / đổi gói cần số tấm pin hợp lệ; bỏ gói
 * thì luôn được (để gỡ được gói trước khi bỏ tấm pin cuối cùng). Báo giá đã chốt, đã đồng ý, đã đóng chỉ xem
 */
export function packageEditing(q: Editable) {
  const editable = q.status === 'DRAFT' && q.origin === 'TECHNICIAN' && supportsServicePackages(q)
  const problem = editable ? panelQuantityProblem(q) : null
  return { editable, canSelect: editable && problem === null, problem }
}

/** Gói chọn được trong hộp chọn: đang bán, tính theo tấm pin và đúng loại (danh mục của kỹ thuật viên đã lọc, kiểm thêm cho chắc) */
export function isSelectablePackage(p: Pick<PackageView, 'kind' | 'isActive' | 'pricingUnit'>, kind: string) {
  return p.kind === kind && p.isActive && p.pricingUnit === 'PER_PANEL'
}

/** Nút của một gói trong hộp chọn: gói đang gắn thì không chọn lại, loại đã có gói thì là đổi gói */
export function pickAction(current: Pick<QuotationServicePackageView, 'packageId'> | null, packageId: string) {
  if (!current) return 'select' as const
  return current.packageId === packageId ? ('current' as const) : ('replace' as const)
}

export type IssuePackageProblem = {
  kind: string
  packageId: string | null
  code: string | null
  problem: string | null
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/**
 * Gói chặn việc chốt báo giá (POST …/issue trả mã của gói đầu tiên kèm `details.packages[{ kind, packageId, code, problem }]`):
 * gói đã ngừng bán, đổi đơn vị tính, không còn trong danh mục. Hiện từng gói, không gộp thành một câu chung
 */
export function issuePackageProblems(details: unknown): IssuePackageProblem[] {
  if (!isRecord(details) || !Array.isArray(details.packages)) return []
  return details.packages.filter(isRecord).map((p) => ({
    kind: str(p.kind) ?? '',
    packageId: str(p.packageId),
    code: str(p.code),
    problem: str(p.problem),
  }))
}

/** `details.currentRevision` của 409 QUOTATION_STALE_REVISION; null khi backend không gửi */
export function currentRevisionOf(details: unknown) {
  if (!isRecord(details)) return null
  const n = details.currentRevision
  return typeof n === 'number' && Number.isInteger(n) ? n : null
}
