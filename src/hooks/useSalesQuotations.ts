import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as quotationService from '@/services/salesQuotationService'
import type { ApiError } from '@/services/api/errors'
import type {
  InstallationQuotationLineRequest,
  QuotationHeaderRequest,
  QuotationLineUpdateRequest,
} from '@/types/req/salesQuotationsReq'
import type { QuotationView } from '@/types/res/quotationsRes'

// Báo giá lắp đặt của kinh doanh. Lệnh ghi thành công thì thay ngay bản đó trong danh sách; xong (kể cả lỗi 409 vì
// người khác vừa sửa) thì tải lại danh sách để luôn sửa trên revision mới nhất

export const salesQuotationKeys = {
  all: ['sales-quotations'] as const,
  list: (surveyRequestId: string) => [...salesQuotationKeys.all, 'list', surveyRequestId] as const,
}

export function useQuotationsQuery(
  surveyRequestId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery<QuotationView[], ApiError>({
    queryKey: salesQuotationKeys.list(surveyRequestId ?? ''),
    queryFn: () => quotationService.listForSurveyRequest(surveyRequestId!),
    enabled: enabled && Boolean(surveyRequestId),
  })
}

function useQuotationWrite<V>(write: (variables: V) => Promise<QuotationView>) {
  const queryClient = useQueryClient()
  return useMutation<QuotationView, ApiError, V>({
    mutationFn: write,
    onSuccess: (view) =>
      queryClient.setQueryData<QuotationView[]>(salesQuotationKeys.list(view.surveyRequestId), (list) =>
        list?.some((q) => q.quotationId === view.quotationId)
          ? list.map((q) => (q.quotationId === view.quotationId ? view : q))
          : [...(list ?? []), view],
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: salesQuotationKeys.all }),
  })
}

export function useCreateQuotationMutation() {
  return useQuotationWrite(({ surveyRequestId, body }: { surveyRequestId: string; body: QuotationHeaderRequest }) =>
    quotationService.createQuotation(surveyRequestId, body),
  )
}

export function useSaveQuotationHeaderMutation() {
  return useQuotationWrite(({ quotationId, body }: { quotationId: string; body: QuotationHeaderRequest }) =>
    quotationService.updateHeader(quotationId, body),
  )
}

export function useAddQuotationLineMutation() {
  return useQuotationWrite(({ quotationId, body }: { quotationId: string; body: InstallationQuotationLineRequest }) =>
    quotationService.addLine(quotationId, body),
  )
}

export function useUpdateQuotationLineMutation() {
  return useQuotationWrite(
    ({ quotationId, lineId, body }: { quotationId: string; lineId: string; body: QuotationLineUpdateRequest }) =>
      quotationService.updateLine(quotationId, lineId, body),
  )
}

export function useRemoveQuotationLineMutation() {
  return useQuotationWrite(
    ({ quotationId, lineId, revision }: { quotationId: string; lineId: string; revision: number }) =>
      quotationService.removeLine(quotationId, lineId, revision),
  )
}

/** Gửi bản nháp cho khách */
export function useSendQuotationMutation() {
  return useQuotationWrite(({ quotationId, revision }: { quotationId: string; revision: number }) =>
    quotationService.issueQuotation(quotationId, revision),
  )
}

/** Lập bản sửa từ bản đã gửi */
export function useReviseQuotationMutation() {
  return useQuotationWrite((quotationId: string) => quotationService.createRevision(quotationId))
}
