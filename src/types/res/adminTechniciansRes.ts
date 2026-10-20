/*
 * VIẾT TAY – swagger chỉ khai "200 OK" cho tag AdminTechnicians, không có schema response.
 * Tên kiểu và field lấy đúng theo SmartSolar.Modules.Scheduling.PreSurveyAppointments.AdminTechnicianHandlers
 * (TechnicianProfileView, WorkingScheduleView, UnavailablePeriodView, ConflictingAppointmentView – backend
 * main 4d12e4d, 12/10/2026). Khi backend khai response trong swagger, `npm run gen:api` sẽ ghi đè file này.
 */

/** GET /api/admin/technicians (mỗi tài khoản có vai trò TECHNICIAN) và PUT …/profile. */
export type TechnicianProfileView = {
  technicianUserId: string
  fullName: string
  phone: string | null
  isActiveUser: boolean
  baseLatitude: number | null
  baseLongitude: number | null
  baseLabel: string | null
  isSchedulingActive: boolean
  /** null = theo mặc định của hệ thống (3). */
  maxAppointmentsPerDay: number | null
  /** Tài khoản ACTIVE + đang nhận lịch + có toạ độ nơi xuất phát thật. */
  readyForScheduling: boolean
  hasCustomWorkingSchedule: boolean
  /** "HH:mm" */
  earliestBaseDeparture: string
  earliestBaseDepartureIsDefault: boolean
  /** V1 cố định "MOTORCYCLE". */
  vehicleType: string
}

/** day: MONDAY … SUNDAY; start / end: "HH:mm" giờ địa phương. */
export type WorkingPeriodView = {
  day: string
  start: string
  end: string
}

export type WorkingScheduleView = {
  technicianUserId: string
  /** true: dùng giờ làm chung của hệ thống (periods là giờ chung đó). */
  usesDefault: boolean
  timeZone: string
  periods: WorkingPeriodView[]
}

export type UnavailablePeriodView = {
  id: string
  technicianUserId: string
  startsAt: string
  endsAt: string
  reason: string | null
}

/**
 * Lịch hẹn đã có mà thay đổi cấu hình sẽ làm hỏng; nằm trong `error.details.conflictingAppointments`
 * của lỗi 409 TECHNICIAN_HAS_CONFLICTING_APPOINTMENTS. Backend không tự huỷ lịch nào.
 */
export type ConflictingAppointmentView = {
  appointmentId: string
  surveyRequestId: string | null
  startsAt: string
  endsAt: string
  status: string
  /** SCHEDULING_DISABLED, OUTSIDE_WORKING_HOURS, TECHNICIAN_UNAVAILABLE_PERIOD, BEFORE_EARLIEST_BASE_DEPARTURE, … */
  problem: string
}
