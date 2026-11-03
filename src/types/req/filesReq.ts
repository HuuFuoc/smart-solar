/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type PresignedUploadRequest = {
  purpose?: string | null
  fileName?: string | null
  contentType?: string | null
  /** Format: int64 */
  sizeBytes?: number
}

export type RegisterFileRequest = {
  purpose?: string | null
  bucket?: string | null
  objectKey?: string | null
  fileName?: string | null
  contentType?: string | null
  /** Format: int64 */
  sizeBytes?: number
  checksumSha256?: string | null
}
