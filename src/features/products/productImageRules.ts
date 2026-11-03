import type { ProductImageResponse } from '@/types/res/adminProductsRes'

// Luật ảnh sản phẩm, bám ProductImageRules / ProductImageHandlers của backend; backend vẫn kiểm lại (kể cả danh sách host
// được phép nếu có cấu hình). Không import giá trị qua "@/" để chạy được bằng node --test

export const PRODUCT_IMAGE_LIMITS = {
  urlMax: 1000,
  altMax: 255,
  /** Mặc định của backend (Catalog:MaxImagesPerProduct), có thể cấu hình khác */
  maxImages: 10,
} as const

/** Lỗi của link ảnh, undefined khi gửi được. Backend chỉ nhận link https tuyệt đối, không kèm tài khoản */
export function imageUrlError(text: string) {
  const url = text.trim()
  if (!url) return 'Nhập link ảnh.'
  if (url.length > PRODUCT_IMAGE_LIMITS.urlMax) return `Link tối đa ${PRODUCT_IMAGE_LIMITS.urlMax} ký tự.`
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return 'Link chưa đúng dạng, ví dụ https://example.com/anh.jpg.'
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname) return 'Chỉ nhận link bắt đầu bằng https://.'
  if (parsed.username || parsed.password) return 'Link không được chứa tên đăng nhập hoặc mật khẩu.'
  return undefined
}

export function altTextError(text: string) {
  return text.trim().length > PRODUCT_IMAGE_LIMITS.altMax
    ? `Mô tả ảnh tối đa ${PRODUCT_IMAGE_LIMITS.altMax} ký tự.`
    : undefined
}

/** Ảnh theo thứ tự hiển thị của backend */
export function sortImages(images: ProductImageResponse[] | null | undefined) {
  return [...(images ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

/** Thứ tự mới khi đưa ảnh ở `index` lên (-1) hoặc xuống (+1); ra ngoài danh sách thì giữ nguyên */
export function moveImage(ids: readonly string[], index: number, delta: -1 | 1) {
  const target = index + delta
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length) return [...ids]
  const next = [...ids]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}
