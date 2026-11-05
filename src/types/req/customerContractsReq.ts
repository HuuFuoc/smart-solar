/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type SignedDocumentRequest = {
  /** Format: uuid */
  fileId?: string
  officialDocumentSha256?: string | null
}
