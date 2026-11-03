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
