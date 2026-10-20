import type {
  AcknowledgementView,
  TechnicianAppointmentListItem,
  TechnicianJobView,
  TechnicianScheduleView,
} from '@/types/res/technicianAppointmentsRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

/*
 * Việc của kỹ thuật viên (role TECHNICIAN, tag TechnicianAppointments): chỉ lịch đã được kinh doanh phân công chính thức.
 * Luồng 1 dừng ở bước kỹ thuật viên xác nhận đã nhận việc (ACKNOWLEDGED) – không phải "đã khảo sát xong".
 */

/** GET /api/technicians/me/appointments */
export function listMyAppointments() {
  return get<TechnicianAppointmentListItem[]>(ENDPOINTS.technicianAppointments.base)
}

/** GET /api/technicians/me/appointments/{id} – khách, địa điểm, số liệu khách khai, mô phỏng đã chọn, chặng đường tới. */
export function getMyAppointment(id: string) {
  return get<TechnicianJobView>(ENDPOINTS.technicianAppointments.byId(id))
}

/** POST …/acknowledge – gửi lại khi đã nhận thì trả alreadyAcknowledged=true. */
export function acknowledgeAppointment(id: string) {
  return post<AcknowledgementView>(ENDPOINTS.technicianAppointments.acknowledge(id))
}

/** GET /api/technicians/me/schedule?date=YYYY-MM-DD – lịch một ngày kèm đường đi đã lưu (không gọi Vietmap). */
export function getMySchedule(date: string) {
  return get<TechnicianScheduleView>(ENDPOINTS.technicianAppointments.schedule, { params: { date } })
}
