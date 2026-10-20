import type {
  AcknowledgementView,
  TechnicianAppointmentListItem,
  TechnicianJobView,
  TechnicianScheduleView,
} from '@/types/res/technicianAppointmentsRes'
import { get, post } from '@/services/api/client'

/*
 * Việc của kỹ thuật viên (role TECHNICIAN, tag TechnicianAppointments): chỉ lịch đã được kinh doanh phân công chính thức.
 * Luồng 1 dừng ở bước kỹ thuật viên xác nhận đã nhận việc (ACKNOWLEDGED) – không phải "đã khảo sát xong".
 */

const base = '/technicians/me'

/** GET /api/technicians/me/appointments */
export function listMyAppointments() {
  return get<TechnicianAppointmentListItem[]>(`${base}/appointments`)
}

/** GET /api/technicians/me/appointments/{id} – khách, địa điểm, số liệu khách khai, mô phỏng đã chọn, chặng đường tới. */
export function getMyAppointment(id: string) {
  return get<TechnicianJobView>(`${base}/appointments/${encodeURIComponent(id)}`)
}

/** POST …/acknowledge – gửi lại khi đã nhận thì trả alreadyAcknowledged=true. */
export function acknowledgeAppointment(id: string) {
  return post<AcknowledgementView>(`${base}/appointments/${encodeURIComponent(id)}/acknowledge`)
}

/** GET /api/technicians/me/schedule?date=YYYY-MM-DD – lịch một ngày kèm đường đi đã lưu (không gọi Vietmap). */
export function getMySchedule(date: string) {
  return get<TechnicianScheduleView>(`${base}/schedule`, { params: { date } })
}
