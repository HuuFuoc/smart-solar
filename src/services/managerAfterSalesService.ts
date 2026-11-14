import type {
  AssetCorrectionRequest,
  AssignTaskRequest,
  CancellationDecisionRequest,
  CoverageRequest,
  DecisionRequest,
  DisputeReviewRequest,
  DuplicateRequest,
  ScheduleVisitRequest,
  StopWorkRequest,
} from '@/types/req/managerAfterSalesReq'
import type { AfterSalesReasonRequest } from '@/types/req/customerAfterSalesReq'
import type {
  InstalledAssetView,
  ServiceEvidenceUrlView,
  ServiceRequestSummary,
  ServiceRequestView,
} from '@/types/res/customerAfterSalesRes'
import type { SalesAssigneeView } from '@/types/res/managerAfterSalesRes'
import type { SalesTaskView } from '@/types/res/salesAfterSalesRes'
import { get, post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { listUsers } from '@/services/adminUserService'

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

/** Khách xin huỷ việc đã trả tiền: đồng ý hoặc từ chối */
export function decideCancellation(requestId: string, body: CancellationDecisionRequest) {
  return post<ServiceRequestView>(api.cancellationDecision(requestId), body)
}

/**
 * Duyệt / từ chối hỗ trợ của gói thiên tai (claim SUBMITTED hoặc RECONSIDERATION_REQUESTED). Từ chối bắt buộc lý do. Không
 * có revision: hai người cùng quyết định thì người sau nhận AFTER_SALES_INVALID_STATE
 */
export function decideClaim(requestId: string, body: DecisionRequest) {
  return post<ServiceRequestView>(api.claimDecision(requestId), body)
}

/** Đóng yêu cầu thành CLOSED_DUPLICATE, gắn với yêu cầu gốc cùng công trình (backend kiểm cùng công trình, chưa trả tiền) */
export function markDuplicate(requestId: string, body: DuplicateRequest) {
  return post<ServiceRequestView>(api.duplicate(requestId), body)
}

/** Dừng ngoại lệ việc đã bắt đầu, lý do bắt buộc. Nhóm không làm hoàn tiền nên luôn gửi `refundAmount` 0 */
export function stopWork(requestId: string, body: StopWorkRequest) {
  return post<ServiceRequestView>(api.stop(requestId), body)
}

/** Bảo trì lẻ Smart Solar không thực hiện được: huỷ yêu cầu. Lý do bắt buộc */
export function markNotFulfilled(requestId: string, body: AfterSalesReasonRequest) {
  return post<ServiceRequestView>(api.notFulfilled(requestId), body)
}

/** Sửa thông tin thiết bị đã lắp: ô null giữ nguyên, lý do bắt buộc; backend ghi giá trị cũ và mới vào lịch sử */
export function correctAsset(assetId: string, body: AssetCorrectionRequest) {
  return put<InstalledAssetView>(api.asset(assetId), body)
}

/** Tài khoản kinh doanh đang hoạt động để giao việc, đọc từ GET /admin/users (chỉ quản trị gọi được) */
// shortcut: một trang 100 tài khoản kinh doanh; nhiều hơn thì cần ô tìm theo tên
export async function listSalesAssignees(): Promise<SalesAssigneeView[]> {
  const page = await listUsers({ role: 'SALES', status: 'ACTIVE', pageSize: 100, sort: 'name', direction: 'asc' })
  return page.items.map((u) => ({ userId: u.id, fullName: u.fullName }))
}

/** Hàng việc của kinh doanh; không truyền `status` là mọi trạng thái */
export function listTasks(status?: string) {
  return get<SalesTaskView[]>(api.tasks, { params: status ? { status } : undefined })
}

/** Giao việc chưa ai nhận, hoặc giao lại việc đã có người (bắt buộc lý do). Người nhận phải là kinh doanh đang hoạt động */
export function assignTask(taskId: string, body: AssignTaskRequest) {
  return post<SalesTaskView>(api.assignTask(taskId), body)
}

/** Ngày kích hoạt bảo hành hãng của thiết bị (ISO kèm múi giờ, không ở tương lai) + tài liệu PROJECT_DOCUMENT đã xác minh */
export type WarrantyActivationBody = { activatedAt: string; evidenceFileId: string; reason: string }

/** Ghi một lần, không sửa được. Hạn bảo hành = ngày kích hoạt + số tháng của danh mục */
export function recordWarrantyActivation(assetId: string, body: WarrantyActivationBody) {
  return post<InstalledAssetView>(api.warrantyActivation(assetId), body)
}
