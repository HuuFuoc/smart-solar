import { CUSTOMER_TYPES, DIRECTIONS, SURFACE_TYPES, SURVEY_REQUEST_STATUSES } from '@/common/preSurvey'
import type { Tone } from '@/components/common/ui/badge'
import type { SurveyRequestStatus } from '@/types/res/surveyRequestsRes'

/*
 * Nhãn và định dạng dùng chung cho màn đánh giá của khách hàng và màn yêu cầu khảo sát của sales.
 * Bảng enum (loại khách, mặt lắp, hướng, trạng thái yêu cầu) ở common/preSurvey.ts.
 */

/** 185 → "Nam"; dùng hướng gần nhất trong 8 hướng. */
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

/**
 * Có toạ độ dùng được không. (0, 0) nằm giữa vịnh Guinea: đó là giá trị mặc định khi khách bỏ trống,
 * không phải vị trí thật (dữ liệu thật 08/10/2026 có một yêu cầu như vậy).
 */
export function hasCoordinates(latitude: number | null | undefined, longitude: number | null | undefined) {
  return latitude != null && longitude != null && !(latitude === 0 && longitude === 0)
}

/*
  Dự án chỉ nhận công trình ở TP.HCM (người dùng 10/10/2026). Khung toạ độ thô của TP.HCM sau sáp nhập 01/07/2025 (gồm
  Bình Dương, Bà Rịa – Vũng Tàu cũ): đất liền và đặc khu Côn Đảo. Chỉ để cảnh báo toạ độ nhập nhầm (đảo hai số, sai dấu,
  lệch hẳn nơi khác: một bản nháp thật ra khí hậu Nam Cực), không thay được ranh giới hành chính.
*/
const HCM_BOXES = [
  { latMin: 10.3, latMax: 11.6, lonMin: 106.3, lonMax: 107.65 },
  { latMin: 8.5, latMax: 8.9, lonMin: 106.4, lonMax: 106.8 },
]

export function isInHcm(latitude: number, longitude: number) {
  return HCM_BOXES.some((b) => latitude >= b.latMin && latitude <= b.latMax && longitude >= b.lonMin && longitude <= b.lonMax)
}

/** Câu hướng dẫn khi toạ độ nằm ngoài TP.HCM: số viết kiểu Google Maps (dấu chấm) như khách chép vào ô. */
export const HCM_COORDINATE_HINT = 'vĩ độ (số đầu) khoảng 10.3 đến 11.6, kinh độ (số sau) khoảng 106.3 đến 107.6'

/** Toạ độ viết như Google Maps ("10.9036, 106.7686"): kiểu số Việt "10,9, 106,7" đọc nhầm dấu phẩy ngăn cách. */
export function formatCoordinates(latitude: number, longitude: number) {
  const part = (v: number) => String(Number(v.toFixed(5)))
  return `${part(latitude)}, ${part(longitude)}`
}

export function mapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

/** Đã nhận nhưng chưa chốt lịch (chưa phân công kỹ thuật viên): việc tiếp theo của sales là phân công, hoặc nhắc khách đặt giờ. */
export function needsScheduling(status: number | null | undefined) {
  return status === 2 || status === 3
}

export function surveyStatusMeta(status: number | null | undefined): { label: string; tone: Tone } {
  return SURVEY_REQUEST_STATUSES[status as SurveyRequestStatus] ??{ label: status == null ? '—' : `Trạng thái ${status}`, tone: 'neutral' }
}

const decimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
/* Giờ nghiệp vụ là giờ Việt Nam, không theo múi giờ của máy đang xem (tài liệu bàn giao BE 12/10/2026, mục 15). */
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

/** "vừa xong", "35 phút trước", "2 giờ trước", "hôm qua"; quá 30 ngày thì in ngày giờ. */
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
  // Intl viết hoa "Hôm qua"; câu hiển thị luôn đặt nó sau một động từ.
  return text.charAt(0).toLowerCase() + text.slice(1)
}

/** Yêu cầu chờ quá một ngày chưa ai nhận thì cần chú ý. */
export function isOverdue(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return false
  const time = new Date(iso).getTime()
  return !Number.isNaN(time) && now - time > DAY
}

/** "12 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh" – bỏ phần trống. */
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

/** Mã ngắn để đọc qua điện thoại: 8 ký tự đầu của GUID, viết hoa. */
export function shortCode(id: string | null | undefined) {
  return id ? id.slice(0, 8).toUpperCase() : '—'
}
