import type { Tone } from '@/components/common/ui/badge'

/*
 * Enum của lịch khảo sát (Modules.Scheduling, backend main 4d12e4d, 12/10/2026), dùng chung cho khách hàng, kinh doanh,
 * kỹ thuật viên, quản trị / quản lý. Hàm tra nhãn ở features/scheduling/components/schedulingDisplay.ts; mã lạ in nguyên văn.
 */

/** Ai đang xem lịch hẹn: quyết định màu của trạng thái (APPOINTMENT_TONES). */
export type AppointmentViewer = 'customer' | 'sales' | 'technician' | 'staff'

export const APPOINTMENT_LABELS: Record<string, string> = {
  BOOKED: 'Đã đặt giờ, chờ phân công',
  ASSIGNED: 'Đã phân công',
  ACKNOWLEDGED: 'Kỹ thuật viên đã nhận việc',
  CANCELLED: 'Đã huỷ',
}

/*
  Màu theo việc của người đang xem (Badge, globals.css): đỏ là việc người đó phải làm – sales thấy lịch BOOKED (phải phân
  công), kỹ thuật viên thấy ASSIGNED (phải xác nhận nhận việc); đang chờ người khác là info; xong là ok; huỷ là neutral.
*/
export const APPOINTMENT_TONES: Record<AppointmentViewer, Record<string, Tone>> = {
  customer: { BOOKED: 'info', ASSIGNED: 'ok', ACKNOWLEDGED: 'ok', CANCELLED: 'neutral' },
  sales: { BOOKED: 'danger', ASSIGNED: 'info', ACKNOWLEDGED: 'ok', CANCELLED: 'neutral' },
  technician: { BOOKED: 'neutral', ASSIGNED: 'danger', ACKNOWLEDGED: 'ok', CANCELLED: 'neutral' },
  staff: { BOOKED: 'info', ASSIGNED: 'info', ACKNOWLEDGED: 'ok', CANCELLED: 'neutral' },
}

/** Điểm đi của một chặng đường. */
export const ORIGIN_KINDS: Record<string, string> = {
  BASE: 'Từ nơi xuất phát',
  APPOINTMENT: 'Từ công trình trước',
}

/** Kết quả gọi Vietmap của một chặng (RouteCalculationStatuses). */
export const ROUTE_CALCULATION_STATUSES: Record<string, string> = {
  OK: 'Đã tính',
  ROUTE_NOT_FOUND: 'Không tìm được đường đi',
  QUOTA_EXCEEDED: 'Hết lượt tính của Vietmap',
  RATE_LIMITED: 'Vietmap đang giới hạn số lượt',
  TIMEOUT: 'Vietmap không phản hồi kịp',
  PROVIDER_UNAVAILABLE: 'Vietmap đang lỗi',
  INVALID_RESPONSE: 'Vietmap trả dữ liệu không đọc được',
  REJECTED_REQUEST: 'Vietmap từ chối yêu cầu',
  PROVIDER_DISABLED: 'Chưa bật dịch vụ tính đường đi',
  BUDGET_EXHAUSTED: 'Quá số lượt tính cho một thao tác',
}

/*
  Trạng thái chặng đường tới một lịch trên bảng lịch ngày (RoutingStatuses). Chỉ OK mới là số liệu hiện tại; các trạng
  thái còn lại không được hiện số cũ như thể đang đúng.
*/
export const SCHEDULE_ROUTING_STATUSES: Record<string, { label: string; tone: Tone }> = {
  OK: { label: 'Đường đi đã kiểm tra', tone: 'ok' },
  PENDING_RECALCULATION: { label: 'Đang tính lại đường đi', tone: 'info' },
  STALE: { label: 'Đường đi cũ, cần tính lại', tone: 'warn' },
  FAILED: { label: 'Không tính được đường đi', tone: 'warn' },
  MISSING: { label: 'Chưa có ước tính đường đi', tone: 'warn' },
}

/** Lý do kỹ thuật viên không xếp được vào một giờ. */
export const FEASIBILITY_REASONS: Record<string, string> = {
  BASE_LOCATION_MISSING: 'chưa có nơi xuất phát',
  APPOINTMENT_LOCATION_MISSING: 'công trình chưa có toạ độ',
  TECHNICIAN_UNAVAILABLE_PERIOD: 'đang trong lịch nghỉ',
  DAILY_LIMIT_REACHED: 'đã đủ số lịch trong ngày',
  OVERLAPPING_APPOINTMENT: 'trùng giờ với lịch khác',
  CANNOT_ARRIVE_IN_TIME: 'không kịp tới công trình',
  LATE_FOR_NEXT_APPOINTMENT: 'sẽ trễ lịch kế tiếp',
  DEPARTURE_IN_PAST: 'giờ phải xuất phát đã qua',
  ROUTE_NOT_VERIFIED: 'chưa kiểm tra được đường đi',
  OUTSIDE_WORKING_HOURS: 'ngoài giờ làm',
  BEFORE_EARLIEST_BASE_DEPARTURE: 'phải rời nơi xuất phát sớm hơn giờ cho phép',
  SCHEDULING_DISABLED: 'kỹ thuật viên bị tắt nhận lịch',
}

/** Vì sao đường đi của một lịch phải tính lại. */
export const RECALCULATION_REASONS: Record<string, string> = {
  CANCELLATION: 'có lịch bị huỷ',
  CUSTOMER_RESCHEDULE: 'khách đổi giờ',
  SALES_RESCHEDULE: 'kinh doanh đổi giờ',
  REASSIGNMENT: 'đổi kỹ thuật viên',
  BASE_LOCATION_CHANGED: 'đổi nơi xuất phát',
  WORKING_SCHEDULE_CHANGED: 'đổi giờ làm',
  UNAVAILABILITY_CHANGED: 'đổi lịch nghỉ',
}

/** Ngày trong tuần của giờ làm. */
export const WEEK_DAYS = [
  { value: 'MONDAY', label: 'Thứ Hai' },
  { value: 'TUESDAY', label: 'Thứ Ba' },
  { value: 'WEDNESDAY', label: 'Thứ Tư' },
  { value: 'THURSDAY', label: 'Thứ Năm' },
  { value: 'FRIDAY', label: 'Thứ Sáu' },
  { value: 'SATURDAY', label: 'Thứ Bảy' },
  { value: 'SUNDAY', label: 'Chủ nhật' },
] as const
