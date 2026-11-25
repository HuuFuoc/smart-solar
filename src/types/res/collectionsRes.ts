/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type CollectionActivityView = {
  /** Format: uuid */
  activityId?: string
  kind?: string | null
  fromStatus?: string | null
  toStatus?: string | null
  /** Format: uuid */
  actorUserId?: string | null
  actorRole?: string | null
  channel?: string | null
  summary?: string | null
  /** Format: date */
  promisedPaymentDate?: string | null
  evidenceFileIds?: string[] | null
  /** Format: date-time */
  occurredAt?: string
}

export type CollectionCaseView = {
  /** Format: uuid */
  caseId?: string
  /** Format: uuid */
  contractId?: string
  contractNumber?: string | null
  /** Format: uuid */
  installmentId?: string
  /** Format: int32 */
  installmentSequence?: number
  /** Format: uuid */
  customerUserId?: string
  customerName?: string | null
  customerPhone?: string | null
  status?: string | null
  /** Format: date-time */
  openedAt?: string
  /** Format: date-time */
  dueAt?: string
  /** Format: int32 */
  daysOverdue?: number
  /** Format: double */
  amountDue?: number
  installmentStatus?: string | null
  /** Format: date */
  promisedPaymentDate?: string | null
  /** Format: date-time */
  resolvedAt?: string | null
  /** Format: uuid */
  resolvedByUserId?: string | null
  resolution?: string | null
  /** Format: int32 */
  revision?: number
  activities?: CollectionActivityView[] | null
}

export type CollectionCaseViewPagedResult = {
  items?: CollectionCaseView[] | null
  /** Format: int32 */
  page?: number
  /** Format: int32 */
  pageSize?: number
  /** Format: int32 */
  totalItems?: number
  /** Format: int32 */
  totalPages?: number
}
