// Viết tay vì swagger của tag SalesAfterSales chỉ khai "200 OK". Theo SalesTaskView, WarrantyOptionView của backend `main` (6025bc1)

/** Một việc trong hàng đợi kinh doanh. `taskType`: REPAIR_QUOTATION | MAINTENANCE_QUOTATION | MAINTENANCE_FOLLOW_UP | ACCEPTANCE_FOLLOW_UP */
export type SalesTaskView = {
  taskId: string
  taskType: string
  /** OPEN | CLAIMED | IN_PROGRESS | DONE | CANCELLED */
  status: string
  requestId: string | null
  entitlementId: string | null
  customerUserId: string
  assignedSalesUserId: string | null
  claimedAt: string | null
  startedAt: string | null
  completedAt: string | null
  outcome: string | null
  note: string | null
  createdAt: string
  revision: number
}

/** GET /api/sales/after-sales/warranty-options?kind=REPAIR: thời hạn bảo hành sửa chữa đang dùng */
export type WarrantyOptionView = {
  optionId: string
  kind: string
  months: number
  isDefault: boolean
  isActive: boolean
}
