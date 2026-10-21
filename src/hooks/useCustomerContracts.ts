import { useQuery } from '@tanstack/react-query'
import * as contractService from '@/services/customerContractService'
import type { ApiError } from '@/services/api/errors'
import type { ContractView } from '@/types/res/customerContractsRes'

// Hợp đồng lắp đặt của khách, đọc để chọn hợp đồng khi mua gói. Link mua gói kèm hợp đồng SIGNED trả xong thì hợp đồng
// thành PAID, nên hook thanh toán tải lại khoá này khi link không còn chờ trả tiền

export const customerContractKeys = {
  all: ['customer-contracts'] as const,
  list: () => [...customerContractKeys.all, 'list'] as const,
}

export function useMyContractsQuery() {
  return useQuery<ContractView[], ApiError>({
    queryKey: customerContractKeys.list(),
    queryFn: contractService.listMyContracts,
  })
}
