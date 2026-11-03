/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type AfterSalesReasonRequest = {
  reason?: string | null
}

export type CompletionDecisionRequest = {
  accept?: boolean
  reason?: string | null
  evidenceFileIds?: string[] | null
}

export type CreateFaultRequest = {
  /** Format: uuid */
  projectId?: string
  description?: string | null
  /** Format: uuid */
  suspectedAssetId?: string | null
  evidenceFileIds?: string[] | null
  /** Format: uuid */
  warrantySourceRequestId?: string | null
  disasterType?: string | null
  /** Format: date-time */
  incidentOccurredAt?: string | null
}

export type OneTimeMaintenanceRequest = {
  /** Format: uuid */
  projectId?: string
  /** Format: date-time */
  preferredStartsAt?: string
  note?: string | null
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
