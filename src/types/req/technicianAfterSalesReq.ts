/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type AbsenceRequest = {
  note?: string | null
}

export type DiagnosedItemRequest = {
  /** Format: uuid */
  assetId?: string | null
  description?: string | null
  diagnosis?: string | null
  requiredParts?: string | null
}

export type InspectionReportRequest = {
  report?: string | null
  noFaultFound?: boolean
  items?: DiagnosedItemRequest[] | null
  stayOnSite?: boolean
}

export type ItemResultRequest = {
  /** Format: uuid */
  itemId?: string
  workResult?: string | null
  partsUsed?: string | null
}

export type ReplacementRequest = {
  /** Format: uuid */
  replacedAssetId?: string
  manufacturer?: string | null
  model?: string | null
  serialNumber?: string | null
  specifications?: string | null
}

export type VisitResponseRequest = {
  accept?: boolean
  reason?: string | null
}

export type WorkReportRequest = {
  report?: string | null
  results?: ItemResultRequest[] | null
  replacements?: ReplacementRequest[] | null
  findingNote?: string | null
}
