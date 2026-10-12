/*
 * VIẾT TAY – swagger chỉ khai "200 OK" cho tag SurveyRequests, không có schema response.
 * Tên kiểu và field lấy đúng theo SmartSolar.Modules.PreSurvey (GetPendingSurveyRequests,
 * GetMySurveyRequests, GetSurveyRequestDetail) và Contracts.SurveyRequests của image 05/10/2026;
 * lịch hẹn, phân công, đổi giờ theo Modules.Scheduling (backend main 4d12e4d, 12/10/2026).
 * Enum của PreSurvey serialize thành số giống request; trạng thái của Scheduling là chuỗi IN HOA.
 * Khi backend khai response trong swagger, `npm run gen:api` sẽ ghi đè file này bằng bản sinh tự động.
 */
import type { InstallationSurfaceType } from '@/types/req/customersReq'

/** 1 Pending, 2 Assigned, 3 Reviewing, 4 Scheduled, 5 Completed, 6 Cancelled */
export type SurveyRequestStatus = 1 | 2 | 3 | 4 | 5 | 6

export type PendingSurveyRequestItem = {
  surveyRequestId: string
  preSurveyId: string
  customerName: string | null
  propertyName: string | null
  province: string | null
  district: string | null
  installationSurfaceType: InstallationSurfaceType
  totalAreaM2: number | null
  usableAreaM2: number | null
  /** Format: date-time */
  submittedAt: string
}

export type MySurveyRequestItem = {
  surveyRequestId: string
  preSurveyId: string
  customerName: string | null
  propertyName: string | null
  province: string | null
  district: string | null
  status: SurveyRequestStatus
  /** Format: date-time */
  submittedAt: string
  assignedAt: string | null
  scheduledAt: string | null
}

export type SurveyRequestDetail = {
  surveyRequestId: string
  preSurveyId: string
  assignedSaleId: string | null
  customerName: string | null
  customerPhone: string | null
  customerEmail: string | null
  propertyName: string | null
  province: string | null
  district: string | null
  ward: string | null
  streetLine: string | null
  latitude: number | null
  longitude: number | null
  installationSurfaceType: InstallationSurfaceType
  surfaceMaterial: string | null
  totalAreaM2: number | null
  usableAreaM2: number | null
  tiltDegree: number | null
  azimuthDegree: number | null
  hasObstruction: boolean | null
  status: SurveyRequestStatus
  /** Format: date-time */
  submittedAt: string
  assignedAt: string | null
  scheduledAt: string | null
  salesNote: string | null
  /** Lần mô phỏng khách chọn khi gửi (image 09/10/2026); null với yêu cầu gửi khi chưa chạy mô phỏng. */
  selectedSimulation: SelectedSimulationSummary | null
  /** Lịch hẹn đang hiệu lực (12/10/2026); null khi khách chưa đặt giờ hoặc đã huỷ. */
  appointment: SurveyAppointmentSummary | null
}

/** BOOKED → ASSIGNED → ACKNOWLEDGED, hoặc CANCELLED. Giá trị lạ vẫn nhận (backend có thể thêm). */
export type AppointmentStatus = 'BOOKED' | 'ASSIGNED' | 'ACKNOWLEDGED' | 'CANCELLED' | (string & {})

/**
 * Lịch hẹn như sales thấy, gồm cả kỹ thuật viên hệ thống đang giữ chỗ (khách không bao giờ thấy).
 * Giờ có offset +07:00.
 */
export type SurveyAppointmentSummary = {
  appointmentId: string
  /** Format: date-time */
  startsAt: string
  /** Format: date-time */
  endsAt: string
  status: AppointmentStatus
  reservedTechnicianUserId: string
  reservedTechnicianName: string
  assignedTechnicianUserId: string | null
  assignedTechnicianName: string | null
  customerNote: string | null
  /** Format: date-time */
  bookedAt: string
  assignedAt: string | null
  acknowledgedAt: string | null
}

/** POST …/assign-technician và PUT …/reassign-technician (cùng một handler). */
export type AssignmentView = {
  appointmentId: string
  surveyRequestId: string
  technicianUserId: string
  technicianName: string
  startsAt: string
  endsAt: string
  appointmentStatus: AppointmentStatus
  /** Luôn "SCHEDULED" khi thành công. */
  surveyRequestStatus: string
  scheduledAt: string
  reassigned: boolean
  /** Kỹ thuật viên (mới) phải xác nhận nhận việc. */
  acknowledgementRequired: boolean
}

/** PUT …/reschedule. `previousAppointmentId` là lịch cũ (đã huỷ, giữ làm lịch sử). */
export type SalesRescheduleView = {
  appointmentId: string
  previousAppointmentId: string | null
  surveyRequestId: string
  technicianUserId: string
  technicianName: string
  startsAt: string
  endsAt: string
  appointmentStatus: AppointmentStatus
  surveyRequestStatus: string
  scheduledAt: string | null
  reassigned: boolean
  acknowledgementRequired: boolean
}

/** Tóm tắt mô phỏng khách chọn; bản đầy đủ đọc ở GET /api/pre-surveys/{preSurveyId}/simulations/{simulationId}. */
export type SelectedSimulationSummary = {
  simulationId: string
  status: string
  energyStatus: string
  isStale: boolean
  mountingType: string
  productSku: string
  productName: string
  panelCount: number
  installedCapacityKwp: number
  annualEnergyKwh: number | null
  /** Format: date-time */
  createdAt: string
}

export type ClaimSurveyRequestResponse = {
  surveyRequestId: string
}
