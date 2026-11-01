import type {
  CancellationDecisionRequest,
  CoverageRequest,
  DisputeReviewRequest,
  ScheduleVisitRequest,
} from '@/types/req/managerAfterSalesReq'
import type {
  InstalledAssetView,
  ServiceEvidenceUrlView,
  ServiceRequestSummary,
  ServiceRequestView,
} from '@/types/res/customerAfterSalesRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Yêu cầu bảo hành, sửa chữa, bảo trì phía quản lý và quản trị (backend cho MANAGER, ADMIN)

const api = ENDPOINTS.managerAfterSales

/** Mọi yêu cầu, mọi trạng thái */
export function listRequests() {
  return get<ServiceRequestSummary[]>(api.requests)
}

export function getRequest(requestId: string) {
  return get<ServiceRequestView>(api.request(requestId))
}

/** Link xem ảnh của yêu cầu, ký sẵn và hết hạn sau vài phút */
export function getEvidenceUrl(requestId: string, evidenceId: string) {
  return get<ServiceEvidenceUrlView>(api.evidenceUrl(requestId, evidenceId), { params: { disposition: 'inline' } })
}

/** Xếp buổi hẹn (hoặc đổi buổi chưa bắt đầu, khi đó bắt buộc lý do). Gửi revision của yêu cầu để không ghi đè */
export function scheduleVisit(requestId: string, body: ScheduleVisitRequest) {
  return post<ServiceRequestView>(api.visits(requestId), body)
}

/** Ai chịu chi phí từng hạng mục; hạng mục khách trả tiền sẽ sang kinh doanh báo giá */
export function decideCoverage(requestId: string, body: CoverageRequest) {
  return post<ServiceRequestView>(api.coverage(requestId), body)
}

/** Khách không đồng ý kết quả: bắt làm lại, hoặc giữ kết quả. Bắt buộc ghi lời giải thích cho khách */
export function reviewDispute(requestId: string, body: DisputeReviewRequest) {
  return post<ServiceRequestView>(api.disputeReview(requestId), body)
}

/** Khách xin huỷ việc đã trả tiền: đồng ý (giữ lại chi phí không hoàn được) hoặc từ chối */
export function decideCancellation(requestId: string, body: CancellationDecisionRequest) {
  return post<ServiceRequestView>(api.cancellationDecision(requestId), body)
}

/** Ngày kích hoạt bảo hành hãng của thiết bị (ISO kèm múi giờ, không ở tương lai) + tài liệu PROJECT_DOCUMENT đã xác minh */
export type WarrantyActivationBody = { activatedAt: string; evidenceFileId: string; reason: string }

/** Ghi một lần, không sửa được. Hạn bảo hành = ngày kích hoạt + số tháng của danh mục */
export function recordWarrantyActivation(assetId: string, body: WarrantyActivationBody) {
  return post<InstalledAssetView>(api.warrantyActivation(assetId), body)
}
