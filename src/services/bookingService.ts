import type { BookSurveyAppointmentRequest, CancelSurveyAppointmentRequest } from '@/types/req/customerSurveyRequestsReq'
import type {
  BookingConfirmation,
  CustomerAppointmentView,
  CustomerSurveyRequestDetailView,
  CustomerSurveyRequestView,
} from '@/types/res/customerSurveyRequestsRes'
import type { SurveySlotsView } from '@/types/res/surveySlotsRes'
import { get, post, put } from '@/services/api/client'

/*
 * Khách hàng tự đặt giờ khảo sát (role CUSTOMER, tag SurveySlots + CustomerSurveyRequests). Đặt giờ là giữ chỗ ngay một
 * kỹ thuật viên phù hợp (khách không thấy là ai); yêu cầu vẫn Pending cho tới khi kinh doanh phân công chính thức.
 * Khách đổi giờ / huỷ được khi lịch còn BOOKED và chưa tới giờ.
 */

const base = '/customers/me/survey-requests'
const path = (id: string) => `${base}/${encodeURIComponent(id)}`

/** GET /api/survey-slots?propertySiteId=&date=YYYY-MM-DD – chỉ các giờ đã kiểm tra được người + đường đi. */
export function getSurveySlots(propertySiteId: string, date: string) {
  return get<SurveySlotsView>('/survey-slots', { params: { propertySiteId, date } })
}

/** GET /api/customers/me/survey-requests */
export function listMyRequests() {
  return get<CustomerSurveyRequestView[]>(base)
}

/** GET /api/customers/me/survey-requests/{id} – kèm lịch sử các lần đặt. */
export function getMyRequest(id: string) {
  return get<CustomerSurveyRequestDetailView>(path(id))
}

/** POST …/booking – 201 tạo mới; gửi lại đúng giờ cũ thì 200 với created=false (không phải lỗi). */
export function bookAppointment(id: string, body: BookSurveyAppointmentRequest) {
  return post<BookingConfirmation>(`${path(id)}/booking`, body)
}

/** PUT …/booking – đổi sang giờ khác khi còn BOOKED (lịch cũ giữ làm lịch sử). */
export function rescheduleAppointment(id: string, body: BookSurveyAppointmentRequest) {
  return put<BookingConfirmation>(`${path(id)}/booking`, body)
}

/** POST …/booking/cancel – nhả chỗ của kỹ thuật viên; lý do tối đa 200 ký tự. */
export function cancelAppointment(id: string, body: CancelSurveyAppointmentRequest) {
  return post<CustomerAppointmentView>(`${path(id)}/booking/cancel`, body)
}
