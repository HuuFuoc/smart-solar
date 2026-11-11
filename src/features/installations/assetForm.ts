import { ASSET_TYPES } from '../../common/installation.ts'
import { INVERTER_TYPE, SOLAR_PANEL_TYPE } from '../../common/product.ts'
import type { AssetRequest } from '@/types/req/technicianInstallationsReq'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import type { AssetView, EquipmentDifference } from '@/types/res/customerInstallationsRes'

// Ô nhập thiết bị đã lắp (RegisterAssetsAsync): PANEL/INVERTER bắt buộc gắn productId danh mục; loại khác chọn sản phẩm
// không phải dịch vụ hoặc nhập tay (không bảo hành); serial không trùng cùng hãng. Không dùng "@/" để chạy node --test.

export const ASSET_LIMITS = { text: 100, position: 50, warrantyMonths: 600, perRequest: 500 } as const
export const MANUAL_PRODUCT_VALUE = '__manual__'
const SERVICE_PRODUCT_TYPES = new Set(['INSTALLATION_LABOR', 'TRANSPORT', 'OTHER_SERVICE'])

export type AssetRow = {
  key: number
  assetType: string
  productId: string | null
  manufacturer: string
  model: string
  serialNumber: string
  positionCode: string
  warrantyMonths: string
}

export type AssetField = 'assetType' | 'productId' | 'manufacturer' | 'model' | 'serialNumber' | 'positionCode' | 'warrantyMonths'
export type AssetRowErrors = Partial<Record<AssetField, string>>
export const assetFieldId = (row: Pick<AssetRow, 'key'>, field: AssetField) => `asset-${row.key}-${field}`

let lastKey = 0

export const requiresCatalogProduct = (assetType: string) => assetType === 'PANEL' || assetType === 'INVERTER'

export const isServiceProductType = (productType: string | null | undefined) =>
  SERVICE_PRODUCT_TYPES.has((productType ?? '').trim().toUpperCase())

export function assetMatchesProductType(assetType: string, productType: string | null | undefined) {
  const normalized = (productType ?? '').trim().toUpperCase()
  if (!normalized) return false
  if (assetType === 'PANEL') return normalized === SOLAR_PANEL_TYPE
  if (assetType === 'INVERTER') return normalized === INVERTER_TYPE
  return !isServiceProductType(normalized)
}

/** Lọc sản phẩm đang bán hợp lệ theo `assetType`, ưu tiên thiết bị trong hợp đồng lên đầu. */
export function filterProductsForAssetType(
  products: readonly ProductResponse[],
  assetType: string,
  differences: readonly EquipmentDifference[] = [],
) {
  const contractedIds = new Set(differences.filter((d) => d.contractedQuantity > 0).map((d) => d.productId))
  return products
    .filter(
      (p): p is ProductResponse & { id: string } =>
        Boolean(p.id) && (!p.status || p.status.trim().toUpperCase() === 'ACTIVE') && assetMatchesProductType(assetType, p.productType),
    )
    .sort((a, b) => {
      const rankDiff = (contractedIds.has(a.id) ? 0 : 1) - (contractedIds.has(b.id) ? 0 : 1)
      if (rankDiff !== 0) return rankDiff
      const labelOf = (p: ProductResponse) => (p.name ?? p.model ?? p.brand ?? p.sku ?? '').trim()
      return labelOf(a).localeCompare(labelOf(b), 'vi')
    })
}

export function productAssetMetadata(product: ProductResponse) {
  return {
    manufacturer: product.brand?.trim() || '',
    model: product.model?.trim() || product.name?.trim() || product.sku?.trim() || '',
    warrantyMonths: product.warrantyMonth != null ? String(product.warrantyMonth) : '',
  }
}

function formatCompactPower(watt: number | null | undefined) {
  if (watt == null || watt <= 0) return null
  if (watt >= 1000) {
    const kw = watt / 1000
    return `${Number.isInteger(kw) ? kw : kw.toFixed(1)} kW`
  }
  return `${watt} W`
}

/** Nhãn hiển thị ngắn gọn trong danh sách chọn sản phẩm. */
export function formatProductOptionLabel(product: ProductResponse, difference?: EquipmentDifference) {
  const name = product.name?.trim() || ''
  const brand = product.brand?.trim() || ''
  const model = product.model?.trim() || ''
  const title = name || [brand, model].filter(Boolean).join(' ') || product.sku?.trim() || product.id || ''
  const lower = title.toLowerCase()

  const parts = model && !lower.includes(model.toLowerCase()) ? [title, model] : [title]
  const extras: string[] = []
  if (brand && !lower.includes(brand.toLowerCase())) extras.push(brand)
  const power = formatCompactPower(product.ratedPowerW)
  if (power) extras.push(power)
  if (product.warrantyMonth != null) extras.push(`BH ${product.warrantyMonth}T`)

  const prefix = difference && difference.contractedQuantity > 0 ? '[Hợp đồng] ' : ''
  const suffix = extras.length > 0 ? ` (${extras.join(' · ')})` : ''
  return `${prefix}${parts.join(' · ')}${suffix}`
}

const clearProduct = (row: AssetRow, assetType = row.assetType): AssetRow => ({
  ...row,
  assetType,
  productId: null,
  manufacturer: '',
  model: '',
  warrantyMonths: '',
})

/** Dòng mới chép loại, sản phẩm, hãng, model, bảo hành của dòng trước để nhập hàng loạt nhanh hơn. */
export function newAssetRow(from?: AssetRow): AssetRow {
  lastKey += 1
  return {
    key: lastKey,
    assetType: from?.assetType ?? 'PANEL',
    productId: from?.productId ?? null,
    manufacturer: from?.manufacturer ?? '',
    model: from?.model ?? '',
    serialNumber: '',
    positionCode: '',
    warrantyMonths: from?.warrantyMonths ?? '',
  }
}

export function selectAssetProduct(row: AssetRow, value: string, products: readonly ProductResponse[]): AssetRow {
  if (value === MANUAL_PRODUCT_VALUE) {
    return !requiresCatalogProduct(row.assetType) && !row.productId ? row : clearProduct(row)
  }
  const product = value ? products.find((p) => p.id === value) : undefined
  if (!product || !assetMatchesProductType(row.assetType, product.productType)) return clearProduct(row)
  return { ...row, productId: value, ...productAssetMetadata(product) }
}

export function changeAssetType(row: AssetRow, nextType: string, products: readonly ProductResponse[]): AssetRow {
  if (nextType === row.assetType) return row
  if (row.productId) {
    const current = products.find((p) => p.id === row.productId)
    return current && assetMatchesProductType(nextType, current.productType)
      ? { ...row, assetType: nextType }
      : clearProduct(row, nextType)
  }
  return requiresCatalogProduct(nextType) ? clearProduct(row, nextType) : { ...row, assetType: nextType, warrantyMonths: '' }
}

const serialKey = (manufacturer: string, serial: string) =>
  `${manufacturer.trim().toUpperCase()}\u0000${serial.trim().toUpperCase()}`

function required(value: string, empty: string) {
  const text = value.trim()
  if (!text) return empty
  return text.length > ASSET_LIMITS.text ? `Tối đa ${ASSET_LIMITS.text} ký tự.` : undefined
}

/** Lỗi của từng dòng, cùng thứ tự với `rows`. */
export function validateAssetRows(rows: AssetRow[], saved: AssetView[]): AssetRowErrors[] {
  const savedKeys = new Set(saved.map((a) => serialKey(a.manufacturer, a.serialNumber)))
  const firstRow = new Map<string, number>()
  return rows.map((row, i) => {
    const errors: AssetRowErrors = {}
    const catalogRequired = requiresCatalogProduct(row.assetType)
    if (!(row.assetType in ASSET_TYPES)) errors.assetType = 'Chọn loại thiết bị.'
    if (catalogRequired && !row.productId)
      errors.productId = row.assetType === 'PANEL' ? 'Chọn tấm pin trong danh mục.' : 'Chọn inverter trong danh mục.'
    if (!catalogRequired || row.productId) {
      errors.manufacturer = required(row.manufacturer, 'Nhập hãng.')
      errors.model = required(row.model, 'Nhập model.')
    }
    errors.serialNumber = required(row.serialNumber, 'Nhập số serial.')
    if (!errors.serialNumber && row.manufacturer.trim()) {
      const key = serialKey(row.manufacturer, row.serialNumber)
      if (savedKeys.has(key)) errors.serialNumber = 'Serial này đã được ghi cho công trình.'
      else if (firstRow.has(key)) errors.serialNumber = `Trùng serial với dòng ${firstRow.get(key)! + 1}.`
      else firstRow.set(key, i)
    }
    if (row.positionCode.trim().length > ASSET_LIMITS.position) errors.positionCode = `Tối đa ${ASSET_LIMITS.position} ký tự.`
    const warranty = row.warrantyMonths.trim()
    if (row.productId && warranty && !(/^\d+$/.test(warranty) && Number(warranty) <= ASSET_LIMITS.warrantyMonths))
      errors.warrantyMonths = `Nhập số tháng từ 0 đến ${ASSET_LIMITS.warrantyMonths}.`
    else if (!row.productId && warranty) errors.warrantyMonths = 'Thiết bị ngoài danh mục không ghi thời hạn bảo hành.'

    for (const field of Object.keys(errors) as AssetField[]) if (!errors[field]) delete errors[field]
    return errors
  })
}

export const hasErrors = (errors: AssetRowErrors[]) => errors.some((e) => Object.keys(e).length > 0)

export function toAssetRequests(rows: AssetRow[]): AssetRequest[] {
  return rows.map((row) => ({
    assetType: row.assetType,
    productId: row.productId,
    manufacturer: row.manufacturer.trim(),
    model: row.model.trim(),
    serialNumber: row.serialNumber.trim(),
    positionCode: row.positionCode.trim() || null,
    warrantyMonths: row.productId && row.warrantyMonths.trim() ? Number(row.warrantyMonths.trim()) : null,
  }))
}
