// Viết tay vì swagger không có schema response. Theo AdminTechnicianHandlers của backend

/** GET /api/admin/technicians (mỗi tài khoản có vai trò TECHNICIAN) và PUT .../profile. */
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

/** day: MONDAY ... SUNDAY; start / end: "HH:mm" giờ địa phương. */
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

/** Lịch bị ảnh hưởng, nằm trong `error.details.conflictingAppointments` của lỗi 409 */
export type ConflictingAppointmentView = {
  appointmentId: string
  surveyRequestId: string | null
  startsAt: string
  endsAt: string
  status: string
  /** SCHEDULING_DISABLED, OUTSIDE_WORKING_HOURS, TECHNICIAN_UNAVAILABLE_PERIOD, BEFORE_EARLIEST_BASE_DEPARTURE, ... */
  problem: string
}
