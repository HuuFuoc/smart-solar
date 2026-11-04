import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { PAYMENT_POLL_MS, shouldPollPayment } from '@/features/contracts/customerContractRules'
import * as contractService from '@/services/customerContractService'
import type { ApiError } from '@/services/api/errors'
import type { SignedDocumentRequest } from '@/types/req/customerContractsReq'
import type { PaymentAttemptView } from '@/types/res/customerAfterSalesRes'
import type { ContractDocumentTarget } from '@/services/contractService'
import type { ContractDocumentUrlView, ContractView } from '@/types/res/customerContractsRes'
import type { ContractPaymentView } from '@/types/res/staffPaymentsRes'

// Hợp đồng lắp đặt của khách. Không cập nhật lạc quan: gửi bản ký, tạo / huỷ link xong (kể cả lỗi) thì tải lại từ server.
// Link mua gói kèm hợp đồng SIGNED trả xong cũng làm hợp đồng thành PAID, nên hook thanh toán gói tải lại khoá `all`

export const customerContractKeys = {
  all: ['customer-contracts'] as const,
  list: () => [...customerContractKeys.all, 'list'] as const,
  detail: (contractId: string) => [...customerContractKeys.all, 'detail', contractId] as const,
  payments: (contractId: string) => [...customerContractKeys.all, 'payments', contractId] as const,
}

export function useMyContractsQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<ContractView[], ApiError>({
    queryKey: customerContractKeys.list(),
    queryFn: contractService.listMyContracts,
    enabled,
  })
}

export function useMyContractQuery(contractId: string | undefined) {
  return useQuery<ContractView, ApiError>({
    queryKey: customerContractKeys.detail(contractId ?? ''),
    queryFn: () => contractService.getMyContract(contractId!),
    enabled: Boolean(contractId),
  })
}

export function useSubmitSignedDocumentMutation() {
  const queryClient = useQueryClient()
  return useMutation<ContractView, ApiError, { contractId: string; body: SignedDocumentRequest }>({
    mutationFn: ({ contractId, body }) => contractService.submitSignedDocument(contractId, body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: customerContractKeys.all }),
  })
}

/**
 * Trạng thái thanh toán của một hợp đồng (backend đối soát với PayOS mỗi lần gọi khi link còn chờ). Hỏi lại mỗi 5 giây khi
 * đang có link chờ trả tiền và tab đang hiện; dừng khi đã có kết quả, khi lỗi, hoặc khi rời trang. Hợp đồng đổi trạng thái
 * (đã nhận tiền) thì tải lại hợp đồng
 */
export function useContractPaymentsQuery(contractId: string, { enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient()
  const query = useQuery<ContractPaymentView, ApiError>({
    queryKey: customerContractKeys.payments(contractId),
    queryFn: () => contractService.getContractPayments(contractId),
    enabled,
    refetchInterval: (q) => (q.state.status !== 'error' && shouldPollPayment(q.state.data) ? PAYMENT_POLL_MS : false),
    refetchIntervalInBackground: false,
  })
  const reported = query.data?.contractStatus
  useEffect(() => {
    if (!reported) return
    const cached = queryClient.getQueryData<ContractView>(customerContractKeys.detail(contractId))
    if (!cached || cached.status === reported) return
    void queryClient.invalidateQueries({ queryKey: customerContractKeys.detail(contractId) })
    void queryClient.invalidateQueries({ queryKey: customerContractKeys.list() })
  }, [reported, contractId, queryClient])
  return query
}

/** Tạo link PayOS (hoặc nhận lại link còn sống). Chỉ gọi khi khách bấm, không gọi theo mỗi lần vẽ */
export function useCreateContractPaymentMutation() {
  const queryClient = useQueryClient()
  return useMutation<PaymentAttemptView, ApiError, string>({
    mutationFn: contractService.createContractPayment,
    onSettled: (_data, _error, contractId) =>
      queryClient.invalidateQueries({ queryKey: customerContractKeys.payments(contractId) }),
  })
}

/** Xin link ký sẵn của PDF chính thức / bản ký của chính khách khi bấm. Không lưu link vào cache: link hết hạn sau vài phút */
export function useMyContractDocumentUrlMutation() {
  return useMutation<ContractDocumentUrlView, ApiError, ContractDocumentTarget>({
    mutationFn: ({ contractId, submissionId, disposition }) =>
      submissionId
        ? contractService.getSubmissionUrl(contractId, submissionId, disposition)
        : contractService.getOfficialDocumentUrl(contractId, disposition),
  })
}

export function useCancelContractPaymentMutation() {
  const queryClient = useQueryClient()
  return useMutation<PaymentAttemptView, ApiError, string>({
    mutationFn: contractService.cancelContractPayment,
    onSettled: (_data, _error, contractId) =>
      queryClient.invalidateQueries({ queryKey: customerContractKeys.payments(contractId) }),
  })
}
