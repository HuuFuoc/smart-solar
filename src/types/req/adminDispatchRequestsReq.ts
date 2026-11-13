/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type DispatchTechnicianRequest = {
  /** Format: uuid */
  technicianUserId?: string
  startsAt?: string | null
  crossZoneAuthorized?: boolean | null
  reason?: string | null
  /** Format: int32 */
  expectedRevision?: number | null
  note?: string | null
}

export type ResolveDispatchRequestRequest = {
  reason?: string | null
  /** Format: int32 */
  expectedRevision?: number | null
}

export type WithdrawDispatchProposalRequest = {
  reason?: string | null
}
