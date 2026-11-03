import type { Tone } from '@/components/common/ui/badge'

// Mã của điều phối kỹ thuật viên (SmartSolar.Modules.Scheduling.Dispatch). Mã lạ thì in nguyên văn

/** Trạng thái theo góc nhìn nhân viên: OPEN là việc của nhân viên nên tô đỏ */
export const DISPATCH_STATUSES: Record<string, { label: string; tone: Tone }> = {
  OPEN: { label: 'Cần xếp kỹ thuật viên', tone: 'danger' },
  PROPOSAL_PENDING: { label: 'Chờ khách trả lời', tone: 'info' },
  ASSIGNED: { label: 'Đã xếp kỹ thuật viên', tone: 'ok' },
  UNSERVICEABLE: { label: 'Không phục vụ được', tone: 'neutral' },
  CLOSED: { label: 'Đã đóng', tone: 'neutral' },
}

/** Vì sao cần điều phối: vùng phủ lúc khách gửi, hoặc kỹ thuật viên trả lại lịch */
export const DISPATCH_REASONS: Record<string, string> = {
  NO_ZONE_COVERAGE: 'Phường, xã chưa thuộc khu vực nào',
  ZONE_NOT_SERVICEABLE: 'Khu vực đang tạm ngừng nhận lịch',
  NO_ZONE_TECHNICIAN: 'Khu vực chưa có kỹ thuật viên',
  NO_AVAILABLE_TECHNICIAN: 'Kỹ thuật viên khu vực kín lịch',
  SCHEDULE_CONFLICT: 'Không ai rảnh giờ khách muốn',
  ASSIGNMENT_RELEASED: 'Kỹ thuật viên trả lại lịch',
}

export const PROPOSAL_STATUSES: Record<string, { label: string; tone: Tone }> = {
  PROPOSED: { label: 'Chờ khách trả lời', tone: 'info' },
  ACCEPTED: { label: 'Khách đồng ý', tone: 'ok' },
  DECLINED: { label: 'Khách không đồng ý', tone: 'neutral' },
  EXPIRED: { label: 'Hết hạn trả lời', tone: 'neutral' },
  WITHDRAWN: { label: 'Đã rút', tone: 'neutral' },
  FAILED: { label: 'Giờ đó không còn nhận được', tone: 'warn' },
}

export const DISPATCH_RESOLUTIONS: Record<string, string> = {
  ASSIGNED: 'Đã xếp kỹ thuật viên',
  UNSERVICEABLE: 'Không phục vụ được',
  CLOSED_BY_STAFF: 'Nhân viên đóng',
  CANCELLED_BY_CUSTOMER: 'Khách huỷ',
}

export const DISPATCH_EVENTS: Record<string, string> = {
  CREATED: 'Khách gửi yêu cầu',
  ASSIGNMENT_RELEASED: 'Kỹ thuật viên trả lại lịch',
  OVERDUE: 'Quá hạn phản hồi',
  ESCALATED: 'Đã báo quản trị',
  REMINDER: 'Nhắc lại',
  PROPOSAL_CREATED: 'Gửi đề xuất cho khách',
  PROPOSAL_ACCEPTED: 'Khách đồng ý đề xuất',
  PROPOSAL_DECLINED: 'Khách không đồng ý đề xuất',
  PROPOSAL_EXPIRED: 'Đề xuất hết hạn',
  PROPOSAL_WITHDRAWN: 'Rút đề xuất',
  PROPOSAL_FAILED: 'Đề xuất không còn nhận được',
  CROSS_ZONE_AUTHORIZED: 'Cho phép kỹ thuật viên ngoài khu vực',
  ASSIGNED: 'Phân công kỹ thuật viên',
  UNSERVICEABLE: 'Không phục vụ được',
  CLOSED: 'Đóng yêu cầu',
  CANCELLED: 'Khách huỷ yêu cầu',
}

/** Khung giờ khách chọn khi nhờ xếp kỹ thuật viên (giờ Việt Nam) */
export const DISPATCH_SESSIONS = [
  { value: 'morning', label: 'Buổi sáng (08:00–12:00)', from: '08:00', to: '12:00' },
  { value: 'afternoon', label: 'Buổi chiều (13:00–17:00)', from: '13:00', to: '17:00' },
  { value: 'day', label: 'Cả ngày (08:00–17:00)', from: '08:00', to: '17:00' },
] as const

export type DispatchSession = (typeof DISPATCH_SESSIONS)[number]['value']

/** Backend nhận tối đa 5 khung giờ */
export const MAX_DISPATCH_WINDOWS = 5
