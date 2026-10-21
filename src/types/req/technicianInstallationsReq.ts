/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type AcceptAssignmentRequest = {
  /** Format: int32 */
  expectedRevision?: number | null
}

export type AssetRequest = {
  assetType?: string | null
  /** Format: uuid */
  productId?: string | null
  manufacturer?: string | null
  model?: string | null
  serialNumber?: string | null
  positionCode?: string | null
  /** Format: int32 */
  warrantyMonths?: number | null
}

export type AssetsRequest = {
  assets?: AssetRequest[] | null
}

export type CompletionReportRequest = {
  completionReport?: string | null
  /** Format: int32 */
  expectedRevision?: number | null
}

export type DeclineAssignmentRequest = {
  reason?: string | null
  /** Format: int32 */
  expectedRevision?: number | null
}

export type EvidenceRequest = {
  /** Format: uuid */
  fileId?: string
  caption?: string | null
}
