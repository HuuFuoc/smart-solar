import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OnSiteDecision } from '@/common/quotation'
import { quotationPaymentPollMs } from '@/features/quotations/quotationRules'
import * as quotationService from '@/services/technicianQuotationService'
import type { ApiError } from '@/services/api/errors'
import type { QuotationPaymentView, QuotationView } from '@/types/res/quotationsRes'

// Giỏ báo giá của kỹ thuật viên. Lệnh ghi thành công thì thay ngay bản đó trong danh sách; xong (kể cả lỗi 409 vì bản vừa đổi ở
// nơi khác) thì tải lại để lệnh sau luôn dùng revision mới nhất của backend. Không tự gửi lại lệnh cũ

export const technicianQuotationKeys = {
  all: ['technician-quotations'] as const,
  list: (surveyRequestId: string) => [...technicianQuotationKeys.all, 'list', surveyRequestId] as const,
  payment: (quotationId: string) => [...technicianQuotationKeys.all, 'payment', quotationId] as const,
}

export function useTechnicianQuotationsQuery(
  surveyRequestId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery<QuotationView[], ApiError>({
    queryKey: technicianQuotationKeys.list(surveyRequestId ?? ''),
    queryFn: () => quotationService.listForSurveyRequest(surveyRequestId!),
    enabled: enabled && Boolean(surveyRequestId),
  })
}

function useCartWrite<V>(write: (variables: V) => Promise<QuotationView>) {
  const queryClient = useQueryClient()
  return useMutation<QuotationView, ApiError, V>({
    mutationFn: write,
    onSuccess: (view) =>
      queryClient.setQueryData<QuotationView[]>(technicianQuotationKeys.list(view.surveyRequestId), (list) =>
        list?.some((q) => q.quotationId === view.quotationId)
          ? list.map((q) => (q.quotationId === view.quotationId ? view : q))
          : [...(list ?? []), view],
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: technicianQuotationKeys.all }),
  })
}

export function useCreateCartMutation() {
  return useCartWrite((surveyRequestId: string) => quotationService.createCart(surveyRequestId))
}

export function useAddCartLineMutation() {
  return useCartWrite(
    ({
      quotationId,
      revision,
      productId,
      quantity,
    }: {
      quotationId: string
      revision: number
      productId: string
      quantity: number
    }) => quotationService.addLine(quotationId, { revision, productId, quantity }),
  )
}

export function useUpdateCartLineMutation() {
  return useCartWrite(
    ({
      quotationId,
      lineId,
      revision,
      quantity,
    }: {
      quotationId: string
      lineId: string
      revision: number
      quantity: number
    }) => quotationService.updateLine(quotationId, lineId, { revision, quantity }),
  )
}

export function useRemoveCartLineMutation() {
  return useCartWrite(({ quotationId, lineId, revision }: { quotationId: string; lineId: string; revision: number }) =>
    quotationService.removeLine(quotationId, lineId, revision),
  )
}

export function useIssueCartMutation() {
  return useCartWrite(({ quotationId, revision }: { quotationId: string; revision: number }) =>
    quotationService.issueQuotation(quotationId, revision),
  )
}

export function useReviseCartMutation() {
  return useCartWrite((quotationId: string) => quotationService.createRevision(quotationId))
}

type DecisionVars = { quotationId: string; decision: OnSiteDecision; revision: number; note: string | null }

export function useOnSiteDecisionMutation() {
  return useCartWrite(({ quotationId, decision, revision, note }: DecisionVars) =>
    quotationService.recordOnSiteDecision(quotationId, decision, revision, note),
  )
}

/**
 * Thanh toán của một báo giá đã đồng ý. Đang hiện QR thì hỏi lại 5 giây / lần, chờ tiền mặt thì 1 phút / lần (backend cho 30
 * lần xem / phút); đã trả hoặc không còn gì mở thì thôi hỏi. Không tự tải lại khi quay lại tab vì đã có hỏi lại theo giờ
 */
export function useQuotationPaymentQuery(
  quotationId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery<QuotationPaymentView, ApiError>({
    queryKey: technicianQuotationKeys.payment(quotationId ?? ''),
    queryFn: () => quotationService.getPayment(quotationId!),
    enabled: enabled && Boolean(quotationId),
    refetchInterval: (query) => quotationPaymentPollMs(query.state.data?.paymentState),
    refetchOnWindowFocus: false,
  })
}

// Huỷ lần thanh toán 100% cũ đã mở: backend cho 5 lần / 10 phút nên chỉ gọi khi bấm. Mở mới đã bỏ (410)
function usePaymentWrite<V>(write: (variables: V) => Promise<QuotationPaymentView>) {
  const queryClient = useQueryClient()
  return useMutation<QuotationPaymentView, ApiError, V>({
    mutationFn: write,
    onSuccess: (view) => queryClient.setQueryData(technicianQuotationKeys.payment(view.quotationId), view),
    onSettled: () => queryClient.invalidateQueries({ queryKey: technicianQuotationKeys.all }),
  })
}

export function useCancelQuotationPaymentMutation() {
  return usePaymentWrite((quotationId: string) => quotationService.cancelPayment(quotationId))
}
