// Viết tay vì swagger không có schema response. Theo AdminTechnicianHandlers của backend
import type { ZoneView } from '@/types/res/surveyRequestsRes'

/** GET /api/admin/technicians (mỗi tài khoản có vai trò TECHNICIAN) và PUT .../profile */
export type TechnicianProfileView = {
  technicianUserId: string
  fullName: string
  phone: string | null
  isActiveUser: boolean
  isSchedulingActive: boolean
  /** null = theo mặc định của hệ thống */
  maxAppointmentsPerDay: number | null
  /** Tài khoản ACTIVE + đang nhận lịch + thuộc ít nhất một khu vực */
  readyForScheduling: boolean
  hasCustomWorkingSchedule: boolean
  /** Các khu vực kỹ thuật viên phục vụ */
  zones: ZoneView[]
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
  /** TECHNICIAN_SCHEDULING_DISABLED, OUTSIDE_WORKING_HOURS, TECHNICIAN_ON_LEAVE, TECHNICIAN_OUTSIDE_ZONE, ... */
  problem: string
}
