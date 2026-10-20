import type { AssignTechnicianRequest, SalesRescheduleRequest } from '@/types/req/surveyRequestsReq'
import type { TechnicianAvailabilityView } from '@/types/res/technicianAvailabilityRes'
import type {
  AssignmentView,
  ClaimSurveyRequestResponse,
  MySurveyRequestItem,
  PendingSurveyRequestItem,
  SalesRescheduleView,
  SurveyRequestDetail,
} from '@/types/res/surveyRequestsRes'
import { get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// API phía sales: nhận yêu cầu, xem kỹ thuật viên rảnh, phân công, đổi giờ

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

/** Không truyền startsAt thì dùng giờ khách đã đặt */
export function getTechnicianAvailability(surveyRequestId: string, startsAt?: string) {
  return get<TechnicianAvailabilityView>(ENDPOINTS.technicianAvailability.base, {
    params: startsAt ? { surveyRequestId, startsAt } : { surveyRequestId },
  })
}

/** Phân công chính thức, yêu cầu thành Scheduled */
export function assignTechnician(id: string, body: AssignTechnicianRequest) {
  return post<AssignmentView>(ENDPOINTS.surveyRequests.assignTechnician(id), body)
}

/** Đổi người thì xác nhận của người cũ mất hiệu lực */
export function reassignTechnician(id: string, body: AssignTechnicianRequest) {
  return put<AssignmentView>(ENDPOINTS.surveyRequests.reassignTechnician(id), body)
}

/** Truyền thêm technicianUserId để đổi cả người */
export function rescheduleSurveyRequest(id: string, body: SalesRescheduleRequest) {
  return put<SalesRescheduleView>(ENDPOINTS.surveyRequests.reschedule(id), body)
}
