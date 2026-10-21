import type { Tone } from '@/components/common/ui/badge'
import type { ProductSortBy, ProductSortDirection } from '@/services/productService'

// Swagger khai `status` là chuỗi tự do, backend chỉ nhận ACTIVE hoặc INACTIVE. Giá trị lạ thì in nguyên văn
export const PRODUCT_STATUSES = [
  { value: 'ACTIVE', label: 'Đang bán', tone: 'ok' },
  { value: 'INACTIVE', label: 'Ngừng bán', tone: 'neutral' },
] as const satisfies readonly { value: string; label: string; tone: Tone }[]

export type ProductStatus = (typeof PRODUCT_STATUSES)[number]['value']

// Loại sản phẩm là chữ tự do, riêng SOLAR_PANEL bị backend kiểm tra thêm công suất và kích thước
export const SOLAR_PANEL_TYPE = 'SOLAR_PANEL'

/** Tuỳ chọn sắp xếp, value là "SortBy:SortDirection" theo giá trị backend nhận */
export const PRODUCT_SORT_OPTIONS: { value: `${ProductSortBy}:${ProductSortDirection}`; label: string }[] = [
  { value: 'createdAt:desc', label: 'Mới thêm gần đây' },
  { value: 'name:asc', label: 'Tên A–Z' },
  { value: 'unitPrice:asc', label: 'Giá thấp đến cao' },
  { value: 'unitPrice:desc', label: 'Giá cao đến thấp' },
  { value: 'ratedPowerW:desc', label: 'Công suất lớn nhất' },
  { value: 'brand:asc', label: 'Hãng A–Z' },
]
