import type { Tone } from '@/components/common/ui/badge'

// Gói dịch vụ tính theo tấm pin (backend 763cb0b, guides/per-panel-packages): gói đi kèm báo giá / hợp đồng lắp đặt và gói mua
// riêng sau bàn giao. Giá trị là chuỗi của backend; nhãn tiếng Việt cho mọi cổng

/** Thứ tự hai loại gói ở mọi khối (bảo trì trước, thiên tai sau) */
export const PACKAGE_KIND_ORDER = ['MAINTENANCE', 'DISASTER_PROTECTION'] as const

/** Tên loại gói trong báo giá, hợp đồng, thanh toán */
export const BUNDLED_KIND_LABELS: Record<string, string> = {
  MAINTENANCE: 'Gói bảo trì',
  DISASTER_PROTECTION: 'Gói bảo vệ thiên tai',
}

/** PackagePricingUnits. Gói tạo trước 25/11/2026 là PER_INSTALLATION_LEGACY; không đổi được sau khi tạo */
export const PRICING_UNITS = {
  perPanel: 'PER_PANEL',
  perInstallationLegacy: 'PER_INSTALLATION_LEGACY',
} as const

export const PRICING_UNIT_LABELS: Record<string, string> = {
  PER_PANEL: 'Theo tấm pin',
  PER_INSTALLATION_LEGACY: 'Theo hệ thống lắp đặt',
}

/** Nhãn ô giá theo đơn vị tính */
export const PRICE_LABELS: Record<string, string> = {
  PER_PANEL: 'Đơn giá (₫/tấm pin)',
  PER_INSTALLATION_LEGACY: 'Giá gói (₫/hệ thống)',
}

/** CoverageScopes của một kỳ gói đã mua */
export const COVERAGE_SCOPE_LABELS: Record<string, string> = {
  INSTALLATION: 'Toàn bộ công trình',
  PANEL: 'Theo tấm pin',
}

/**
 * ContractServicePackageStatuses: gói đi kèm hợp đồng. COMMITTED chưa cấp quyền lợi gì; PROVISIONED là đã tạo kỳ gói (kỳ đó có
 * trạng thái riêng); RECONCILIATION_REQUIRED là số tấm pin đã lắp khác số trong hợp đồng, nhân viên đối soát; DISCARDED là hợp đồng
 * huỷ trước khi trả 30%. Chờ đối soát là việc của quản lý (đỏ), phía khách chỉ là lưu ý
 */
export const BUNDLED_PACKAGE_STATUSES: Record<string, { label: string; staffTone: Tone; customerTone: Tone }> = {
  COMMITTED: { label: 'Đã ghi nhận trong hợp đồng', staffTone: 'info', customerTone: 'info' },
  PROVISIONED: { label: 'Đã tạo gói dịch vụ', staffTone: 'ok', customerTone: 'ok' },
  RECONCILIATION_REQUIRED: { label: 'Chờ đối soát', staffTone: 'danger', customerTone: 'warn' },
  DISCARDED: { label: 'Đã huỷ', staffTone: 'neutral', customerTone: 'neutral' },
}

/** Bộ lọc trạng thái của trang quản lý gói đi kèm hợp đồng, theo thứ tự hiện */
export const BUNDLED_PACKAGE_STATUS_ORDER = [
  'RECONCILIATION_REQUIRED',
  'COMMITTED',
  'PROVISIONED',
  'DISCARDED',
] as const

/**
 * FinanceOverviewView.collectedByComponent: tiền đã thu trong kỳ chia theo thành phần. Ba nhóm đầu cộng lại đúng bằng khoản 30% và
 * 70% đã thu (gói đi kèm nằm trong chính các khoản đó); hai nhóm mua riêng là tiền gói trả 100% trước, không thuộc khoản nào
 */
export const FINANCE_COMPONENT_LABELS: Record<string, string> = {
  INSTALLATION: 'Doanh thu lắp đặt',
  BUNDLED_MAINTENANCE_PACKAGES: 'Gói bảo trì đi kèm hợp đồng',
  BUNDLED_DISASTER_PROTECTION_PACKAGES: 'Gói bảo vệ thiên tai đi kèm hợp đồng',
  RETAIL_MAINTENANCE_PACKAGES: 'Gói bảo trì mua riêng',
  RETAIL_DISASTER_PROTECTION_PACKAGES: 'Gói bảo vệ thiên tai mua riêng',
}

export const FINANCE_COMPONENT_ORDER = [
  'INSTALLATION',
  'BUNDLED_MAINTENANCE_PACKAGES',
  'BUNDLED_DISASTER_PROTECTION_PACKAGES',
  'RETAIL_MAINTENANCE_PACKAGES',
  'RETAIL_DISASTER_PROTECTION_PACKAGES',
] as const

/** Câu thuế của gói đi kèm (backend: CATALOG_FINAL_PRICE_NO_QUOTATION_TAX; cách tính thuế còn chờ tài chính / pháp chế chốt) */
export const PACKAGE_TAX_NOTE = 'Giá gói = giá danh mục, không cộng thêm thuế báo giá.'
