// Sản phẩm đã ngừng bán từ trình duyệt này
// Backend ẩn sản phẩm INACTIVE khỏi mọi API đọc, nên phải lưu id + tên ở đây để còn "Mở bán lại"
// Bỏ file này khi backend có API liệt kê sản phẩm ngừng bán

const KEY = 'smartsolar.hidden-products'

export type HiddenProduct = { id: string; name: string; sku: string; hiddenAt: string }

function isHiddenProduct(value: unknown): value is HiddenProduct {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.sku === 'string' &&
    typeof v.hiddenAt === 'string'
  )
}

export function readHiddenProducts(): HiddenProduct[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isHiddenProduct) : []
  } catch {
    return []
  }
}

export function writeHiddenProducts(list: HiddenProduct[]) {
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list))
    else localStorage.removeItem(KEY)
  } catch {
    /* Trình duyệt chặn storage: vẫn ngừng bán được, chỉ không nhớ để mở bán lại. */
  }
}
