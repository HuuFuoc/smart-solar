// Chuẩn hoá địa chỉ gọi backend. Mọi endpoint nằm dưới /api
// Không bỏ "/" ở cuối đường dẫn: `${base}/${id}` với id rỗng phải lỗi 404, không thành endpoint danh sách

const ABSOLUTE = /^(https?:\/\/[^/?#]+)(.*)$/i
const HAS_API_SEGMENT = /(^|\/)api(\/|$)/i
const DEFAULT_BASE = '/api'

/**
 * Địa chỉ gốc của API:
 *   (không khai), '', '/', 'api', '/api/'      -> '/api'
 *   'https://host', 'https://host/'            -> 'https://host/api'
 *   'https://host/api/'                        -> 'https://host/api'
 *   '/backend'                                 -> '/backend/api'
 *   'https://host/api/v2'                      -> giữ nguyên
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

/** Đường dẫn tính từ /api: '/products', 'products', '/api/products' đều thành '/products'. Địa chỉ tuyệt đối giữ nguyên */
export function apiPath(url: string | undefined) {
  if (!url || /^https?:\/\//i.test(url)) return url
  const path = url.trim()
  const withSlash = path.startsWith('/') ? path : `/${path}`
  return withSlash.replace(/^\/api(?=\/|$)/i, '') || '/'
}
