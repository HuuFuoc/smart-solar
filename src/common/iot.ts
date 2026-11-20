import type { Tone } from '@/components/common/ui/badge'

// Enum và giới hạn của giám sát IoT (Modules.IotMonitoring của backend 7d27054: IotDeviceStatuses, IotConnectionStatuses,
// IotBindingStatuses, IotLimits, IotMonitoringOptions). Chỉ hằng số

/** Trạng thái quản trị của thiết bị */
export const IOT_DEVICE_STATUSES: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Đang dùng', tone: 'ok' },
  DISABLED: { label: 'Đã khoá', tone: 'danger' },
}

/** Bộ lọc của danh sách thiết bị; giá trị rỗng là mọi trạng thái */
export const IOT_DEVICE_STATUS_FILTERS = [
  { value: '', label: 'Mọi trạng thái' },
  { value: 'ACTIVE', label: 'Đang dùng' },
  { value: 'DISABLED', label: 'Đã khoá' },
] as const

/** Trạng thái kết nối, backend tính lúc đọc. `hint` giải thích cho người xem, không phải câu của backend */
export const IOT_CONNECTION_STATUSES: Record<string, { label: string; tone: Tone; hint: string }> = {
  ONLINE: { label: 'Đang kết nối', tone: 'ok', hint: 'Thiết bị đang gửi số đo đều đặn.' },
  OFFLINE: {
    label: 'Mất kết nối',
    tone: 'warn',
    hint: 'Thiết bị đã ngừng gửi số đo. Số đo cũ vẫn còn trong lịch sử.',
  },
  NO_DATA: {
    label: 'Chưa có số đo',
    tone: 'info',
    hint: 'Thiết bị đã gắn vào công trình nhưng chưa gửi số đo nào. Chưa có số đo không có nghĩa là dòng điện bằng 0.',
  },
  UNASSIGNED: { label: 'Chưa gắn công trình', tone: 'neutral', hint: 'Thiết bị chưa được gắn vào công trình nào.' },
  DISABLED: {
    label: 'Thiết bị bị khoá',
    tone: 'danger',
    hint: 'Quản trị đã khoá thiết bị nên không nhận và không hiện số đo hiện tại.',
  },
}

export const IOT_BINDING_STATUSES: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Đang gắn', tone: 'ok' },
  RELEASED: { label: 'Đã tháo', tone: 'neutral' },
}

/** Giới hạn của backend (IotLimits, IotDeviceHandlers.MaxPageSize, IotMonitoringOptions.MaxHistoryLimit) */
export const IOT_LIMITS = {
  deviceIdMin: 3,
  deviceIdMax: 64,
  displayNameMax: 150,
  sensorModelMax: 50,
  reasonMax: 500,
  noteMax: 500,
  maxCurrentAmps: 1000,
  devicePageSizeMax: 100,
  historyLimitMax: 500,
} as const

/** Mặc định của backend khi view chưa trả (IotMonitoringOptions): gửi 10 giây / lần, mất kết nối sau 30 giây */
export const IOT_DEFAULTS = {
  reportIntervalSeconds: 10,
  offlineAfterSeconds: 30,
  /** Số dòng lịch sử mỗi lần tải; backend nhận 1–500 */
  historyPageSize: 100,
} as const
