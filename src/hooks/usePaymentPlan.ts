import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { INSTALLMENT_CASH_POLL_MS, INSTALLMENT_ONLINE_POLL_MS } from '@/common/paymentPlan'
import { contractKeys } from '@/hooks/useContracts'
import { customerContractKeys } from '@/hooks/useCustomerContracts'
import { customerInstallationKeys } from '@/hooks/useCustomerInstallations'
import { installationScheduleKeys } from '@/hooks/useInstallationSchedules'
import { managerInstallationKeys } from '@/hooks/useManagerInstallations'
import { paymentDeskKeys } from '@/hooks/usePaymentDesk'
import { paymentPlanKeys } from '@/hooks/paymentPlanKeys'
import { technicianQuotationKeys } from '@/hooks/useTechnicianQuotations'
import * as directoryService from '@/services/contractDirectoryService'
import * as customerInstallationService from '@/services/customerInstallationService'
import * as installmentService from '@/services/installmentService'
import type { InstallmentActor, InstallmentTarget } from '@/services/installmentService'
import * as signatureService from '@/services/signatureSetService'
import type { SignatureWriter } from '@/services/signatureSetService'
import type { ApiError } from '@/services/api/errors'
import type {
  ContractDirectoryQuery,
  CustomerAcceptanceRequest,
  InstallmentPaymentRequest,
  StartSignatureSetRequest,
} from '@/types/req/paymentPlanReq'
import type { InstallationCustomerView } from '@/types/res/customerInstallationsRes'
import type {
  AttachedFileUrlView,
  ContractDirectoryItem,
  InstallmentPaymentView,
  PagedResult,
  SignatureSetView,
} from '@/types/res/paymentPlanRes'

// Gói thanh toán 30/70. Không cập nhật lạc quan: mọi lệnh ghi xong (kể cả lỗi, vì trạng thái có thể đã đổi) thì tải lại hợp
// đồng, khoản trả, trang ký, lịch thi công, dự án, bàn thu tiền của cả hai phía. Cache bị xoá khi đăng xuất (queryClient.clear)

export { paymentPlanKeys }

function useRefreshContractWorld() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(
      [
        paymentPlanKeys.all,
        contractKeys.all,
        customerContractKeys.all,
        installationScheduleKeys.all,
        technicianQuotationKeys.all,
        paymentDeskKeys.all,
        customerInstallationKeys.all,
        managerInstallationKeys.all,
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    )
}

/** Hỏi lại khi khách đang quét mã (backend đối soát với PayOS mỗi lần đọc) hoặc đang chờ quản lý xác nhận tiền mặt */
export function installmentPollMs(view: Pick<InstallmentPaymentView, 'paymentState'> | undefined) {
  if (view?.paymentState === 'ONLINE_IN_PROGRESS') return INSTALLMENT_ONLINE_POLL_MS
  if (view?.paymentState === 'AWAITING_CASH_CONFIRMATION') return INSTALLMENT_CASH_POLL_MS
  return false
}

export function useInstallmentPaymentQuery(
  actor: InstallmentActor,
  target: InstallmentTarget,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery<InstallmentPaymentView, ApiError>({
    queryKey: paymentPlanKeys.installment(actor, target.contractId, target.sequence),
    queryFn: () => installmentService.getInstallmentPayment(actor, target),
    enabled,
    // Rời trang thì react-query tự dừng hỏi lại; tab ẩn cũng không hỏi
    refetchInterval: (query) => installmentPollMs(query.state.data),
  })
}

export function useStartInstallmentPaymentMutation(actor: Exclude<InstallmentActor, 'staff'>) {
  const refresh = useRefreshContractWorld()
  return useMutation<
    InstallmentPaymentView,
    ApiError,
    InstallmentTarget & { method: InstallmentPaymentRequest['method'] }
  >({
    mutationFn: ({ method, ...target }) => installmentService.startInstallmentPayment(actor, target, method),
    onSettled: refresh,
  })
}

export function useCancelInstallmentPaymentMutation(actor: Exclude<InstallmentActor, 'staff'>) {
  const refresh = useRefreshContractWorld()
  return useMutation<InstallmentPaymentView, ApiError, InstallmentTarget>({
    mutationFn: (target) => installmentService.cancelInstallmentPayment(actor, target),
    onSettled: refresh,
  })
}

export function useSignatureSetsQuery(reader: 'staff' | 'customer', contractId: string, { enabled = true } = {}) {
  return useQuery<SignatureSetView[], ApiError>({
    queryKey: paymentPlanKeys.signatureSets(reader, contractId),
    queryFn: () => signatureService.listSignatureSets(reader, contractId),
    enabled,
  })
}

export function useStartSignatureSetMutation(writer: SignatureWriter) {
  const refresh = useRefreshContractWorld()
  return useMutation<SignatureSetView, ApiError, { contractId: string; body: StartSignatureSetRequest }>({
    mutationFn: ({ contractId, body }) => signatureService.startSignatureSet(writer, contractId, body),
    onSettled: refresh,
  })
}

/** Gắn từng trang: chỉ tải lại danh sách trang ký, hợp đồng chưa đổi trạng thái tới khi chốt */
export function usePutSignedPageMutation(writer: SignatureWriter) {
  const queryClient = useQueryClient()
  return useMutation<SignatureSetView, ApiError, { contractId: string; pageNumber: number; fileId: string }>({
    mutationFn: ({ contractId, pageNumber, fileId }) =>
      signatureService.putSignedPage(writer, contractId, pageNumber, fileId),
    onSettled: (_data, _error, { contractId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: paymentPlanKeys.signatureSets('staff', contractId) }),
        queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) }),
      ]),
  })
}

export function useFinalizeSignatureSetMutation(writer: SignatureWriter) {
  const refresh = useRefreshContractWorld()
  return useMutation<SignatureSetView, ApiError, { contractId: string; expectedRevision: number }>({
    mutationFn: ({ contractId, expectedRevision }) =>
      signatureService.finalizeSignatureSet(writer, contractId, expectedRevision),
    onSettled: refresh,
  })
}

/** Link xem / tải một trang khi người dùng bấm. Không vào cache: link hết hạn sau vài phút */
export function useSignedPageUrlMutation(reader: 'staff' | 'customer') {
  return useMutation<
    AttachedFileUrlView,
    ApiError,
    { contractId: string; fileId: string; disposition: 'inline' | 'attachment' }
  >({
    mutationFn: ({ contractId, fileId, disposition }) =>
      signatureService.getSignedPageUrl(reader, contractId, fileId, disposition),
  })
}

export function useContractDirectoryQuery(query: ContractDirectoryQuery) {
  return useQuery<PagedResult<ContractDirectoryItem>, ApiError>({
    queryKey: paymentPlanKeys.directory(query),
    queryFn: () => directoryService.listContracts(query),
    placeholderData: keepPreviousData,
  })
}

/** Khách nghiệm thu / yêu cầu làm lại. Không báo thành công trước khi backend trả lời */
export function useCustomerAcceptanceMutation() {
  const refresh = useRefreshContractWorld()
  return useMutation<InstallationCustomerView, ApiError, { projectId: string; body: CustomerAcceptanceRequest }>({
    mutationFn: ({ projectId, body }) => customerInstallationService.decideAcceptance(projectId, body),
    onSettled: refresh,
  })
}
