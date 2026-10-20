/*
 * Chuẩn hoá địa chỉ gọi backend. Mọi endpoint của backend nằm dưới /api (swagger), nên:
 * - địa chỉ gốc (VITE_API_BASE_URL) luôn có phần /api, dù khai thiếu /api hay thừa dấu /;
 * - đường dẫn trong service viết có hay không có /api, có hay không có dấu / đầu đều ra cùng một endpoint.
 * Không gộp "//" và không bỏ "/" ở cuối đường dẫn: `${base}/${id}` với id rỗng phải lỗi 404,
 * không được lặng lẽ thành endpoint danh sách.
 */

const ABSOLUTE = /^(https?:\/\/[^/?#]+)(.*)$/i
const HAS_API_SEGMENT = /(^|\/)api(\/|$)/i
const DEFAULT_BASE = '/api'

/**
 * Địa chỉ gốc của API:
 *   (không khai), '', '/', 'api', '/api/'      → '/api'
 *   'https://host', 'https://host/'            → 'https://host/api'
 *   'https://host/api/'                        → 'https://host/api'
 *   '/backend'                                 → '/backend/api'
 *   'https://host/api/v2'                      → giữ nguyên (đã có phần /api)
 */
export function apiBaseUrl(raw: string | undefined) {
  const value = raw?.trim() ?? ''
  if (!value) return DEFAULT_BASE
  const match = ABSOLUTE.exec(value)
  const origin = match?.[1] ?? ''
  let path = (match ? (match[2] ?? '') : value).replace(/\/+$/, '')
  if (path && !path.startsWith('/')) path = `/${path}`
  if (!HAS_API_SEGMENT.test(path)) path += DEFAULT_BASE
  return origin + path
}

/**
 * Đường dẫn endpoint, tính từ địa chỉ gốc (đã có /api):
 *   '/products', 'products', '/api/products'   → '/products'
 * Địa chỉ tuyệt đối (http://…) để nguyên: axios bỏ qua địa chỉ gốc với loại này.
 */
export function apiPath(url: string | undefined) {
  if (!url || /^https?:\/\//i.test(url)) return url
  const path = url.trim()
  const withSlash = path.startsWith('/') ? path : `/${path}`
  return withSlash.replace(/^\/api(?=\/|$)/i, '') || '/'
}
