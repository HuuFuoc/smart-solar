import type { CreateCustomerProfileRequest, CreatePropertySiteRequest } from '@/types/req/customersReq'
import type { UpdatePreSurveySurfaceRequest } from '@/types/req/preSurveySurfaceReq'
import type { CreatePreSurveyRequest, UpdatePreSurveyRequest } from '@/types/req/preSurveysReq'
import type { CreateCustomerProfileResponse, CreatePropertySiteResponse } from '@/types/res/customersRes'
import type { PreSurveySurfaceView, UpdatePreSurveySurfaceResponse } from '@/types/res/preSurveySurfaceRes'
import type { CreatePreSurveyResponse, SubmitPreSurveyResponse } from '@/types/res/preSurveysRes'
import { apiGet, apiPost, apiRequest } from '@/services/api/client'

/*
 * Endpoint phía khách hàng (role CUSTOMER), gọi theo thứ tự:
 * hồ sơ → địa điểm → bản nháp đánh giá → mặt lắp (kích thước + vật cản) → gửi (sinh yêu cầu khảo sát cho sales).
 * Backend không có API liệt kê hồ sơ, địa điểm hay bản nháp của khách; chỉ đọc lại được một bản nháp theo id
 * (GET .../surface), nên màn đánh giá tự nhớ id bản nháp đang làm (xem assessmentDraft.ts).
 */

/** POST /api/customers/me – gọi lần hai trả CUSTOMER_ALREADY_EXISTS */
export function createCustomerProfile(body: CreateCustomerProfileRequest) {
  return apiPost<CreateCustomerProfileResponse>('/customers/me', body)
}

/** POST /api/customers/me/sites – cần hồ sơ khách hàng trước (CUSTOMER_PROFILE_NOT_FOUND) */
export function createPropertySite(body: CreatePropertySiteRequest) {
  return apiPost<CreatePropertySiteResponse>('/customers/me/sites', body)
}

/** POST /api/pre-surveys – tạo bản nháp (status Draft) cho một địa điểm của chính khách hàng */
export function createPreSurvey(body: CreatePreSurveyRequest) {
  return apiPost<CreatePreSurveyResponse>('/pre-surveys', body)
}

/**
 * PUT /api/pre-surveys/{id} – số liệu khai (diện tích, có vật cản) + độ dốc, hướng; chỉ sửa được khi còn là nháp
 * (PRE_SURVEY_NOT_EDITABLE). Độ dốc và hướng dùng chung cột với mặt lắp: gửi giá trị khác là mọi mô phỏng thành cũ.
 */
export function updatePreSurvey(id: string, body: UpdatePreSurveyRequest) {
  return apiRequest<unknown>({ method: 'PUT', url: `/pre-surveys/${encodeURIComponent(id)}`, data: body })
}

/** GET /api/pre-surveys/{id}/surface – mặt lắp + revision / geometryVersion; cũng là cách duy nhất đọc lại một bản nháp. */
export function getSurface(id: string) {
  return apiGet<PreSurveySurfaceView>(`/pre-surveys/${encodeURIComponent(id)}/surface`)
}

/**
 * PUT /api/pre-surveys/{id}/surface – thay toàn bộ kích thước, độ dốc, hướng và danh sách vật cản.
 * `expectedRevision` cũ → 409 PRE_SURVEY_CONCURRENTLY_MODIFIED (không tự ghi đè bản mới hơn).
 */
export function saveSurface(id: string, body: UpdatePreSurveySurfaceRequest) {
  return apiRequest<UpdatePreSurveySurfaceResponse>({ method: 'PUT', url: `/pre-surveys/${encodeURIComponent(id)}/surface`, data: body })
}

/** POST /api/pre-surveys/{id}/submit – thiếu số liệu trả PRE_SURVEY_INCOMPLETE */
export function submitPreSurvey(id: string) {
  return apiPost<SubmitPreSurveyResponse>(`/pre-surveys/${encodeURIComponent(id)}/submit`)
}
