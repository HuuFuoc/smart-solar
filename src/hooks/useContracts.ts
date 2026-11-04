import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as contractService from '@/services/contractService'
import type { ApiError } from '@/services/api/errors'
import type {
  ContractReviewRequest,
  ContractTermsRequest,
  OfficialDocumentRequest,
} from '@/types/req/salesContractsReq'
import type { ContractDocumentTarget } from '@/services/contractService'
import type { ContractDocumentUrlView, ContractView } from '@/types/res/customerContractsRes'
import type { ContractPaymentView } from '@/types/res/staffPaymentsRes'

// Hợp đồng lắp đặt phía nhân viên. Lệnh ghi thành công thì thay ngay bản đó trong cache; xong (kể cả lỗi 409 vì người khác
// vừa sửa) thì tải lại từ server để lần sau gửi đúng revision mới nhất. Không tự gửi lại lệnh với revision mới

export const contractKeys = {
  all: ['contracts'] as const,
  list: (surveyRequestId: string) => [...contractKeys.all, 'list', surveyRequestId] as const,
  detail: (contractId: string) => [...contractKeys.all, 'detail', contractId] as const,
  payments: (contractId: string) => [...contractKeys.all, 'payments', contractId] as const,
}

/** Hỏi lại trạng thái thanh toán khi hợp đồng đang chờ khách trả tiền (nhân viên không đối soát với PayOS) */
const PAYMENT_REFRESH_MS = 30_000

export function useSurveyRequestContractsQuery(
  surveyRequestId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery<ContractView[], ApiError>({
    queryKey: contractKeys.list(surveyRequestId ?? ''),
    queryFn: () => contractService.listForSurveyRequest(surveyRequestId!),
    enabled: enabled && Boolean(surveyRequestId),
  })
}

export function useContractQuery(contractId: string | undefined) {
  return useQuery<ContractView, ApiError>({
    queryKey: contractKeys.detail(contractId ?? ''),
    queryFn: () => contractService.getContract(contractId!),
    enabled: Boolean(contractId),
  })
}

/** `waiting`: hợp đồng đã ký, chờ khách trả tiền thì tự hỏi lại */
export function useContractPaymentsQuery(
  contractId: string,
  { enabled = true, waiting = false }: { enabled?: boolean; waiting?: boolean } = {},
) {
  return useQuery<ContractPaymentView, ApiError>({
    queryKey: contractKeys.payments(contractId),
    queryFn: () => contractService.getContractPayments(contractId),
    enabled,
    refetchInterval: waiting ? PAYMENT_REFRESH_MS : false,
  })
}

function useContractWrite<V>(write: (variables: V) => Promise<ContractView>) {
  const queryClient = useQueryClient()
  return useMutation<ContractView, ApiError, V>({
    mutationFn: write,
    onSuccess: (view) => {
      queryClient.setQueryData(contractKeys.detail(view.contractId), view)
      queryClient.setQueryData<ContractView[]>(contractKeys.list(view.surveyRequestId), (list) =>
        list?.some((c) => c.contractId === view.contractId)
          ? list.map((c) => (c.contractId === view.contractId ? view : c))
          : list && [...list, view],
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: contractKeys.all }),
  })
}

export function useCreateContractMutation() {
  return useContractWrite(
    ({ quotationId, body }: { quotationId: string; body: Omit<ContractTermsRequest, 'revision'> }) =>
      contractService.createFromQuotation(quotationId, body),
  )
}

export function useUpdateContractDraftMutation() {
  return useContractWrite(({ contractId, body }: { contractId: string; body: ContractTermsRequest }) =>
    contractService.updateDraft(contractId, body),
  )
}

export function useIssueContractMutation() {
  return useContractWrite(({ contractId, revision }: { contractId: string; revision: number }) =>
    contractService.issueContract(contractId, { revision }),
  )
}

export function useAttachOfficialDocumentMutation() {
  return useContractWrite(({ contractId, body }: { contractId: string; body: OfficialDocumentRequest }) =>
    contractService.attachOfficialDocument(contractId, body),
  )
}

export function usePublishContractMutation() {
  return useContractWrite(({ contractId, revision }: { contractId: string; revision: number }) =>
    contractService.publishContract(contractId, { revision }),
  )
}

export function useReviewContractMutation() {
  return useContractWrite(({ contractId, body }: { contractId: string; body: ContractReviewRequest }) =>
    contractService.reviewSignature(contractId, body),
  )
}

export function useCreateAmendmentMutation() {
  return useContractWrite(
    ({ contractId, body }: { contractId: string; body: Omit<ContractTermsRequest, 'revision'> }) =>
      contractService.createAmendment(contractId, body),
  )
}

/** Xin link ký sẵn của PDF chính thức / một bản ký khi người dùng bấm. Không lưu link vào cache: link hết hạn sau vài phút */
export function useContractDocumentUrlMutation() {
  return useMutation<ContractDocumentUrlView, ApiError, ContractDocumentTarget>({
    mutationFn: ({ contractId, submissionId, disposition }) =>
      submissionId
        ? contractService.getSubmissionUrl(contractId, submissionId, disposition)
        : contractService.getOfficialDocumentUrl(contractId, disposition),
  })
}
