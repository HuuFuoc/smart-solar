/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */
import type { PricingIssue, QuotationView } from '@/types/res/managerQuotationApprovalsRes'

export type AutomaticQuotationResult = {
  outcome?: string | null
  quotation?: QuotationView
  issues?: PricingIssue[] | null
}
