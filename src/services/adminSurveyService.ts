import type { AssignTechnicianRequest } from '@/types/req/surveyRequestsReq'
import type { SetSalesOwnerRequest } from '@/types/req/adminSurveyRequestsReq'
import type { AssignmentView, SalesOwnerView } from '@/types/res/surveyRequestsRes'
import { post, put } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Quản lý / quản trị can thiệp lịch khảo sát mà không cần là kinh doanh phụ trách (MANAGER, ADMIN). Cả hai bắt buộc lý do ≤ 500.
// Người được chọn lấy từ nguồn thật: kỹ thuật viên từ GET /technicians/availability, kinh doanh từ danh sách tài khoản

const api = ENDPOINTS.adminSurvey

/** Phân công thẳng kỹ thuật viên cho lịch đang có; gửi `expectedRevision` của lịch lấy từ availability để không ghi đè */
export function overrideSurveyTechnician(appointmentId: string, body: AssignTechnicianRequest) {
  return post<AssignmentView>(api.assignTechnician(appointmentId), body)
}

/** Đổi nhân viên kinh doanh phụ trách yêu cầu. Trường là `saleUserId` (khác `salesUserId` của API giao việc sau bán) */
export function setSurveySalesOwner(surveyRequestId: string, body: SetSalesOwnerRequest) {
  return put<SalesOwnerView>(api.salesOwner(surveyRequestId), body)
}
