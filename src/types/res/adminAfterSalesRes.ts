// Viết tay vì swagger của tag AdminAfterSales chỉ khai "200 OK". Theo AfterSalesViews.cs, AfterSalesDashboard.cs của backend
// `main` (7c79fa8), cùng bản với image smartsolar-api build 21/10/2026

/** GET /api/admin/after-sales/warranty-options: cùng bản ghi với phía kinh doanh, kèm cả tuỳ chọn đã tắt */
export type { WarrantyOptionView } from '@/types/res/salesAfterSalesRes'

/** Một chỉ số của báo cáo, hai kỳ. `changePercent` null khi kỳ so sánh bằng 0 */
export type DashboardMetric = {
  key: string
  /** Câu mô tả tiếng Anh của backend, FE dịch theo `key` */
  description: string
  current: number
  previous: number
  changePercent: number | null
}

/** GET /api/admin/after-sales/dashboard: hai khoảng ngày (theo giờ Việt Nam, tính cả hai đầu) sau khi backend điền mặc định */
export type DashboardView = {
  /** Format: date */
  from: string
  /** Format: date */
  to: string
  /** Format: date */
  compareFrom: string
  /** Format: date */
  compareTo: string
  metrics: DashboardMetric[]
}

/** Một nhóm của số liệu tổng quan: số lượng, và số tiền VND khi là tiền (backend 8f70cb2, OverviewBucket) */
export type OverviewBucket = { key: string; count: number; amount: number | null }

export type OverviewRoleAccounts = {
  role: string
  total: number
  active: number
  pendingVerification: number
  inactive: number
}

/**
 * GET /api/admin/after-sales/dashboard/overview (AdminOverviewView). Khối "hiện tại" là trạng thái lúc gọi; khối "trong kỳ" đếm
 * trong [from, to]. Giá trị báo giá là tiền chào, không phải tiền đã nhận; tiền mặt chờ thu chưa phải tiền đã nhận
 */
export type AdminOverviewView = {
  from: string
  to: string
  generatedAt: string
  accounts: OverviewRoleAccounts[]
  surveyRequestsByStatus: OverviewBucket[]
  outstandingSurveyAppointments: number
  installationQuotationsByStatus: OverviewBucket[]
  contractsByStatus: OverviewBucket[]
  contractsWithOfficialPdf: number
  contractsWithSignedScan: number
  signedScansUploadedByStaff: number
  installationProjectsByStatus: OverviewBucket[]
  installationSchedulesByStatus: OverviewBucket[]
  openInstallationSlotOffers: number
  serviceRequestsByKindAndStatus: OverviewBucket[]
  serviceQuotationsByStatus: OverviewBucket[]
  serviceQuotationsByIssuer: OverviewBucket[]
  disasterClaimsByStatus: OverviewBucket[]
  subscriptionsByKindAndStatus: OverviewBucket[]
  openSalesTasksByType: OverviewBucket[]
  openServiceVisitsByStatus: OverviewBucket[]
  pendingCashChoices: OverviewBucket
  refundRecordsByStatus: OverviewBucket[]
  paymentAttemptsCreatedByMethodAndStatus: OverviewBucket[]
  collectedByMethod: OverviewBucket[]
  combinedCheckoutsPaid: OverviewBucket
  packageRevenueBySaleChannel: OverviewBucket[]
  installationQuotationValueIssued: OverviewBucket
  serviceQuotationValueIssued: OverviewBucket
}
