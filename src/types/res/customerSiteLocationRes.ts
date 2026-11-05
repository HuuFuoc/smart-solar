// Viết tay vì swagger của tag CustomerSiteLocation chỉ khai "200 OK". Theo record C# của backend `main` (7c79fa8):
// Modules.Scheduling.Zones.ZoneHandlers (SiteLocationView), Scheduling.PreSurveyAppointments.Views (ZoneView)
import type { ZoneView } from '@/types/res/surveyRequestsRes'
import type { CoverageStatus } from '@/types/res/surveySlotsRes'

/**
 * PUT /api/customers/me/sites/{siteId}/administrative-location. `coverageStatus` chỉ xét khu vực (COVERED, NO_ZONE_COVERAGE,
 * ZONE_NOT_SERVICEABLE), không xét kỹ thuật viên còn trống hay không
 */
export type SiteLocationView = {
  propertySiteId: string
  provinceCode: string
  communeCode: string
  communeName: string | null
  coverageStatus: CoverageStatus
  /** Khu đang phục vụ phường, xã này; null khi chưa thuộc khu nào */
  zone: ZoneView | null
}
