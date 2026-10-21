/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type AfterSalesReasonRequest = {
  reason?: string | null
}

export type PurchaseRequest = {
  /** Format: uuid */
  contractId?: string
  /** Format: uuid */
  maintenancePackageId?: string | null
  /** Format: uuid */
  disasterPackageId?: string | null
  includeContract?: boolean
}
