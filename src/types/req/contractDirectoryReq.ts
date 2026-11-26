/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type FinalizeSignatureSetRequest = {
  /** Format: int32 */
  expectedRevision?: number | null
}

export type SignedPageRequest = {
  /** Format: uuid */
  fileId?: string | null
}

export type StartSignatureSetRequest = {
  /** Format: int32 */
  expectedPageCount?: number | null
  /** Format: date */
  signedOn?: string | null
  note?: string | null
}
