// Viết tay vì swagger của tag ManagerAfterSales chỉ khai "200 OK"

/** Tài khoản kinh doanh đang hoạt động để giao việc (GET /api/manager/after-sales/sales-assignees, quản lý và quản trị) */
export type SalesAssigneeView = {
  userId: string
  fullName: string
}
