// Viết tay vì swagger không có schema response. Khách không bao giờ thấy kỹ thuật viên đang giữ chỗ
import type { AppointmentStatus } from '@/types/res/surveyRequestsRes'

/** PENDING (chưa có kỹ thuật viên xác nhận), SCHEDULED, COMPLETED, CANCELLED */
export type CustomerSurveyRequestStatus = 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | (string & {})

/** Trạng thái khách thấy: chờ kỹ thuật viên nhận, đã xác nhận, cần nhân viên xếp người, đã huỷ, đã xong */
export type AcceptanceStatus =
  'WAITING_FOR_TECHNICIAN' | 'CONFIRMED' | 'NEEDS_STAFF' | 'CANCELLED' | 'COMPLETED' | (string & {})

export type CustomerAppointmentView = {
  appointmentId: string
  /** Format: date-time (+07:00) */
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  acceptanceStatus: AcceptanceStatus
  technicianAssigned: boolean
  /** Chỉ có khi kỹ thuật viên đã xác nhận (ACCEPTED / ASSIGNED) */
  assignedTechnicianName: string | null
  customerNote: string | null
  bookedAt: string
  /** Lịch còn ở tương lai và đủ xa giờ hẹn: khách tự đổi giờ / huỷ được */
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
  acceptanceStatus: AcceptanceStatus
  /** Hạn để kỹ thuật viên nhận, quá hạn thì nhân viên xếp người */
  acceptanceDeadlineAt: string | null
  created: boolean
  message: string
}
