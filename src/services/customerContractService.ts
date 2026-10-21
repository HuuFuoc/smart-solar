import type { ContractView } from '@/types/res/customerContractsRes'
import { get } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Hợp đồng lắp đặt của khách (chỉ đọc). Ký và thanh toán riêng hợp đồng chưa có giao diện

/** GET /api/customers/me/contracts: hợp đồng từ lúc chờ ký trở đi, mới nhất trước */
export function listMyContracts() {
  return get<ContractView[]>(ENDPOINTS.customerContracts.base)
}
