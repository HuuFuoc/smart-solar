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
  reasoningEffort?: unknown
  generationEnabled?: boolean | null
  /** Format: int32 */
  userRequestsPerDay?: number | null
  /** Format: int32 */
  userConcurrency?: number | null
  /** Format: int32 */
  globalConcurrency?: number | null
  /** Format: int32 */
  maxQuestionCharacters?: number | null
  /** Format: int32 */
  generationTimeoutSeconds?: number | null
  /** Format: double */
  dailyBudgetUsd?: number | null
  /** Format: double */
  monthlyBudgetUsd?: number | null
  /** Format: double */
  monthlyIngestionBudgetUsd?: number | null
}
