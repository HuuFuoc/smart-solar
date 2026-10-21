import type { Tone } from '@/components/common/ui/badge'

// Enum của lịch khảo sát (Modules.Scheduling của backend), dùng chung cho mọi vai trò

/** Người đang xem lịch hẹn, quyết định màu của trạng thái */
export type AppointmentViewer = 'customer' | 'sales' | 'technician' | 'staff'

export const APPOINTMENT_LABELS: Record<string, string> = {
  PENDING_ACCEPTANCE: 'Chờ kỹ thuật viên nhận',
  ESCALATED: 'Không ai nhận kịp, cần phân công',
  ACCEPTED: 'Kỹ thuật viên đã nhận',
  ASSIGNED: 'Đã phân công kỹ thuật viên',
  COMPLETED: 'Đã khảo sát',
  CANCELLED: 'Đã huỷ',
}

// Kỹ thuật viên xem việc của chính mình nên gọi là "bạn"
export const TECHNICIAN_APPOINTMENT_LABELS: Record<string, string> = {
  ACCEPTED: 'Bạn đã nhận',
  ASSIGNED: 'Được phân công cho bạn',
}

// Đỏ là việc người xem phải làm: sales thấy ESCALATED (cần phân công), kỹ thuật viên thấy lịch chờ nhận
export const APPOINTMENT_TONES: Record<AppointmentViewer, Record<string, Tone>> = {
  customer: { PENDING_ACCEPTANCE: 'info', ESCALATED: 'info', ACCEPTED: 'ok', ASSIGNED: 'ok', COMPLETED: 'neutral' },
  sales: { PENDING_ACCEPTANCE: 'info', ESCALATED: 'danger', ACCEPTED: 'ok', ASSIGNED: 'ok', COMPLETED: 'neutral' },
  technician: {
    PENDING_ACCEPTANCE: 'danger',
    ESCALATED: 'danger',
    ACCEPTED: 'ok',
    ASSIGNED: 'ok',
    COMPLETED: 'neutral',
  },
  staff: { PENDING_ACCEPTANCE: 'info', ESCALATED: 'danger', ACCEPTED: 'ok', ASSIGNED: 'ok', COMPLETED: 'neutral' },
}

/** Cách kỹ thuật viên có lịch: tự nhận hoặc được phân công */
export const ASSIGNMENT_SOURCES: Record<string, string> = {
  SELF_ACCEPTED: 'Kỹ thuật viên tự nhận',
  SALES_ASSIGNED: 'Kinh doanh phân công',
  MANAGER_OVERRIDE: 'Quản lý phân công',
  MANAGER_DISPATCH: 'Quản lý điều phối',
}

// Trạng thái khách thấy (acceptanceStatus), khách không thấy ai đang giữ chỗ
export const ACCEPTANCE_STATUSES: Record<string, { label: string; tone: Tone }> = {
  WAITING_FOR_TECHNICIAN: { label: 'Đã đặt giờ, chờ kỹ thuật viên nhận', tone: 'info' },
  NEEDS_STAFF: { label: 'Đã đặt giờ, nhân viên đang xếp kỹ thuật viên', tone: 'info' },
  CONFIRMED: { label: 'Kỹ thuật viên đã nhận lịch', tone: 'ok' },
  COMPLETED: { label: 'Đã khảo sát xong', tone: 'neutral' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

// Vì sao địa điểm chưa có giờ để đặt (coverageStatus của GET /api/survey-slots)
export const COVERAGE_STATUSES: Record<string, string> = {
  SITE_LOCATION_REQUIRED: 'Địa điểm chưa có mã phường, xã nên chưa biết thuộc khu vực nào.',
  NO_ZONE_COVERAGE: 'Phường, xã của công trình chưa thuộc khu vực phục vụ nào.',
  ZONE_NOT_SERVICEABLE: 'Khu vực của công trình đang tạm ngừng nhận lịch.',
  NO_ZONE_TECHNICIAN: 'Khu vực của công trình chưa có kỹ thuật viên.',
  NO_AVAILABLE_TECHNICIAN: 'Kỹ thuật viên của khu vực đã kín lịch trong những ngày tới.',
  SCHEDULE_CONFLICT: 'Kỹ thuật viên của khu vực đã kín lịch ngày này. Thử ngày khác.',
}

// Vì sao một kỹ thuật viên không nhận được lịch (mã của backend)
export const INELIGIBLE_REASONS: Record<string, string> = {
  TECHNICIAN_INACTIVE: 'tài khoản không hoạt động',
  TECHNICIAN_SCHEDULING_DISABLED: 'đang tắt nhận lịch',
  TECHNICIAN_OUTSIDE_ZONE: 'không thuộc khu vực của công trình',
  OUTSIDE_WORKING_HOURS: 'ngoài giờ làm',
  TECHNICIAN_ON_LEAVE: 'đang nghỉ',
  TECHNICIAN_SCHEDULE_CONFLICT: 'trùng lịch khác',
  DAILY_LIMIT_REACHED: 'đã đủ số lịch trong ngày',
  SCHEDULE_CONFLICT: 'trùng lịch khác',
}

/** Ngày trong tuần của giờ làm */
export const WEEK_DAYS = [
  { value: 'MONDAY', label: 'Thứ Hai' },
  { value: 'TUESDAY', label: 'Thứ Ba' },
  { value: 'WEDNESDAY', label: 'Thứ Tư' },
  { value: 'THURSDAY', label: 'Thứ Năm' },
  { value: 'FRIDAY', label: 'Thứ Sáu' },
  { value: 'SATURDAY', label: 'Thứ Bảy' },
  { value: 'SUNDAY', label: 'Chủ nhật' },
] as const
