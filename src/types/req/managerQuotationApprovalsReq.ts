/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type PricingApprovalDecisionRequest = {
  /** Format: int32 */
  revision?: number
  approve?: boolean | null
  reason?: string | null
}
