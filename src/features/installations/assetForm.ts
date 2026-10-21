import { ASSET_TYPES } from '@/common/installation'
import type { AssetRequest } from '@/types/req/technicianInstallationsReq'
import type { AssetView } from '@/types/res/customerInstallationsRes'

// Ô nhập thiết bị đã lắp. Luật kiểm tra bám RegisterAssetsAsync của backend: loại trong danh sách, hãng / model / serial
// bắt buộc tối đa 100 ký tự, vị trí tối đa 50, bảo hành 0–600 tháng, 1–500 thiết bị mỗi lần,
// serial không trùng trong cùng một hãng (không phân biệt hoa thường, kể cả thiết bị đã lưu)

export const ASSET_LIMITS = { text: 100, position: 50, warrantyMonths: 600, perRequest: 500 } as const

export type AssetRow = {
  key: number
  assetType: string
  manufacturer: string
  model: string
  serialNumber: string
  positionCode: string
  /** Chuỗi trong ô; trống là chưa khai */
  warrantyMonths: string
}

export type AssetField = Exclude<keyof AssetRow, 'key'>
export type AssetRowErrors = Partial<Record<AssetField, string>>

let lastKey = 0

/** Dòng mới chép loại, hãng, model, bảo hành của dòng trước vì một công trình thường lắp nhiều thiết bị giống nhau */
export function newAssetRow(from?: AssetRow): AssetRow {
  lastKey += 1
  return {
    key: lastKey,
    assetType: from?.assetType ?? 'PANEL',
    manufacturer: from?.manufacturer ?? '',
    model: from?.model ?? '',
    serialNumber: '',
    positionCode: '',
    warrantyMonths: from?.warrantyMonths ?? '',
  }
}

const serialKey = (manufacturer: string, serial: string) =>
  `${manufacturer.trim().toUpperCase()}\u0000${serial.trim().toUpperCase()}`

function required(value: string, empty: string) {
  const text = value.trim()
  if (!text) return empty
  if (text.length > ASSET_LIMITS.text) return `Tối đa ${ASSET_LIMITS.text} ký tự.`
  return undefined
}

/** Lỗi của từng dòng, cùng thứ tự với `rows` */
export function validateAssetRows(rows: AssetRow[], saved: AssetView[]): AssetRowErrors[] {
  const savedKeys = new Set(saved.map((a) => serialKey(a.manufacturer, a.serialNumber)))
  const firstRow = new Map<string, number>()
  return rows.map((row, i) => {
    const errors: AssetRowErrors = {}
    if (!(row.assetType in ASSET_TYPES)) errors.assetType = 'Chọn loại thiết bị.'
    errors.manufacturer = required(row.manufacturer, 'Nhập hãng.')
    errors.model = required(row.model, 'Nhập model.')
    errors.serialNumber = required(row.serialNumber, 'Nhập số serial.')
    if (!errors.serialNumber && !errors.manufacturer) {
      const key = serialKey(row.manufacturer, row.serialNumber)
      if (savedKeys.has(key)) errors.serialNumber = 'Serial này đã được ghi cho công trình.'
      else if (firstRow.has(key)) errors.serialNumber = `Trùng serial với dòng ${firstRow.get(key)! + 1}.`
      else firstRow.set(key, i)
    }
    if (row.positionCode.trim().length > ASSET_LIMITS.position)
      errors.positionCode = `Tối đa ${ASSET_LIMITS.position} ký tự.`
    const warranty = row.warrantyMonths.trim()
    if (warranty && !(/^\d+$/.test(warranty) && Number(warranty) <= ASSET_LIMITS.warrantyMonths))
      errors.warrantyMonths = `Nhập số tháng từ 0 đến ${ASSET_LIMITS.warrantyMonths}.`
    for (const field of Object.keys(errors) as AssetField[]) if (!errors[field]) delete errors[field]
    return errors
  })
}

export const hasErrors = (errors: AssetRowErrors[]) => errors.some((e) => Object.keys(e).length > 0)

// Không có quy ước nối loại thiết bị với loại sản phẩm trong danh mục nên không gửi productId
export function toAssetRequests(rows: AssetRow[]): AssetRequest[] {
  return rows.map((row) => ({
    assetType: row.assetType,
    productId: null,
    manufacturer: row.manufacturer.trim(),
    model: row.model.trim(),
    serialNumber: row.serialNumber.trim(),
    positionCode: row.positionCode.trim() || null,
    warrantyMonths: row.warrantyMonths.trim() ? Number(row.warrantyMonths.trim()) : null,
  }))
}
