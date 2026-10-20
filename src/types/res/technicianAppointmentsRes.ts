// Viết tay vì swagger không có schema response (tag TechnicianAppointments, TechnicianSchedule)
import type { TravelEstimateView } from '@/types/res/technicianAvailabilityRes'
import type { AppointmentStatus, SelectedSimulationSummary } from '@/types/res/surveyRequestsRes'

export type TechnicianAppointmentListItem = {
  appointmentId: string
  /** Đang chỉ có "PRE_SURVEY". */
  appointmentType: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  propertyName: string
  province: string
  district: string | null
  acknowledgedAt: string | null
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
  /** Tên enum (Rooftop, Ground, Carport, Facade, Other), không phải số như ở màn sales. */
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
  assignedAt: string | null
  acknowledgedAt: string | null
  customerNote: string | null
  surveyRequestId: string
  customer: TechnicianJobCustomer
  property: TechnicianJobProperty
  preSurvey: TechnicianJobPreSurvey
  selectedSimulation: SelectedSimulationSummary | null
  /** "/api/pre-surveys/{id}/simulations/{simulationId}", kỹ thuật viên được phân công đọc được. */
  simulationDetailPath: string | null
  inboundTravelEstimate: TravelEstimateView | null
}

/** Gửi lại khi đã nhận thì `alreadyAcknowledged` = true */
export type AcknowledgementView = {
  appointmentId: string
  status: AppointmentStatus
  acknowledgedAt: string
  alreadyAcknowledged: boolean
}

/** OK | PENDING_RECALCULATION | STALE | FAILED | MISSING */
export type ScheduleRoutingStatus = 'OK' | 'PENDING_RECALCULATION' | 'STALE' | 'FAILED' | 'MISSING' | (string & {})

export type ScheduleAppointmentView = {
  appointmentId: string
  appointmentType: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  propertyName: string
  latitude: number | null
  longitude: number | null
  /** Điểm xuất phát đúng của chặng tới lịch này: BASE (lịch đầu ngày) hoặc APPOINTMENT. */
  expectedOriginKind: string
  expectedOriginAppointmentId: string | null
  /** Chỉ có khi routingStatus = OK. */
  inboundTravel: TravelEstimateView | null
  /** Ước tính đã cũ, chỉ để tham khảo */
  nonCurrentEstimate: TravelEstimateView | null
  routingStatus: ScheduleRoutingStatus
  snapshotAgeMinutes: number | null
  potentialConflict: boolean
}

/** Lần tính lại đường đi đang chờ cho ngày này (null khi không có). */
export type RecalculationStateView = {
  /** PENDING | FAILED */
  status: string
  reason: string
  requestedAt: string
  attempts: number
  nextAttemptAt: string
  lastError: string | null
}

export type TechnicianScheduleView = {
  technicianUserId: string
  /** Format: date */
  date: string
  timeZone: string
  appointmentCount: number
  /** Chỉ cộng các chặng OK. */
  estimatedTravelDistanceMeters: number
  estimatedTravelSeconds: number
  safetyBufferMinutesTotal: number
  conflictCount: number
  routesNeedingReview: number
  earliestBaseDeparture: string
  recalculation: RecalculationStateView | null
  appointments: ScheduleAppointmentView[]
  note: string
}
