// Viết tay vì swagger không có schema response (tag TechnicianAvailability)
import type { AppointmentStatus, ZoneView } from '@/types/res/surveyRequestsRes'

/** Kỹ thuật viên nhận được lịch này */
export type AvailableTechnicianView = {
  technicianUserId: string
  fullName: string
  /** Người hệ thống đang giữ chỗ cho lịch (chưa phải đã nhận việc) */
  isCapacityHolder: boolean
  isAssigned: boolean
  commitmentsThatDay: number
  requiresHoldRehoming: boolean
}

/** Kỹ thuật viên trong khu vực nhưng không nhận được, kèm mã lý do */
export type IneligibleTechnicianView = {
  technicianUserId: string
  fullName: string
  /** TECHNICIAN_INACTIVE, TECHNICIAN_SCHEDULING_DISABLED, TECHNICIAN_OUTSIDE_ZONE, OUTSIDE_WORKING_HOURS, ... */
  reason: string
}

/** GET /api/technicians/availability?surveyRequestId=... */
export type TechnicianAvailabilityView = {
  surveyRequestId: string
  appointmentId: string
  startsAt: string
  endsAt: string
  appointmentStatus: AppointmentStatus
  /** Gửi lại làm expectedRevision khi phân công */
  revision: number
  zone: ZoneView | null
  technicians: AvailableTechnicianView[]
  ineligible: IneligibleTechnicianView[]
}
