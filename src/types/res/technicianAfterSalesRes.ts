import type {
  InstalledAssetView,
  ServiceEvidenceView,
  ServiceItemView,
  ServiceRequestKind,
} from '@/types/res/customerAfterSalesRes'

// Viết tay vì swagger của tag TechnicianAfterSales chỉ khai "200 OK". Theo TechnicianVisitView của image backend đang chạy
// (bản 21/10 có thêm `evidence`)

/** GET /api/technicians/me/after-sales/visits (không gồm buổi đã huỷ) và mọi thao tác ghi trên một buổi hẹn */
export type TechnicianVisitView = {
  visitId: string
  requestId: string
  requestNumber: string
  requestKind: ServiceRequestKind
  /** INSPECTION | REPAIR | MAINTENANCE | REWORK */
  purpose: string
  /** SCHEDULED | IN_PROGRESS | REPORTED | CUSTOMER_ABSENT | DECLINED */
  status: string
  /** PENDING: chờ bạn nhận; ACCEPTED: đã nhận */
  assignmentStatus: string | null
  startsAt: string
  endsAt: string
  customerConfirmationRequired: boolean
  customerConfirmedAt: string | null
  siteAddress: string | null
  description: string
  items: ServiceItemView[]
  assets: InstalledAssetView[]
  /** Đã báo cáo kiểm tra và đang chờ tại công trình để sửa luôn */
  waitingOnSite: boolean
  /** Ảnh đã gắn vào buổi hẹn này */
  evidence: ServiceEvidenceView[]
}
