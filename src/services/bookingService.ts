import type {
  BookSurveyAppointmentRequest,
  CancelSurveyAppointmentRequest,
} from '@/types/req/customerSurveyRequestsReq'
import type {
  BookingConfirmation,
  CustomerAppointmentView,
  CustomerSurveyRequestDetailView,
  CustomerSurveyRequestView,
} from '@/types/res/customerSurveyRequestsRes'
import type { SurveySlotsView } from '@/types/res/surveySlotsRes'
import { get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Khách tự đặt giờ khảo sát, hệ thống giữ chỗ một kỹ thuật viên. Đổi / huỷ được khi lịch còn BOOKED

/** Chỉ trả các giờ đã kiểm tra được kỹ thuật viên và đường đi */
export function getSurveySlots(propertySiteId: string, date: string) {
  return get<SurveySlotsView>(ENDPOINTS.surveySlots.base, { params: { propertySiteId, date } })
}

/** GET /api/customers/me/survey-requests */
export function listMyRequests() {
  return get<CustomerSurveyRequestView[]>(ENDPOINTS.customerSurveyRequests.base)
}

/** GET /api/customers/me/survey-requests/{id}, kèm lịch sử các lần đặt */
export function getMyRequest(id: string) {
  return get<CustomerSurveyRequestDetailView>(ENDPOINTS.customerSurveyRequests.byId(id))
}

/** 201 tạo mới, gửi lại đúng giờ cũ thì 200 với created=false */
export function bookAppointment(id: string, body: BookSurveyAppointmentRequest) {
  return post<BookingConfirmation>(ENDPOINTS.customerSurveyRequests.booking(id), body)
}

/** PUT .../booking, đổi sang giờ khác khi còn BOOKED (lịch cũ giữ làm lịch sử) */
export function rescheduleAppointment(id: string, body: BookSurveyAppointmentRequest) {
  return put<BookingConfirmation>(ENDPOINTS.customerSurveyRequests.booking(id), body)
}

/** POST .../booking/cancel, nhả chỗ của kỹ thuật viên. Lý do tối đa 200 ký tự */
export function cancelAppointment(id: string, body: CancelSurveyAppointmentRequest) {
  return post<CustomerAppointmentView>(ENDPOINTS.customerSurveyRequests.bookingCancel(id), body)
}
