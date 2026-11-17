import type { Tone } from '@/components/common/ui/badge'

// Enum của lịch thi công kỹ thuật viên thống nhất với khách (Modules.Installations: InstallationScheduleStatuses,
// InstallationScheduleRescheduleReasons). Khác trạng thái dự án thi công ở common/installation.ts

/** Nhãn theo người xem. PLANNED không bao giờ ghi là đã xác nhận: lịch chỉ xác nhận khi hợp đồng đã thanh toán */
export const INSTALLATION_SCHEDULE_STATUSES: Record<string, { staff: string; customer: string; tone: Tone }> = {
  PLANNED: { staff: 'Dự kiến, chưa xác nhận', customer: 'Dự kiến, chưa xác nhận', tone: 'info' },
  CONFIRMED: { staff: 'Đã xác nhận', customer: 'Đã xác nhận', tone: 'ok' },
  RESCHEDULE_REQUIRED: { staff: 'Phải hẹn lại', customer: 'Đang hẹn lại ngày', tone: 'danger' },
  CANCELLED: { staff: 'Đã huỷ', customer: 'Đã huỷ', tone: 'neutral' },
}

/** Vì sao lịch dự kiến không xác nhận được */
export const INSTALLATION_RESCHEDULE_REASONS: Record<string, string> = {
  TECHNICIAN_UNAVAILABLE: 'Kỹ thuật viên không còn rảnh hoặc không còn nhận được khoảng thời gian này.',
  INVALID_SCHEDULE:
    'Khoảng thời gian không còn hợp lệ (thường là đã qua giờ bắt đầu trước khi hợp đồng được thanh toán).',
  COVERAGE_CHANGED:
    'Khu vực của công trình đã đổi; cần quản lý cho phép giao ngoài khu vực hoặc chọn kỹ thuật viên khác.',
  PROJECT_NOT_ASSIGNABLE: 'Dự án thi công đã được giao cho người khác hoặc không giao lại được; quản lý quyết định.',
}

/** Bộ lọc hàng chờ của quản lý / quản trị; rỗng là mọi trạng thái */
export const INSTALLATION_SCHEDULE_FILTERS = [
  { value: 'RESCHEDULE_REQUIRED', label: 'Phải hẹn lại' },
  { value: 'PLANNED', label: 'Dự kiến' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
  { value: '', label: 'Tất cả' },
] as const

/** Ghi chú khách đồng ý, lý do đổi / huỷ, ghi chú khách xin đổi: backend cắt ở 500 ký tự */
export const INSTALLATION_SCHEDULE_NOTE_MAX = 500
