// Bảng vật tư và dịch vụ của biên bản khảo sát, bám OnSiteSurveyHandlers của backend: lưu nháp kiểm số lượng và trùng
// sản phẩm, hoàn thành thì kiểm thêm với danh mục (đang bán, đúng loại, đơn vị đếm phải là số nguyên).
// Báo giá tự lập đọc bảng này: không có thiết bị nào thì kinh doanh phải lập tay.
// Không import giá trị qua "@/" để chạy được bằng node --test

export const BOM_LIMITS = { maxItems: 100, maxQuantity: 100_000, notesLength: 2000 } as const

export const SERVICE_PRODUCT_TYPES = ['INSTALLATION_LABOR', 'TRANSPORT', 'OTHER_SERVICE'] as const
/** Đơn vị đếm theo cái: số lượng phải là số nguyên */
const COUNTED_UNITS = ['PCS', 'PC', 'SET', 'UNIT', 'EA']

export const isServiceType = (productType: string | null | undefined) =>
  (SERVICE_PRODUCT_TYPES as readonly string[]).includes((productType ?? '').trim().toUpperCase())
export const isCountedUnit = (unit: string | null | undefined) =>
  COUNTED_UNITS.includes((unit ?? '').trim().toUpperCase())

export type BomList = 'materials' | 'serviceItems'
export type BomRow = { key: string; productId: string; quantity: string }
export type BomItem = { productId: string; quantity: number }
export type BillOfMaterials = {
  materials: BomItem[] | null
  serviceItems: BomItem[] | null
  installationNotes: string | null
}

/** Khoá lỗi trùng tên với khoá backend trả (`billOfMaterials.materials[0]`) để lỗi server rơi đúng dòng */
export const bomErrorKey = (list: BomList, index: number) => `billOfMaterials.${list}[${index}]`
export const BOM_ERROR_KEY = 'billOfMaterials'

let keySeed = 0
export function newBomRow(productId = '', quantity = ''): BomRow {
  keySeed += 1
  return { key: `b${keySeed}`, productId, quantity }
}

const quantityText = (n: number) => String(n).replace('.', ',')
export const rowsFromItems = (items: BomItem[] | null | undefined) =>
  (items ?? []).map((i) => newBomRow(i.productId, quantityText(i.quantity)))

/** Ô số nhận cả dấu phẩy; null khi trống, NaN khi gõ sai */
export function readQuantity(text: string) {
  const t = text.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '') return null
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN
}

/**
 * Thân `billOfMaterials` gửi lên. Backend giữ bảng cũ khi trường này null, nên biên bản đã có bảng mà xoá hết dòng thì
 * gửi bảng rỗng; chưa từng có bảng và chưa ghi gì thì null
 */
export function bomRequest(
  materials: BomRow[],
  serviceItems: BomRow[],
  notes: string,
  hadBom: boolean,
): BillOfMaterials | null {
  const items = (rows: BomRow[]) =>
    rows.filter((r) => r.productId).map((r) => ({ productId: r.productId, quantity: readQuantity(r.quantity) ?? 0 }))
  const m = items(materials)
  const s = items(serviceItems)
  const n = notes.trim() || null
  if (!hadBom && m.length === 0 && s.length === 0 && n === null) return null
  return { materials: m, serviceItems: s, installationNotes: n }
}

/** `units`: đơn vị theo mã sản phẩm, lấy từ danh mục; chưa tải được thì bỏ qua kiểm số nguyên */
export function bomErrors(
  materials: BomRow[],
  serviceItems: BomRow[],
  notes: string,
  units: Record<string, string | null | undefined> = {},
) {
  const errors: Record<string, string> = {}
  const seen = new Set<string>()
  const check = (list: BomList, rows: BomRow[]) =>
    rows.forEach((row, i) => {
      const key = bomErrorKey(list, i)
      if (!row.productId) return void (errors[key] = 'Chọn sản phẩm hoặc xoá dòng này.')
      if (seen.has(row.productId)) return void (errors[key] = 'Sản phẩm đã có ở dòng trên. Cộng số lượng vào dòng đó.')
      seen.add(row.productId)
      const q = readQuantity(row.quantity)
      if (q === null) return void (errors[key] = 'Nhập số lượng.')
      if (!Number.isFinite(q) || q <= 0 || q > BOM_LIMITS.maxQuantity)
        return void (errors[key] = `Số lượng từ trên 0 đến ${BOM_LIMITS.maxQuantity.toLocaleString('vi-VN')}.`)
      if (isCountedUnit(units[row.productId]) && !Number.isInteger(q))
        errors[key] = `Đếm theo ${units[row.productId]}: nhập số nguyên.`
    })
  check('materials', materials)
  check('serviceItems', serviceItems)
  if (materials.length + serviceItems.length > BOM_LIMITS.maxItems)
    errors[BOM_ERROR_KEY] = `Tối đa ${BOM_LIMITS.maxItems} dòng.`
  else if (notes.trim().length > BOM_LIMITS.notesLength)
    errors[BOM_ERROR_KEY] = `Ghi chú lắp đặt tối đa ${BOM_LIMITS.notesLength} ký tự.`
  return errors
}

/** Đơn vị theo mã sản phẩm, để kiểm số lượng nguyên */
export const unitsOf = (products: { id?: string; unit?: string | null }[] | null | undefined) =>
  Object.fromEntries((products ?? []).filter((p) => p.id).map((p) => [p.id!, p.unit]))

/** Mã lỗi backend có lỗi theo từng ô của form */
export const FIELD_ERROR_CODES = [
  'VALIDATION_FAILED',
  'ONSITE_SURVEY_INCOMPLETE',
  'ONSITE_SURVEY_BOM_VALIDATION_FAILED',
]

/** Cái báo giá tự lập cần mà bảng chưa có (backend vẫn lập, kèm vấn đề cho kinh doanh xem lại) */
export function bomGaps(
  materials: BomRow[],
  serviceItems: BomRow[],
  typeOf: (productId: string) => string | null | undefined,
) {
  const has = (rows: BomRow[], type: string) =>
    rows.some((r) => (typeOf(r.productId) ?? '').trim().toUpperCase() === type)
  const gaps: string[] = []
  if (!has(materials, 'SOLAR_PANEL')) gaps.push('tấm pin')
  if (!has(materials, 'INVERTER')) gaps.push('inverter')
  if (!has(serviceItems, 'INSTALLATION_LABOR')) gaps.push('nhân công lắp đặt')
  return gaps
}
