import type { ContractDirectoryQuery } from '@/types/req/paymentPlanReq'
import type { ContractDirectoryItem, PagedResult } from '@/types/res/paymentPlanRes'
import { get } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Danh sách mọi hợp đồng cho kinh doanh, kỹ thuật viên, quản lý, quản trị (chỉ đọc, phân trang ở server, tối đa 100 dòng / trang).
// Đọc không cho quyền ghi: lệnh ghi vẫn theo từng đường của nó

export function listContracts(query: ContractDirectoryQuery) {
  return get<PagedResult<ContractDirectoryItem>>(ENDPOINTS.contractDirectory.base, { params: query })
}
