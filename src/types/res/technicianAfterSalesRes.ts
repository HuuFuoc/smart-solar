import type { CashReceiptView } from '@/types/res/cashReceiptsRes'
import type {
  InstalledAssetView,
  PaymentAttemptView,
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

/**
 * GET /api/technicians/me/after-sales/quotations/{id}/payment (backend 462733c, ServiceQuotationPaymentView). `quotationStatus`:
 * ISSUED | ACCEPTED | PAID | REJECTED | SUPERSEDED | EXPIRED | CANCELLED. `nothingToPay`: gói / bảo hành chịu hết (`customerAmount`
 * = 0), đồng ý là được làm ngay, không có thanh toán 0 đồng. `current`: lần đang mở hoặc đã trả, null khi chưa mở
 */
export type ServiceQuotationPaymentView = {
  quotationId: string
  version: number
  quotationStatus: string
  customerAmount: number
  nothingToPay: boolean
  current: PaymentAttemptView | null
  /**
   * Phiếu thu của lần thanh toán đang mở (backend 9ae01e7): phiếu chờ duyệt trước, rồi phiếu đã duyệt, không có thì phiếu mới
   * nhất (vd. bị yêu cầu bổ sung). Null khi chưa gửi phiếu nào
   */
  currentCashReceipt?: CashReceiptView | null
  /** Mọi phiếu đã gửi cho báo giá này, cũ trước */
  cashReceipts?: CashReceiptView[] | null
}
