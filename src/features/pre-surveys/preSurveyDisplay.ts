import { CUSTOMER_TYPES, DIRECTIONS, SURFACE_TYPES, SURVEY_REQUEST_STATUSES } from '@/common/preSurvey'
import type { Tone } from '@/components/common/ui/badge'
import type { SurveyRequestStatus } from '@/types/res/surveyRequestsRes'

/** Ví dụ 185 độ là "Nam" */
export function directionLabel(degree: number | null | undefined) {
  if (degree == null) return '—'
  const normalized = ((degree % 360) + 360) % 360
  return DIRECTIONS[Math.round(normalized / 45) % 8]!
}

export function customerTypeLabel(value: number | null | undefined) {
  return CUSTOMER_TYPES.find((t) => t.value === value)?.label ?? (value == null ? '—' : `Loại ${value}`)
}

export function surfaceTypeLabel(value: number | null | undefined) {
  return SURFACE_TYPES.find((t) => t.value === value)?.label ?? (value == null ? '—' : `Loại ${value}`)
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
  return HCM_BOXES.some(
    (b) => latitude >= b.latMin && latitude <= b.latMax && longitude >= b.lonMin && longitude <= b.lonMax,
  )
}

export const HCM_COORDINATE_HINT = 'vĩ độ (số đầu) khoảng 10.3 đến 11.6, kinh độ (số sau) khoảng 106.3 đến 107.6'

/** Dùng dấu chấm như Google Maps, tránh nhầm với dấu phẩy ngăn cách */
export function formatCoordinates(latitude: number, longitude: number) {
  const part = (v: number) => String(Number(v.toFixed(5)))
  return `${part(latitude)}, ${part(longitude)}`
}

export function mapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

/** Đã nhận nhưng chưa phân công kỹ thuật viên */
export function needsScheduling(status: number | null | undefined) {
  return status === 2 || status === 3
}

export function surveyStatusMeta(status: number | null | undefined): { label: string; tone: Tone } {
  return (
    SURVEY_REQUEST_STATUSES[status as SurveyRequestStatus] ?? {
      label: status == null ? '—' : `Trạng thái ${status}`,
      tone: 'neutral',
    }
  )
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
  const abs = Math.abs(diff)
  let text: string
  if (abs < MINUTE) text = 'vừa xong'
  else if (abs < HOUR) text = relative.format(Math.round(diff / MINUTE), 'minute')
  else if (abs < DAY) text = relative.format(Math.round(diff / HOUR), 'hour')
  else if (abs < 30 * DAY) text = relative.format(Math.round(diff / DAY), 'day')
  else return formatDateTime(iso)
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
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(', ')
  return text || '—'
}

/** 8 ký tự đầu của GUID, dễ đọc qua điện thoại */
export function shortCode(id: string | null | undefined) {
  return id ? id.slice(0, 8).toUpperCase() : '—'
}
