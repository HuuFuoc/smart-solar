/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type FinanceOverviewView = {
  /** Format: date */
  from?: string
  /** Format: date */
  to?: string
  /** Format: uuid */
  zoneId?: string | null
  /** Format: date-time */
  generatedAt?: string
  paymentPlanContracts?: MoneyBucket
  legacyContracts?: MoneyBucket
  depositsPaid?: MoneyBucket
  depositsDue?: MoneyBucket
  balancesPending?: MoneyBucket
  balancesDue?: MoneyBucket
  balancesOverdue?: MoneyBucket
  balancesPaid?: MoneyBucket
  /** Format: int32 */
  balancesPaidLate?: number
  outstanding?: MoneyBucket
  outstandingDueNow?: MoneyBucket
  awaitingAcceptance?: MoneyBucket
  acceptedUnpaid?: MoneyBucket
  fullyPaid?: MoneyBucket
  contractsByStage?: MoneyBucket[] | null
  openCollectionCasesByStatus?: MoneyBucket[] | null
  negotiations?: MoneyBucket
  escalations?: MoneyBucket
  depositsCollected?: MoneyBucket
  balancesCollected?: MoneyBucket
  installmentsCollectedByMethod?: MoneyBucket[] | null
  legacyContractPaymentsCollected?: MoneyBucket
  unapplied?: MoneyBucket
  refunded?: MoneyBucket
  collectedByComponent?: MoneyBucket[] | null
}

export type MoneyBucket = {
  key?: string | null
  /** Format: int32 */
  count?: number
  /** Format: double */
  amount?: number
}
