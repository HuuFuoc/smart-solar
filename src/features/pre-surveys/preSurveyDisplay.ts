import { CUSTOMER_TYPES, DIRECTIONS, SURFACE_TYPES, SURVEY_REQUEST_STATUSES } from '@/common/preSurvey'
import type { Tone } from '@/components/common/ui/badge'
import type { SurveyRequestStatus } from '@/types/res/surveyRequestsRes'

/** Ví dụ 185 độ là "Nam" */
export function directionLabel(degree: number | null | undefined) {
  if (degree == null) return '—'
  const normalized = ((degree % 360) + 360) % 360
  return DIRECTIONS[Math.round(normalized / 45) % 8]!
}

/** Giá trị chưa có trong bảng nhãn thì in nguyên số, không đoán nghĩa */
function unknownTypeLabel(value: number | null | undefined) {
  if (value == null) return '—'
  return `Loại ${value}`
}

export function customerTypeLabel(value: number | null | undefined) {
  const known = CUSTOMER_TYPES.find((type) => type.value === value)
  return known ? known.label : unknownTypeLabel(value)
}

export function surfaceTypeLabel(value: number | null | undefined) {
  const known = SURFACE_TYPES.find((type) => type.value === value)
  return known ? known.label : unknownTypeLabel(value)
}

/** (0, 0) là giá trị mặc định khi bỏ trống, không phải vị trí thật */
export function hasCoordinates(latitude: number | null | undefined, longitude: number | null | undefined) {
  return latitude != null && longitude != null && !(latitude === 0 && longitude === 0)
}

// Khung toạ độ gần đúng của TP.HCM (gồm đất liền và Côn Đảo), chỉ dùng để cảnh báo nhập nhầm
const HCM_BOXES = [
  { latMin: 10.3, latMax: 11.6, lonMin: 106.3, lonMax: 107.65 },
  { latMin: 8.5, latMax: 8.9, lonMin: 106.4, lonMax: 106.8 },
]

export function isInHcm(latitude: number, longitude: number) {
  return HCM_BOXES.some((box) => {
    const latitudeInside = latitude >= box.latMin && latitude <= box.latMax
    const longitudeInside = longitude >= box.lonMin && longitude <= box.lonMax
    return latitudeInside && longitudeInside
  })
}

/** Dùng dấu chấm như Google Maps, tránh nhầm với dấu phẩy ngăn cách */
export function formatCoordinates(latitude: number, longitude: number) {
  // Tối đa 5 chữ số lẻ (chính xác tới khoảng 1 m), bỏ số 0 thừa ở cuối
  const shorten = (value: number) => String(Number(value.toFixed(5)))
  return `${shorten(latitude)}, ${shorten(longitude)}`
}

export function mapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

/** Tìm công trình trên Google Maps theo địa chỉ. Toạ độ đã lưu chỉ là điểm giữa phường, xã nên không dùng để chỉ đường */
export function addressMapUrl(address: string) {
  return address === '—' ? null : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

/** Chưa có kỹ thuật viên xác nhận lịch khảo sát */
export function needsScheduling(status: number | null | undefined) {
  return status === 1 || status === 2 || status === 3
}

export function surveyStatusMeta(status: number | null | undefined): { label: string; tone: Tone } {
  const known = SURVEY_REQUEST_STATUSES[status as SurveyRequestStatus]
  if (known) return known
  // Trạng thái lạ thì in nguyên số
  const label = status == null ? '—' : `Trạng thái ${status}`
  return { label, tone: 'neutral' }
}

const decimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
// Luôn hiển thị theo giờ Việt Nam
const dateTime = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatArea(value: number | null | undefined) {
  return value == null ? '—' : `${decimal.format(value)} m²`
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : dateTime.format(date)
}

const relative = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' })
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "vừa xong", "35 phút trước", "hôm qua"...; quá 30 ngày thì in ngày giờ */
export function formatRelative(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return '—'
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return '—'
  const diff = time - now
  const distance = Math.abs(diff)
  if (distance < MINUTE) return 'vừa xong'
  if (distance >= 30 * DAY) return formatDateTime(iso)

  let text: string
  if (distance < HOUR) text = relative.format(Math.round(diff / MINUTE), 'minute')
  else if (distance < DAY) text = relative.format(Math.round(diff / HOUR), 'hour')
  else text = relative.format(Math.round(diff / DAY), 'day')
  // Intl viết hoa "Hôm qua", đổi về chữ thường vì câu hiển thị luôn đặt nó sau một động từ
  return text.charAt(0).toLowerCase() + text.slice(1)
}

export function isOverdue(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return false
  const time = new Date(iso).getTime()
  return !Number.isNaN(time) && now - time > DAY
}

export function formatAddress(parts: {
  streetLine?: string | null
  ward?: string | null
  district?: string | null
  province?: string | null
}) {
  const text = [parts.streetLine, parts.ward, parts.district, parts.province]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ')
  return text || '—'
}

/** 8 ký tự đầu của GUID, dễ đọc qua điện thoại */
export function shortCode(id: string | null | undefined) {
  return id ? id.slice(0, 8).toUpperCase() : '—'
}
