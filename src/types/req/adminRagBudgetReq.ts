/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type UpdateRagBudgetRequest = {
  /** Format: int32 */
  expectedActiveVersion?: number | null
  /** Format: double */
  dailyBudgetUsd?: number | null
  /** Format: double */
  monthlyBudgetUsd?: number | null
  /** Format: double */
  monthlyIngestionBudgetUsd?: number | null
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
  generationEnabled?: boolean | null
  notes?: string | null
}
