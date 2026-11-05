import type { Tone } from '@/components/common/ui/badge'
import type { ProductSortBy, ProductSortDirection } from '@/services/productService'

// Swagger khai `status` là chuỗi tự do, backend chỉ nhận ACTIVE hoặc INACTIVE. Giá trị lạ thì in nguyên văn
export const PRODUCT_STATUSES = [
  { value: 'ACTIVE', label: 'Đang bán', tone: 'ok' },
  { value: 'INACTIVE', label: 'Ngừng bán', tone: 'neutral' },
] as const satisfies readonly { value: string; label: string; tone: Tone }[]

export type ProductStatus = (typeof PRODUCT_STATUSES)[number]['value']

// Loại sản phẩm là chữ tự do. Các mã dưới đây backend có luật riêng: SOLAR_PANEL bắt buộc công suất và kích thước,
// INVERTER kiểm tra thông số trong `spec`, ba loại dịch vụ dùng để tính giá dịch vụ khi lập báo giá lắp đặt
export const SOLAR_PANEL_TYPE = 'SOLAR_PANEL'
export const INVERTER_TYPE = 'INVERTER'
export const PRODUCT_TYPES = [
  { value: SOLAR_PANEL_TYPE, label: 'Tấm pin' },
  { value: INVERTER_TYPE, label: 'Inverter' },
  { value: 'INSTALLATION_LABOR', label: 'Nhân công lắp đặt' },
  { value: 'TRANSPORT', label: 'Vận chuyển' },
  { value: 'OTHER_SERVICE', label: 'Dịch vụ khác' },
] as const

/** Lọc danh sách quản lý theo trạng thái (GET /api/admin/products, mặc định ALL) */
export const PRODUCT_STATUS_FILTERS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Đang bán' },
  { value: 'INACTIVE', label: 'Ngừng bán' },
] as const

export type ProductStatusFilter = (typeof PRODUCT_STATUS_FILTERS)[number]['value']

// Thông số inverter backend kiểm tra trong `spec`: có thì phải là số dương, MPPT là số nguyên, hiệu suất tối đa 100
export const INVERTER_SPEC_FIELDS = [
  { key: 'ratedAcPowerW', label: 'Công suất AC định mức', unit: 'W', integer: false, max: null },
  { key: 'maxDcInputPowerW', label: 'Công suất DC vào tối đa', unit: 'W', integer: false, max: null },
  { key: 'maxDcVoltageV', label: 'Điện áp DC tối đa', unit: 'V', integer: false, max: null },
  { key: 'mpptCount', label: 'Số MPPT', unit: null, integer: true, max: null },
  { key: 'efficiencyPercent', label: 'Hiệu suất', unit: '%', integer: false, max: 100 },
] as const

export type InverterNumberKey = (typeof INVERTER_SPEC_FIELDS)[number]['key']

export const INVERTER_PHASES = [
  { value: 'SINGLE_PHASE', label: '1 pha' },
  { value: 'THREE_PHASE', label: '3 pha' },
] as const

/** Tuỳ chọn sắp xếp, value là "SortBy:SortDirection" theo giá trị backend nhận */
export const PRODUCT_SORT_OPTIONS: { value: `${ProductSortBy}:${ProductSortDirection}`; label: string }[] = [
  { value: 'createdAt:desc', label: 'Mới thêm gần đây' },
  { value: 'name:asc', label: 'Tên A–Z' },
  { value: 'unitPrice:asc', label: 'Giá thấp đến cao' },
  { value: 'unitPrice:desc', label: 'Giá cao đến thấp' },
  { value: 'ratedPowerW:desc', label: 'Công suất lớn nhất' },
  { value: 'brand:asc', label: 'Hãng A–Z' },
]
