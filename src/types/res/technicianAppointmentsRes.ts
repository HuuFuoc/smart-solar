// Viết tay vì swagger không có schema response (tag TechnicianAppointments, TechnicianSchedule)
import type { AppointmentStatus, SelectedSimulationSummary, ZoneView } from '@/types/res/surveyRequestsRes'

/** Việc đã xác nhận của kỹ thuật viên (GET /api/technicians/me/appointments) */
export type TechnicianAppointmentListItem = {
  appointmentId: string
  /** Đang chỉ có "PRE_SURVEY" */
  appointmentType: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  /** SELF_ACCEPTED (tự nhận) hoặc do sales / quản lý phân công */
  assignmentSource: string | null
  propertyName: string
  province: string
  district: string | null
  assignedAt: string | null
}

export type TechnicianJobCustomer = {
  fullName: string
  phone: string | null
  email: string | null
}

export type TechnicianJobProperty = {
  propertySiteId: string
  name: string
  province: string
  district: string | null
  ward: string | null
  streetLine: string | null
  latitude: number | null
  longitude: number | null
  /** Tên enum (Rooftop, Ground, Carport, Facade, Other), không phải số như ở màn sales */
  installationSurfaceType: string | null
  surfaceMaterial: string | null
}

export type TechnicianJobPreSurvey = {
  preSurveyId: string
  totalAreaM2: number | null
  usableAreaM2: number | null
  surfaceLengthM: number | null
  surfaceWidthM: number | null
  surfaceTiltDegree: number | null
  surfaceAzimuthDegree: number | null
  hasObstruction: boolean | null
  obstacleCount: number
}

export type TechnicianJobView = {
  appointmentId: string
  appointmentType: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  assignmentSource: string | null
  assignedAt: string | null
  acceptedAt: string | null
  customerNote: string | null
  surveyRequestId: string
  revision: number
  customer: TechnicianJobCustomer
  property: TechnicianJobProperty
  preSurvey: TechnicianJobPreSurvey
  selectedSimulation: SelectedSimulationSummary | null
  /** "/api/pre-surveys/{id}/simulations/{simulationId}", kỹ thuật viên đã xác nhận đọc được */
  simulationDetailPath: string | null
}

/**
 * Lịch đang chờ người nhận trong khu vực của kỹ thuật viên (GET /api/technicians/me/open-appointments).
 * Chưa có địa chỉ cụ thể và liên hệ của khách cho tới khi nhận việc.
 */
export type OpenAppointmentView = {
  appointmentId: string
  surveyRequestId: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  acceptanceDeadlineAt: string | null
  /** Gửi lại làm expectedRevision khi nhận việc */
  revision: number
  zone: ZoneView | null
  propertyName: string
  province: string
  district: string | null
  ward: string | null
  installationSurfaceType: string | null
  totalAreaM2: number | null
  usableAreaM2: number | null
  /** Chỉ để gợi ý, lúc nhận việc backend kiểm tra lại */
  canAccept: boolean
  /** Lý do không nhận được (trùng lịch, đủ số lịch trong ngày...) */
  reason: string | null
  requiresHoldRehoming: boolean
}

/** POST .../release */
export type ReleaseView = {
  appointmentId: string
  appointmentStatus: AppointmentStatus
  /** Đã có kỹ thuật viên khác giữ chỗ thay */
  hasNewHolder: boolean
  message: string
}

export type ScheduleAppointmentView = {
  appointmentId: string
  appointmentType: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  /** Chỗ giữ tạm cho lịch chưa ai nhận, chưa phải việc đã nhận */
  isCapacityHold: boolean
  propertyName: string
  /** Lịch trước kết thúc cộng khoảng nghỉ vẫn muộn hơn giờ bắt đầu lịch này */
  potentialConflict: boolean
}

/** Lịch một ngày của kỹ thuật viên */
export type TechnicianScheduleView = {
  technicianUserId: string
  /** Format: date */
  date: string
  timeZone: string
  appointmentCount: number
  /** Khoảng nghỉ cố định giữa hai lịch (phút), không phải thời gian đi đường */
  bufferBetweenAppointmentsMinutes: number
  conflictCount: number
  appointments: ScheduleAppointmentView[]
  note: string
}
