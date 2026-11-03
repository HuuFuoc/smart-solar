import {
  INVERTER_PHASES,
  INVERTER_SPEC_FIELDS,
  INVERTER_TYPE,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  SOLAR_PANEL_TYPE,
} from '@/common/product'
import type { Tone } from '@/components/common/ui/badge'
import { sortImages } from '@/features/products/productImageRules'
import type { ProductListParams, ProductSortBy, ProductSortDirection } from '@/services/productService'
import type { ProductImageResponse, ProductResponse } from '@/types/res/adminProductsRes'

/** Dùng chung một cache cho mô phỏng và admin */
export const SOLAR_PANEL_QUERY = {
  ProductType: SOLAR_PANEL_TYPE,
  PageSize: 100,
  SortBy: 'ratedPowerW',
  SortDirection: 'desc',
} as const satisfies ProductListParams

export function isSolarPanelType(productType: string | null | undefined) {
  return productType?.trim().toUpperCase() === SOLAR_PANEL_TYPE
}

export function isInverterType(productType: string | null | undefined) {
  return productType?.trim().toUpperCase() === INVERTER_TYPE
}

/** Loại có luật riêng hiện tên tiếng Việt (SOLAR_PANEL là "Tấm pin"), loại khác giữ nguyên */
export function productTypeLabel(productType: string | null | undefined) {
  if (!productType?.trim()) return null
  return PRODUCT_TYPES.find((t) => t.value === productType.trim().toUpperCase())?.label ?? productType
}

/** Ảnh theo thứ tự hiển thị. Sản phẩm chỉ có `imageUrl` (dữ liệu cũ) thì coi đó là ảnh chính duy nhất */
export function productImages(product: Pick<ProductResponse, 'images' | 'imageUrl'>): ProductImageResponse[] {
  const images = sortImages(product.images).filter((image) => image.url)
  if (images.length === 0 && product.imageUrl) return [{ url: product.imageUrl, isPrimary: true, sortOrder: 0 }]
  return images
}

/** Link ảnh chính cho thẻ và bảng */
export function primaryImageUrl(product: Pick<ProductResponse, 'images' | 'imageUrl'>) {
  const images = productImages(product)
  return (images.find((image) => image.isPrimary) ?? images[0])?.url ?? null
}

export function isProductActive(status: string | null | undefined) {
  return status?.trim().toUpperCase() === 'ACTIVE'
}

export function productStatusMeta(status: string | null | undefined): { label: string; tone: Tone } {
  const found = PRODUCT_STATUSES.find((s) => s.value === status?.trim().toUpperCase())
  if (found) return found
  return { label: status?.trim() || 'Chưa đặt trạng thái', tone: 'warn' }
}

/** Thông số tấm pin còn thiếu. Dữ liệu cũ có thể thiếu nên cần báo ở admin */
export function panelSpecGaps(product: Pick<ProductResponse, 'productType' | 'ratedPowerW' | 'widthMm' | 'heightMm'>) {
  if (!isSolarPanelType(product.productType)) return { power: false, size: false }
  return {
    power: !(Number(product.ratedPowerW) > 0),
    size: !(Number(product.widthMm) > 0) || !(Number(product.heightMm) > 0),
  }
}

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

/** Kích thước rộng x cao (mm). */
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

// `spec` không có kiểu: chuỗi thì in thẳng, object thì trải thành các cặp khoá: giá trị
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

const specNumber = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

/** Thông số để hiển thị: thông số inverter có tên tiếng Việt và đơn vị, khoá khác in nguyên */
export function specDisplayEntries(spec: unknown): { label: string; value: string }[] {
  return specEntries(spec).map(({ key, value }) => {
    const phase = key === 'phase' ? INVERTER_PHASES.find((p) => p.value === value) : undefined
    if (phase) return { label: 'Số pha', value: phase.label }
    const field = INVERTER_SPEC_FIELDS.find((f) => f.key === key)
    const number = Number(value)
    if (!field || !Number.isFinite(number)) return { label: key, value }
    const shown = specNumber.format(number)
    return {
      label: field.label,
      value: !field.unit ? shown : field.unit === '%' ? `${shown}%` : `${shown} ${field.unit}`,
    }
  })
}

/** `spec` về dạng chuỗi để đặt vào ô nhập của form admin. */
export function specToText(spec: unknown) {
  if (spec == null) return ''
  return typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2)
}
