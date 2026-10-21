import type { AssignTechnicianRequest, SalesRescheduleRequest } from '@/types/req/surveyRequestsReq'
import type { TechnicianAvailabilityView } from '@/types/res/technicianAvailabilityRes'
import type {
  AssignmentView,
  ClaimSurveyRequestResponse,
  EscalatedAppointmentView,
  MySurveyRequestItem,
  PendingSurveyRequestItem,
  SalesRescheduleView,
  SurveyRequestDetail,
} from '@/types/res/surveyRequestsRes'
import { get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// API phía sales. Nhận yêu cầu chỉ là nhận chăm sóc khách (không đổi trạng thái lịch)
// Kỹ thuật viên trong khu vực tự nhận lịch; sales chỉ phân công khi quá hạn không ai nhận (lý do bắt buộc)

/** Yêu cầu chưa ai nhận */
export function listPendingSurveyRequests() {
  return get<PendingSurveyRequestItem[]>(ENDPOINTS.surveyRequests.pending)
}

/** Yêu cầu sales đang đăng nhập đã nhận */
export function listMySurveyRequests() {
  return get<MySurveyRequestItem[]>(ENDPOINTS.surveyRequests.my)
}

/** GET /api/survey-requests/{id} */
export function getSurveyRequest(id: string) {
  return get<SurveyRequestDetail>(ENDPOINTS.surveyRequests.byId(id))
}

/** Người khác nhận trước thì trả SURVEY_REQUEST_UNAVAILABLE */
export function claimSurveyRequest(id: string) {
  return post<ClaimSurveyRequestResponse>(ENDPOINTS.surveyRequests.claim(id))
}

/** Kỹ thuật viên nhận được giờ khách đã đặt, kèm người không nhận được và lý do */
export function getTechnicianAvailability(surveyRequestId: string) {
  return get<TechnicianAvailabilityView>(ENDPOINTS.technicianAvailability.base, { params: { surveyRequestId } })
}

/** Lịch quá hạn không ai nhận, cần nhân viên phân công */
export function listEscalatedAppointments() {
  return get<EscalatedAppointmentView[]>(ENDPOINTS.surveyRequests.escalated)
}

/** Phân công khi lịch quá hạn không ai nhận (lý do bắt buộc) */
export function assignTechnician(id: string, body: AssignTechnicianRequest) {
  return post<AssignmentView>(ENDPOINTS.surveyRequests.assignTechnician(id), body)
}

/** Đổi người phụ trách lịch đã xác nhận (lý do bắt buộc) */
export function reassignTechnician(id: string, body: AssignTechnicianRequest) {
  return put<AssignmentView>(ENDPOINTS.surveyRequests.reassignTechnician(id), body)
}

/** Không truyền technicianUserId thì giữ người cũ nếu vẫn rảnh, không thì lịch quay về chờ nhận */
export function rescheduleSurveyRequest(id: string, body: SalesRescheduleRequest) {
  return put<SalesRescheduleView>(ENDPOINTS.surveyRequests.reschedule(id), body)
}
