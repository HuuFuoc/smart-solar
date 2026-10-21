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

// Khách tự đặt giờ khảo sát, kỹ thuật viên trong khu vực tự nhận lịch. Đổi / huỷ được khi còn đủ xa giờ hẹn

/** Luôn 200: không có giờ thì coverageStatus cho biết vì sao */
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

/** PUT .../booking, đổi sang giờ khác (lịch cũ giữ làm lịch sử), lịch quay về chờ kỹ thuật viên nhận */
export function rescheduleAppointment(id: string, body: BookSurveyAppointmentRequest) {
  return put<BookingConfirmation>(ENDPOINTS.customerSurveyRequests.booking(id), body)
}

/** POST .../booking/cancel, nhả chỗ của kỹ thuật viên. Lý do tối đa 200 ký tự */
export function cancelAppointment(id: string, body: CancelSurveyAppointmentRequest) {
  return post<CustomerAppointmentView>(ENDPOINTS.customerSurveyRequests.bookingCancel(id), body)
}
