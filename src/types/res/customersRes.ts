// Viết tay vì swagger không có schema response (tag Customers)

export type CreateCustomerProfileResponse = {
  /** Format: uuid */
  customerId: string
}

export type CreatePropertySiteResponse = {
  /** Format: uuid */
  propertySiteId: string
}

/** GET /api/customers/me/sites: địa điểm của khách, theo tên */
export type CustomerSiteListItem = {
  siteId: string
  name: string
  province: string | null
  district: string | null
  ward: string | null
  streetLine: string | null
  provinceCode: string | null
  communeCode: string | null
  /** Tên chính thức theo mã phường, xã */
  communeName: string | null
  latitude: number | null
  longitude: number | null
  /** Tên enum in hoa: ROOFTOP, GROUND... Địa điểm khai không chọn mặt lắp thì null */
  installationSurfaceType: string | null
  surfaceMaterial: string | null
  preSurveyCount: number
}

/** GET /api/customers/me/pre-surveys: bản đánh giá của khách. `status`: DRAFT | SUBMITTED */
export type CustomerPreSurveyListItem = {
  preSurveyId: string
  propertySiteId: string
  siteName: string
  status: string
  revision: number
  geometryVersion: number
  totalAreaM2: number | null
  usableAreaM2: number | null
  selectedSimulationId: string | null
  /** Có khi đã gửi */
  surveyRequestId: string | null
  createdAt: string
  updatedAt: string
}

/** Trang kết quả của hai danh sách trên (pageSize tối đa 100) */
export type CustomerListPage<T> = {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}
