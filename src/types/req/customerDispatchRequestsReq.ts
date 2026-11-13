/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type AcceptDispatchProposalRequest = {
  /** Format: int32 */
  expectedRevision?: number | null
}

export type CancelDispatchRequestRequest = {
  reason?: string | null
}

export type CreateDispatchRequestRequest = {
  preferredWindows?: PreferredWindowRequest[] | null
  note?: string | null
}

export type DeclineDispatchProposalRequest = {
  reason?: string | null
  /** Format: int32 */
  expectedRevision?: number | null
}

export type PreferredWindowRequest = {
  startsAt?: string | null
  endsAt?: string | null
}
