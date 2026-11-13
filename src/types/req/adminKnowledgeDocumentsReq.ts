/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type AddKnowledgeVersionRequest = {
  /** Format: uuid */
  fileId?: string
}

export type KnowledgeRevisionRequest = {
  /** Format: int32 */
  revision?: number
}

export type PublishKnowledgeVersionRequest = {
  /** Format: uuid */
  versionId?: string
  /** Format: int32 */
  revision?: number
}

export type RegisterKnowledgeDocumentRequest = {
  /** Format: uuid */
  fileId?: string
  title?: string | null
  category?: string | null
  tags?: string[] | null
}

export type ReindexKnowledgeVersionRequest = {
  /** Format: uuid */
  versionId?: string
}

export type SetKnowledgeAudienceRequest = {
  /** Format: int32 */
  revision?: number
  audience?: string | null
  reason?: string | null
}

export type UpdateKnowledgeMetadataRequest = {
  /** Format: int32 */
  revision?: number
  title?: string | null
  category?: string | null
  tags?: string[] | null
}
