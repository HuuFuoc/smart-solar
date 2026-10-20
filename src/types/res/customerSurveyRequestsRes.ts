// Viết tay vì swagger không có schema response. Khách không bao giờ thấy kỹ thuật viên đang giữ chỗ
import type { AppointmentStatus } from '@/types/res/surveyRequestsRes'

/** PENDING, ASSIGNED, REVIEWING, SCHEDULED, COMPLETED, CANCELLED (tên enum SurveyRequestStatus viết hoa). */
export type CustomerSurveyRequestStatus =
  'PENDING' | 'ASSIGNED' | 'REVIEWING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | (string & {})

export type CustomerAppointmentView = {
  appointmentId: string
  /** Format: date-time (+07:00) */
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  technicianAssigned: boolean
  /** Chỉ có khi đã phân công chính thức (ASSIGNED / ACKNOWLEDGED). */
  assignedTechnicianName: string | null
  customerNote: string | null
  bookedAt: string
  /** BOOKED và còn ở tương lai: khách tự đổi giờ / huỷ được. */
  canCustomerChange: boolean
}

export type CustomerSurveyRequestView = {
  surveyRequestId: string
  preSurveyId: string
  propertySiteId: string
  propertyName: string
  status: CustomerSurveyRequestStatus
  /** Format: date-time */
  submittedAt: string
  scheduledAt: string | null
  /** Lịch hẹn đang hiệu lực; null khi chưa đặt hoặc đã huỷ. */
  appointment: CustomerAppointmentView | null
}

export type CustomerAppointmentHistoryItem = {
  appointmentId: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  bookedAt: string
}

export type CustomerSurveyRequestDetailView = {
  request: CustomerSurveyRequestView
  /** Mọi lần đặt của yêu cầu, kể cả lần đã huỷ / đã đổi giờ. */
  history: CustomerAppointmentHistoryItem[]
}

/** POST (201 tạo mới, 200 gửi lại đúng giờ cũ, created=false) và PUT .../booking. */
export type BookingConfirmation = {
  appointmentId: string
  surveyRequestId: string
  startsAt: string
  endsAt: string
  appointmentStatus: AppointmentStatus
  created: boolean
  message: string
}
