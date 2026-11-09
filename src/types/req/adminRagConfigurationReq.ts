/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type ActivateRagConfigurationRequest = {
  /** Format: int32 */
  expectedRevision?: number
}

export type RollbackRagConfigurationRequest = {
  /** Format: int32 */
  version?: number
}

export type SaveRagConfigurationDraftRequest = {
  generationModel?: string | null
  temperature?: unknown
  /** Format: int32 */
  maxOutputTokens?: number | null
  /** Format: int32 */
  chunkCharacters?: number | null
  /** Format: int32 */
  chunkOverlap?: number | null
  /** Format: int32 */
  topK?: number | null
  /** Format: double */
  minScore?: number | null
  /** Format: int32 */
  maxContextTokens?: number | null
  /** Format: int32 */
  maxHistoryMessages?: number | null
  promptVersion?: string | null
  notes?: string | null
  /** Format: int32 */
  expectedRevision?: number | null
}
