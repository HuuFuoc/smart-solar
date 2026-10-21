import type { CreateCustomerProfileRequest, CreatePropertySiteRequest } from '@/types/req/customersReq'
import type { UpdatePreSurveySurfaceRequest } from '@/types/req/preSurveySurfaceReq'
import type { CreatePreSurveyRequest, UpdatePreSurveyRequest } from '@/types/req/preSurveysReq'
import type { CreateCustomerProfileResponse, CreatePropertySiteResponse } from '@/types/res/customersRes'
import type { PreSurveySurfaceView, UpdatePreSurveySurfaceResponse } from '@/types/res/preSurveySurfaceRes'
import type { CreatePreSurveyResponse, SubmitPreSurveyResponse } from '@/types/res/preSurveysRes'
import { get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// API phía khách hàng: hồ sơ, địa điểm, bản nháp đánh giá, mặt lắp, gửi

/** Gọi lần hai trả CUSTOMER_ALREADY_EXISTS */
export function createCustomerProfile(body: CreateCustomerProfileRequest) {
  return post<CreateCustomerProfileResponse>(ENDPOINTS.customers.base, body)
}

/** Chưa có hồ sơ thì trả CUSTOMER_PROFILE_NOT_FOUND */
export function createPropertySite(body: CreatePropertySiteRequest) {
  return post<CreatePropertySiteResponse>(ENDPOINTS.customers.sites, body)
}

/** Tạo bản nháp cho một địa điểm của khách */
export function createPreSurvey(body: CreatePreSurveyRequest) {
  return post<CreatePreSurveyResponse>(ENDPOINTS.preSurveys.base, body)
}

/** Ghi số liệu khai. Độ dốc, hướng trùng cột với mặt lắp, ghi khác đi thì mô phỏng bị đánh dấu cũ */
export function updatePreSurvey(id: string, body: UpdatePreSurveyRequest) {
  return put<unknown>(ENDPOINTS.preSurveys.byId(id), body)
}

/** Cách duy nhất để đọc lại một bản nháp */
export function getSurface(id: string) {
  return get<PreSurveySurfaceView>(ENDPOINTS.preSurveySurface.surface(id))
}

/** expectedRevision cũ thì trả 409 PRE_SURVEY_CONCURRENTLY_MODIFIED */
export function saveSurface(id: string, body: UpdatePreSurveySurfaceRequest) {
  return put<UpdatePreSurveySurfaceResponse>(ENDPOINTS.preSurveySurface.surface(id), body)
}

/** Thiếu số liệu thì trả PRE_SURVEY_INCOMPLETE */
export function submitPreSurvey(id: string) {
  return post<SubmitPreSurveyResponse>(ENDPOINTS.preSurveys.submit(id))
}
