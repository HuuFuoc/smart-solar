import { PRODUCT_STATUSES, SOLAR_PANEL_TYPE } from '@/common/product'
import type { Tone } from '@/components/common/ui/badge'
import type { ProductListParams, ProductSortBy, ProductSortDirection } from '@/services/productService'
import type { ProductResponse } from '@/types/res/adminProductsRes'

/*
 * Cách hiển thị một ProductResponse, dùng chung cho trang admin và trang sản phẩm công khai.
 * Enum (trạng thái, mã tấm pin, tuỳ chọn sắp xếp) ở common/product.ts.
 */

/** Danh sách tấm pin cho mô phỏng và cảnh báo thiếu thông số ở admin: cùng tham số nên dùng chung một cache. */
export const SOLAR_PANEL_QUERY = {
  ProductType: SOLAR_PANEL_TYPE,
  PageSize: 100,
  SortBy: 'ratedPowerW',
  SortDirection: 'desc',
} as const satisfies ProductListParams

export function isSolarPanelType(productType: string | null | undefined) {
  return productType?.trim().toUpperCase() === SOLAR_PANEL_TYPE
}

/** Tên loại cho khách và sales: mã SOLAR_PANEL đọc thành "Tấm pin"; loại khác là chữ tự do nên giữ nguyên. Admin vẫn thấy mã gốc. */
export function productTypeLabel(productType: string | null | undefined) {
  if (!productType?.trim()) return null
  return isSolarPanelType(productType) ? 'Tấm pin' : productType
}

export function isProductActive(status: string | null | undefined) {
  return status?.trim().toUpperCase() === 'ACTIVE'
}

export function productStatusMeta(status: string | null | undefined): { label: string; tone: Tone } {
  const found = PRODUCT_STATUSES.find((s) => s.value === status?.trim().toUpperCase())
  if (found) return found
  return { label: status?.trim() || 'Chưa đặt trạng thái', tone: 'warn' }
}

/**
 * Thông số tấm pin còn thiếu (công suất, kích thước). Backend bắt buộc chúng khi tạo/sửa loại SOLAR_PANEL,
 * nhưng dữ liệu cũ vẫn có thể thiếu; tấm thiếu thì mô phỏng bố trí không dùng được nên phải lộ ra ở admin.
 */
export function panelSpecGaps(product: Pick<ProductResponse, 'productType' | 'ratedPowerW' | 'widthMm' | 'heightMm'>) {
  if (!isSolarPanelType(product.productType)) return { power: false, size: false }
  return {
    power: !(Number(product.ratedPowerW) > 0),
    size: !(Number(product.widthMm) > 0) || !(Number(product.heightMm) > 0),
  }
}

/** Tách value của PRODUCT_SORT_OPTIONS ("SortBy:SortDirection") thành tham số query. */
export function parseSort(value: string): { SortBy: ProductSortBy; SortDirection: ProductSortDirection } {
  const [by, dir] = value.split(':') as [ProductSortBy, ProductSortDirection]
  return { SortBy: by, SortDirection: dir }
}

/** Công suất định mức: 400 W, 5,5 kW. */
export function formatPower(watt: number | null | undefined) {
  if (watt == null) return null
  if (watt >= 1000) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(watt / 1000)} kW`
  return `${new Intl.NumberFormat('vi-VN').format(watt)} W`
}

/** Kích thước rộng × cao (mm). */
export function formatSize(product: Pick<ProductResponse, 'widthMm' | 'heightMm'>) {
  if (product.widthMm == null || product.heightMm == null) return null
  const n = new Intl.NumberFormat('vi-VN')
  return `${n.format(product.widthMm)} × ${n.format(product.heightMm)} mm`
}

/** Bảo hành theo tháng; tròn năm thì đổi sang năm. */
export function formatWarranty(months: number | null | undefined) {
  if (months == null) return null
  if (months === 0) return 'Không bảo hành'
  return months % 12 === 0 ? `${months / 12} năm` : `${months} tháng`
}

/*
 * Swagger không khai kiểu của `spec` (schema rỗng). Chuỗi thì in thẳng; object thì trải
 * thành các cặp "khoá: giá trị"; dạng khác bỏ qua.
 */
export function specEntries(spec: unknown): { key: string; value: string }[] {
  if (spec == null) return []
  if (typeof spec === 'string') {
    const text = spec.trim()
    if (!text) return []
    try {
      return specEntries(JSON.parse(text) as unknown)
    } catch {
      return [{ key: '', value: text }]
    }
  }
  if (typeof spec === 'object' && !Array.isArray(spec)) {
    return Object.entries(spec as Record<string, unknown>)
      .filter(([, value]) => value != null && value !== '')
      .map(([key, value]) => ({ key, value: typeof value === 'object' ? JSON.stringify(value) : String(value) }))
  }
  return [{ key: '', value: String(spec) }]
}

/** `spec` về dạng chuỗi để đặt vào ô nhập của form admin. */
export function specToText(spec: unknown) {
  if (spec == null) return ''
  return typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2)
}
