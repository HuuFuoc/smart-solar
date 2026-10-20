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

/*
 * Endpoint phía kinh doanh (role SALES). Khách gửi bản đánh giá thì sinh một yêu cầu
 * trạng thái Pending; sales nhận (claim) thì yêu cầu chuyển sang Assigned và thuộc về người đó.
 * Chỉ sales đã nhận mới xem được chi tiết (SURVEY_REQUEST_NOT_ASSIGNED).
 * Từ 12/10/2026: khách tự đặt giờ (hệ thống giữ chỗ một kỹ thuật viên); sales xem kỹ thuật viên rảnh, phân công chính
 * thức (yêu cầu thành Scheduled), đổi người hoặc đổi giờ. Kỹ thuật viên mới / giờ mới thì phải xác nhận nhận việc lại.
 */

/** GET /api/survey-requests/pending – yêu cầu chưa ai nhận */
export function listPendingSurveyRequests() {
  return get<PendingSurveyRequestItem[]>('/survey-requests/pending')
}

/** GET /api/survey-requests/my – yêu cầu sales đang đăng nhập đã nhận */
export function listMySurveyRequests() {
  return get<MySurveyRequestItem[]>('/survey-requests/my')
}

/** GET /api/survey-requests/{id} */
export function getSurveyRequest(id: string) {
  return get<SurveyRequestDetail>(`/survey-requests/${encodeURIComponent(id)}`)
}

/** POST /api/survey-requests/{id}/claim – người khác nhận trước thì trả SURVEY_REQUEST_UNAVAILABLE */
export function claimSurveyRequest(id: string) {
  return post<ClaimSurveyRequestResponse>(`/survey-requests/${encodeURIComponent(id)}/claim`)
}

/**
 * GET /api/technicians/availability?surveyRequestId=…[&startsAt=…&endsAt=…] – kỹ thuật viên nhận được lịch, đã kiểm tra
 * đường đi. Không truyền giờ thì dùng giờ khách đã đặt; truyền `startsAt` (có offset) để thử một giờ khác trước khi đổi giờ.
 */
export function getTechnicianAvailability(surveyRequestId: string, startsAt?: string) {
  return get<TechnicianAvailabilityView>('/technicians/availability', {
    params: startsAt ? { surveyRequestId, startsAt } : { surveyRequestId },
  })
}

/** POST /api/survey-requests/{id}/assign-technician – phân công chính thức; yêu cầu thành Scheduled. */
export function assignTechnician(id: string, body: AssignTechnicianRequest) {
  return post<AssignmentView>(`/survey-requests/${encodeURIComponent(id)}/assign-technician`, body)
}

/** PUT /api/survey-requests/{id}/reassign-technician – đổi người; người cũ đã xác nhận thì xác nhận đó mất hiệu lực. */
export function reassignTechnician(id: string, body: AssignTechnicianRequest) {
  return put<AssignmentView>(`/survey-requests/${encodeURIComponent(id)}/reassign-technician`, body)
}

/** PUT /api/survey-requests/{id}/reschedule – đổi giờ (kèm `technicianUserId` để đổi cả người); lỗi thì lịch cũ giữ nguyên. */
export function rescheduleSurveyRequest(id: string, body: SalesRescheduleRequest) {
  return put<SalesRescheduleView>(`/survey-requests/${encodeURIComponent(id)}/reschedule`, body)
}
