import type { CollectionActivityRequest, CollectionDecisionRequest, CollectionQuery } from '@/types/req/paymentPlanReq'
import type { CollectionCaseView, PagedResult } from '@/types/res/paymentPlanRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Theo dõi khoản quá hạn (kinh doanh, quản lý, quản trị). Ghi nhận không đổi tiền, không đổi hạn trong hợp đồng, không đổi quyền
// sở hữu. Chuyển xem xét pháp lý và đóng hồ sơ chỉ quản lý / quản trị. Không có lệnh hoàn tiền, thu hồi hay phạt

const api = ENDPOINTS.collections

export function listCollections(query: CollectionQuery) {
  return get<PagedResult<CollectionCaseView>>(api.base, { params: query })
}

export function getCollection(caseId: string) {
  return get<CollectionCaseView>(api.byId(caseId))
}

export function recordActivity(caseId: string, body: CollectionActivityRequest) {
  return post<CollectionCaseView>(api.activities(caseId), body)
}

export function escalate(caseId: string, body: CollectionDecisionRequest) {
  return post<CollectionCaseView>(api.escalate(caseId), body)
}

export function requestLegalReview(caseId: string, body: CollectionDecisionRequest) {
  return post<CollectionCaseView>(api.legalReview(caseId), body)
}

export function resolve(caseId: string, body: CollectionDecisionRequest) {
  return post<CollectionCaseView>(api.resolve(caseId), body)
}
