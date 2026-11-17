import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as quotationService from '@/services/technicianQuotationService'
import type { ApiError } from '@/services/api/errors'
import type { QuotationView } from '@/types/res/quotationsRes'

// Giỏ báo giá của kỹ thuật viên. Lệnh ghi thành công thì thay ngay bản đó trong danh sách; xong (kể cả lỗi 409 vì bản vừa đổi ở
// nơi khác) thì tải lại để lệnh sau luôn dùng revision mới nhất của backend. Không tự gửi lại lệnh cũ

export const technicianQuotationKeys = {
  all: ['technician-quotations'] as const,
  list: (surveyRequestId: string) => [...technicianQuotationKeys.all, 'list', surveyRequestId] as const,
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
