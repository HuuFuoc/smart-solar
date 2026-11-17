import type {
  BookSurveyAppointmentRequest,
  CancelSurveyAppointmentRequest,
  DirectSurveyBookingRequest,
} from '@/types/req/customerSurveyRequestsReq'
import type {
  BookingConfirmation,
  DirectSurveyBookingView,
  CustomerAppointmentView,
  CustomerSurveyRequestDetailView,
  CustomerSurveyRequestView,
} from '@/types/res/customerSurveyRequestsRes'
import type { SalesOutcomeView } from '@/types/res/surveyRequestsRes'
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

/**
 * Đặt khảo sát thẳng cho một địa điểm của khách, không qua đánh giá sơ bộ: backend mở (hoặc dùng lại) yêu cầu đặt trực tiếp đang
 * mở của địa điểm rồi giữ chỗ theo đúng luật đặt giờ. 201 khi vừa giữ được chỗ, 200 khi gửi lại đúng giờ cũ. Hết chỗ / khu vực
 * chưa có người nhận thì lỗi kèm `details.surveyRequestId`: yêu cầu vẫn mở, khách chọn giờ khác trên yêu cầu đó (không tạo yêu
 * cầu thứ hai). Địa điểm đang có yêu cầu từ đánh giá sơ bộ thì 409 SURVEY_REQUEST_ALREADY_OPEN kèm mã yêu cầu đó
 */
export function bookDirectSurvey(body: DirectSurveyBookingRequest) {
  return post<DirectSurveyBookingView>(ENDPOINTS.customerSurveyRequests.direct, body)
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

/** Khách rút yêu cầu khi không làm nữa. Còn lịch đang hẹn hoặc đã có hợp đồng thì bị từ chối (409) */
export function withdrawRequest(id: string, reason: string | null) {
  return post<SalesOutcomeView>(ENDPOINTS.customerSurveyRequests.withdraw(id), { reason })
}
