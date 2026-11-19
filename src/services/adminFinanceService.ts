import type { FinanceOverviewView } from '@/types/res/paymentPlanRes'
import { get } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Báo cáo tài chính hợp đồng lắp đặt (chỉ quản trị). `from` / `to` là ngày theo giờ Việt Nam (YYYY-MM-DD), tối đa 366 ngày;
// bỏ trống là tháng này. `zoneId` lọc theo khu vực của dự án thi công

export type FinanceQuery = { from?: string; to?: string; zoneId?: string }

export function getFinanceOverview(query: FinanceQuery) {
  return get<FinanceOverviewView>(ENDPOINTS.adminFinance.overview, { params: query })
}
