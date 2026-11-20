import { IOT_BINDING_STATUSES, IOT_CONNECTION_STATUSES, IOT_DEVICE_STATUSES } from '@/common/iot'
import type { Tone } from '@/components/common/ui/badge'
import { errorMessage, isApiError } from '@/services/api/errors'

// Nhãn và câu của giám sát IoT. Giờ luôn theo giờ Việt Nam, có giây vì thiết bị gửi 10 giây / lần

const neutral = (label: string) => ({ label, tone: 'neutral' as Tone })

export const deviceStatusMeta = (status: string) => IOT_DEVICE_STATUSES[status] ?? neutral(status)

export const bindingStatusMeta = (status: string) => IOT_BINDING_STATUSES[status] ?? neutral(status)

export function connectionMeta(status: string | null | undefined) {
  const meta = status ? IOT_CONNECTION_STATUSES[status] : undefined
  return meta ?? { label: status ?? 'Không rõ', tone: 'neutral' as Tone, hint: '' }
}

const timeWithSeconds = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hourCycle: 'h23',
})

const shortTime = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** "14:05:10 19/11/2026" */
export function formatReadingTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : timeWithSeconds.format(d)
}

/** "14:05:10": nhãn trục thời gian của biểu đồ */
export const formatAxisTime = (ms: number) => shortTime.format(new Date(ms))

/** "12 giây trước", "5 phút trước": chỉ để đọc nhanh, trạng thái kết nối vẫn theo backend */
export function formatAgo(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return null
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (Number.isNaN(seconds)) return null
  if (seconds < 60) return `${seconds} giây trước`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} giờ trước`
  return `${Math.floor(seconds / 86_400)} ngày trước`
}

/** Câu lỗi của IoT: 429 ghi số giây phải chờ, 503 là hệ thống chưa sẵn sàng (không có số đo thay thế) */
export function iotErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 429)
      return error.retryAfter
        ? `Bạn thao tác quá nhanh. Thử lại sau ${error.retryAfter} giây.`
        : 'Bạn thao tác quá nhanh. Chờ một lát rồi thử lại.'
    if (error.status === 503 && error.code !== 'FEATURE_PENDING_MIGRATION' && error.code !== 'SCHEMA_NOT_READY')
      return 'Hệ thống giám sát tạm thời chưa phản hồi. Thử lại sau ít phút.'
  }
  return errorMessage(error)
}
