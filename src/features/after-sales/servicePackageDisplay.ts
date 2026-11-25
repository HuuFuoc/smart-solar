import {
  BUNDLED_KIND_LABELS,
  BUNDLED_PACKAGE_STATUSES,
  COVERAGE_SCOPE_LABELS,
  PRICE_LABELS,
  PRICING_UNIT_LABELS,
} from '@/common/servicePackages'
import type { Tone } from '@/components/common/ui/badge'
import type { KV } from '@/components/common/ui/lists'
import {
  disasterTypesLabel,
  formatDurationMonths,
  formatPercent,
  isMaintenance,
  visitMonthsLabel,
} from '@/features/after-sales/afterSalesDisplay'
import type { PurchaseBlock } from '@/features/after-sales/panelCoverageRules'
import { priceSuffix } from '@/features/after-sales/packagePricing'
import { isApiError, messageForCode } from '@/services/api/errors'
import type { CoverageAllocationView, PanelAssetView } from '@/types/res/customerAfterSalesRes'
import { formatMoney } from '@/utils/format'

// Nhãn và câu của gói dịch vụ tính theo tấm pin: báo giá, hợp đồng, mua riêng, gia hạn, quản lý gói đi kèm

export const bundledKindLabel = (kind: string) => BUNDLED_KIND_LABELS[kind] ?? kind
export const pricingUnitLabel = (unit: string | null | undefined) =>
  PRICING_UNIT_LABELS[unit ?? 'PER_INSTALLATION_LEGACY'] ?? unit ?? '—'
export const priceLabel = (unit: string | null | undefined) => PRICE_LABELS[unit ?? 'PER_INSTALLATION_LEGACY'] ?? 'Giá'
export const coverageScopeLabel = (scope: string | null | undefined) =>
  COVERAGE_SCOPE_LABELS[scope ?? 'INSTALLATION'] ?? scope ?? '—'

/** "700.000 ₫/tấm pin", "2.000.000 ₫/hệ thống" */
export const formatUnitPrice = (amount: number | null | undefined, unit: string | null | undefined) =>
  amount == null ? '—' : `${formatMoney(amount, 'VND')}${priceSuffix(unit)}`

export function bundledStatusMeta(status: string, viewer: 'staff' | 'customer'): { label: string; tone: Tone } {
  const meta = BUNDLED_PACKAGE_STATUSES[status]
  if (!meta) return { label: status, tone: 'neutral' }
  return { label: meta.label, tone: viewer === 'staff' ? meta.staffTone : meta.customerTone }
}

type Benefits = {
  kind: string
  durationMonths: number
  visitMonths: number[]
  coveredDisasterTypes: string[]
  coveragePercent: number | null
  perIncidentLimit: number | null
  termLimit: number | null
}

/**
 * Quyền lợi của một gói (bản danh mục hoặc bản chụp trong báo giá / hợp đồng). Lượt bảo trì và hạn mức thiên tai là của cả kỳ,
 * không nhân với số tấm pin
 */
export function benefitFacts(p: Benefits): KV[] {
  const term: KV = { k: 'Thời hạn', v: formatDurationMonths(p.durationMonths) }
  if (isMaintenance(p.kind))
    return [
      term,
      {
        k: 'Lịch bảo trì mỗi kỳ',
        v: p.visitMonths.length > 0 ? `${p.visitMonths.length} lượt, vào ${visitMonthsLabel(p.visitMonths)}` : '—',
      },
    ]
  return [
    term,
    { k: 'Thiên tai được bảo vệ', v: disasterTypesLabel(p.coveredDisasterTypes) },
    { k: 'Tỷ lệ hỗ trợ', v: formatPercent(p.coveragePercent) },
    {
      k: 'Hạn mức mỗi sự cố, mỗi kỳ',
      v: `${formatMoney(p.perIncidentLimit, 'VND')}, ${formatMoney(p.termLimit, 'VND')}`,
    },
  ]
}

/** "JA Solar JAM72, S/N 12345, vị trí A-01"; lô: "JA Solar JAM72, lô 10 tấm, vị trí mái B" */
export function panelLabel(
  p: Pick<PanelAssetView, 'manufacturer' | 'model' | 'serialNumber' | 'isLot' | 'quantity' | 'positionCode'>,
) {
  const name = [p.manufacturer, p.model].filter(Boolean).join(' ') || 'Tấm pin'
  const identity = p.isLot || !p.serialNumber ? `lô ${p.quantity} tấm, không ghi serial` : `S/N ${p.serialNumber}`
  return [name, identity, p.positionCode && `vị trí ${p.positionCode}`].filter(Boolean).join(', ')
}

/** Tấm pin được một kỳ PANEL bảo vệ */
export function coveredPanelLabel(a: CoverageAllocationView) {
  const name = [a.manufacturer, a.model].filter(Boolean).join(' ') || 'Tấm pin'
  const identity = a.isLot || !a.serialNumber ? `${a.unitCount} tấm của lô` : `S/N ${a.serialNumber}`
  return `${name}, ${identity}`
}

/** Câu cho việc chưa mua được gói loại này (cờ backend trả, xem panelCoverageRules.purchaseBlock) */
export function purchaseBlockText(block: PurchaseBlock, kind: string) {
  const label = bundledKindLabel(kind).toLowerCase()
  switch (block) {
    case 'not-paid':
      return 'Hợp đồng lắp đặt cần được thanh toán đủ trước khi mua gói theo tấm pin.'
    case 'not-handed-over':
      return 'Hệ thống chưa hoàn tất bàn giao. Gói theo tấm pin mua sau khi công trình đã bàn giao.'
    case 'cancelled':
      return 'Công trình đã huỷ nên không mua gói được.'
    case 'no-panels':
      return 'Công trình chưa có tấm pin nào đang hoạt động trong sổ thiết bị đã lắp.'
    case 'kind-blocked':
      return `Chưa mua thêm được ${label} lúc này: công trình đang có ${label} áp dụng cho toàn bộ hệ thống, hoặc ${label} đi kèm hợp đồng đang chờ đối soát.`
    case 'sold-out':
      return `Mọi tấm pin của công trình đã có ${label} trong thời gian này.`
  }
}

/**
 * Lý do backend ghi (tiếng Anh) khi yêu cầu hỗ trợ thiên tai NOT_ELIGIBLE vì gói theo tấm pin (ServiceCustomerHandlers.NewClaimAsync).
 * Không nhận ra thì null để nơi gọi dùng câu sẵn có
 */
export function claimReasonText(reason: string | null | undefined): string | null {
  if (!reason) return null
  if (/identify the damaged panel/i.test(reason))
    return 'Công trình được bảo vệ theo từng tấm pin nhưng yêu cầu chưa chỉ ra tấm pin bị hư hại, nên không xét được hỗ trợ.'
  if (/damaged panel is not covered/i.test(reason))
    return 'Tấm pin bị hư hại không nằm trong gói bảo vệ thiên tai nào vào thời điểm xảy ra sự cố.'
  if (/No disaster-protection term covered the incident date/i.test(reason))
    return 'Không có gói bảo vệ thiên tai nào còn hiệu lực vào thời điểm xảy ra sự cố.'
  return null
}

// Câu riêng của luồng mua theo tấm pin, rõ hơn câu chung trong bảng lỗi
const PANEL_ERROR_OVERRIDES: Record<string, string> = {
  SERVICE_SUBSCRIPTION_OVERLAP:
    'Tấm pin đã có hoặc đang được giữ chỗ bởi gói dịch vụ cùng loại trong thời gian tương ứng. Danh sách tấm pin đã được tải lại.',
  AFTER_SALES_NOT_HANDED_OVER: 'Hệ thống chưa hoàn tất bàn giao.',
  AFTER_SALES_INVALID_STATE:
    'Trạng thái hiện tại không cho phép thực hiện thao tác: hợp đồng chưa thanh toán đủ, hoặc kỳ gia hạn không còn hiệu lực.',
  SERVICE_PANEL_SELECTION_VALIDATION_FAILED:
    'Danh sách hoặc số lượng tấm pin đã chọn không hợp lệ. Danh sách tấm pin đã được tải lại, kiểm tra rồi chọn lại.',
}

export function panelPurchaseErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 429)
      return error.retryAfter
        ? `Bạn thao tác quá nhanh. Thử lại sau ${error.retryAfter} giây.`
        : 'Bạn thao tác quá nhanh. Chờ một lát rồi thử lại.'
    return (error.code && PANEL_ERROR_OVERRIDES[error.code]) ?? messageForCode(error.code) ?? error.message
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.'
}
