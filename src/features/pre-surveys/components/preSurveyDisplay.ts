import type { Tone } from '@/components/common/ui/badge'
import type { CustomerType, InstallationSurfaceType } from '@/types/req/customersReq'
import type { SurveyRequestStatus } from '@/types/res/surveyRequestsRes'

/*
 * Nhãn và định dạng dùng chung cho màn đánh giá của khách hàng và màn yêu cầu khảo sát của sales.
 * Swagger chỉ khai enum là số; tên từng giá trị lấy từ SmartSolar.Modules.PreSurvey.Enums
 * (image 05/10/2026). Giá trị lạ thì in nguyên số thay vì đoán nghĩa.
 */

export const CUSTOMER_TYPES = [
  { value: 1, label: 'Cá nhân' },
  { value: 2, label: 'Doanh nghiệp' },
] as const satisfies readonly { value: CustomerType; label: string }[]

export const SURFACE_TYPES = [
  { value: 1, label: 'Mái nhà', hint: 'Mái tôn, mái ngói, sân thượng' },
  { value: 2, label: 'Mặt đất', hint: 'Khoảng đất trống trong khuôn viên' },
  { value: 3, label: 'Mái che bãi xe', hint: 'Khung che chỗ đậu ô tô, xe máy' },
  { value: 4, label: 'Mặt dựng', hint: 'Tường đứng hoặc mặt ngoài toà nhà' },
  { value: 5, label: 'Khác', hint: 'Ghi rõ ở phần ghi chú' },
] as const satisfies readonly { value: InstallationSurfaceType; label: string; hint: string }[]

/*
 * Hướng mặt mái theo 8 hướng la bàn; giá trị gửi backend là góc phương vị (độ, 0 = Bắc, theo chiều kim đồng hồ).
 * Thứ tự mảng là thứ tự ô trên lưới 3×3 của bộ chọn (Tây Bắc ở góc trên trái), null là ô giữa.
 */
export const COMPASS_GRID = [
  { label: 'Tây Bắc', degree: 315 },
  { label: 'Bắc', degree: 0 },
  { label: 'Đông Bắc', degree: 45 },
  { label: 'Tây', degree: 270 },
  null,
  { label: 'Đông', degree: 90 },
  { label: 'Tây Nam', degree: 225 },
  { label: 'Nam', degree: 180 },
  { label: 'Đông Nam', degree: 135 },
] as const

const DIRECTIONS = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc']

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

/*
  Màu theo việc còn phải làm (Badge): "Chờ nhận" là yêu cầu cần người nhận nên tô đỏ; đã nhận / đang xem xét
  là đang xử lý (chấm xanh dương); đã hẹn là đúng tiến độ (chấm xanh lá); xong hoặc huỷ thì chấm xám.
*/
const STATUS_META: Record<SurveyRequestStatus, { label: string; tone: Tone }> = {
  1: { label: 'Chờ nhận', tone: 'danger' },
  2: { label: 'Đã nhận', tone: 'info' },
  3: { label: 'Đang xem xét', tone: 'info' },
  4: { label: 'Đã hẹn khảo sát', tone: 'ok' },
  5: { label: 'Hoàn tất', tone: 'neutral' },
  6: { label: 'Đã huỷ', tone: 'neutral' },
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
  return STATUS_META[status as SurveyRequestStatus] ?? { label: status == null ? '—' : `Trạng thái ${status}`, tone: 'neutral' }
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
