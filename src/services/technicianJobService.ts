import type {
  AcknowledgementView,
  TechnicianAppointmentListItem,
  TechnicianJobView,
  TechnicianScheduleView,
} from '@/types/res/technicianAppointmentsRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Việc của kỹ thuật viên: chỉ các lịch đã được phân công chính thức

/** GET /api/technicians/me/appointments */
export function listMyAppointments() {
  return get<TechnicianAppointmentListItem[]>(ENDPOINTS.technicianAppointments.base)
}

/** Khách, địa điểm, số liệu khai, mô phỏng đã chọn và chặng đường tới */
export function getMyAppointment(id: string) {
  return get<TechnicianJobView>(ENDPOINTS.technicianAppointments.byId(id))
}

/** POST .../acknowledge, gửi lại khi đã nhận thì trả alreadyAcknowledged=true */
export function acknowledgeAppointment(id: string) {
  return post<AcknowledgementView>(ENDPOINTS.technicianAppointments.acknowledge(id))
}

/** Lịch một ngày kèm đường đi đã lưu */
export function getMySchedule(date: string) {
  return get<TechnicianScheduleView>(ENDPOINTS.technicianAppointments.schedule, { params: { date } })
}
