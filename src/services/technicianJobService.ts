import type { AcceptAppointmentRequest, ReleaseAppointmentRequest } from '@/types/req/technicianAppointmentsReq'
import type { AssignmentView } from '@/types/res/surveyRequestsRes'
import type {
  OpenAppointmentView,
  ReleaseView,
  TechnicianAppointmentListItem,
  TechnicianJobView,
  TechnicianScheduleView,
} from '@/types/res/technicianAppointmentsRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Việc của kỹ thuật viên. Lịch khách đặt hiện cho mọi kỹ thuật viên trong khu vực, ai nhận trước thì được

/** Việc đã xác nhận (tự nhận hoặc được phân công) */
export function listMyAppointments() {
  return get<TechnicianAppointmentListItem[]>(ENDPOINTS.technicianAppointments.base)
}

/** Khách, địa điểm, số liệu khai và mô phỏng đã chọn */
export function getMyAppointment(id: string) {
  return get<TechnicianJobView>(ENDPOINTS.technicianAppointments.byId(id))
}

/** Lịch đang chờ người nhận trong các khu vực của mình */
export function listOpenAppointments() {
  return get<OpenAppointmentView[]>(ENDPOINTS.technicianAppointments.open)
}

/** Người khác nhận trước thì trả 409 APPOINTMENT_ALREADY_TAKEN */
export function acceptAppointment(id: string, body: AcceptAppointmentRequest) {
  return post<AssignmentView>(ENDPOINTS.technicianAppointments.accept(id), body)
}

/** Trả lại việc đã nhận, lịch quay về chờ người khác nhận */
export function releaseAppointment(id: string, body: ReleaseAppointmentRequest) {
  return post<ReleaseView>(ENDPOINTS.technicianAppointments.release(id), body)
}

/** GET /api/technicians/me/schedule?date=YYYY-MM-DD */
export function getMySchedule(date: string) {
  return get<TechnicianScheduleView>(ENDPOINTS.technicianAppointments.schedule, { params: { date } })
}
