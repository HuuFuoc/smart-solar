/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type CreateCustomerProfileRequest = {
  customerType?: CustomerType
  companyName?: string | null
  taxCode?: string | null
  note?: string | null
}

export type CreatePropertySiteRequest = {
  name?: string | null
  province?: string | null
  district?: string | null
  ward?: string | null
  streetLine?: string | null
  /** Format: double */
  latitude?: number | null
  /** Format: double */
  longitude?: number | null
  installationSurfaceType?: InstallationSurfaceType
  surfaceMaterial?: string | null
  note?: string | null
  provinceCode?: string | null
  communeCode?: string | null
}

export type CustomerType = 1 | 2

export type InstallationSurfaceType = 1 | 2 | 3 | 4 | 5
