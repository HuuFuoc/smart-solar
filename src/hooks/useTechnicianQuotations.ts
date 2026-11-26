import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OnSiteDecision } from '@/common/quotation'
import { quotationPaymentPollMs } from '@/features/quotations/quotationRules'
import { contractKeys } from '@/hooks/useContracts'
import { paymentPlanKeys } from '@/hooks/paymentPlanKeys'
import * as quotationService from '@/services/technicianQuotationService'
import type { ApiError } from '@/services/api/errors'
import type { PackageView, ServicePackageKind } from '@/types/res/customerAfterSalesRes'
import type { QuotationPaymentView, QuotationView } from '@/types/res/quotationsRes'

// Giỏ báo giá của kỹ thuật viên. Lệnh ghi thành công thì thay ngay bản đó trong danh sách; xong (kể cả lỗi 409 vì bản vừa đổi ở
// nơi khác) thì tải lại để lệnh sau luôn dùng revision mới nhất của backend. Không tự gửi lại lệnh cũ

export const technicianQuotationKeys = {
  all: ['technician-quotations'] as const,
  list: (surveyRequestId: string) => [...technicianQuotationKeys.all, 'list', surveyRequestId] as const,
  payment: (quotationId: string) => [...technicianQuotationKeys.all, 'payment', quotationId] as const,
  /** Danh mục gói đi kèm, tách khỏi `all` để lệnh ghi giỏ không tải lại danh mục */
  servicePackages: (kind: ServicePackageKind) => ['technician-service-packages', kind] as const,
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

/** Khoá chung của mọi lệnh ghi giỏ: lệnh sau cần revision mới nhất do lệnh trước trả về, nên các khối khoá nút khi đang ghi */
const CART_WRITE_KEY = ['technician-cart-write'] as const

/** Đang có lệnh ghi giỏ nào chạy (dòng hàng, gói đi kèm, chốt, ghi quyết định): khoá mọi nút ghi khác cho tới khi xong */
export function useCartWriting() {
  return useIsMutating({ mutationKey: CART_WRITE_KEY }) > 0
}

/** `alsoRefresh`: khoá cache khác đổi theo lệnh này (vd. hợp đồng 30/70 lập / huỷ theo quyết định của khách) */
function useCartWrite<V>(
  write: (variables: V) => Promise<QuotationView>,
  alsoRefresh: readonly (readonly string[])[] = [],
) {
  const queryClient = useQueryClient()
  return useMutation<QuotationView, ApiError, V>({
    mutationKey: CART_WRITE_KEY,
    mutationFn: write,
    onSuccess: (view) =>
      queryClient.setQueryData<QuotationView[]>(technicianQuotationKeys.list(view.surveyRequestId), (list) =>
        list?.some((q) => q.quotationId === view.quotationId)
          ? list.map((q) => (q.quotationId === view.quotationId ? view : q))
          : [...(list ?? []), view],
      ),
    onSettled: () =>
      Promise.all(
        [technicianQuotationKeys.all, ...alsoRefresh].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
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

/** Gói PER_PANEL đang bán của một loại; chỉ tải khi mở hộp chọn gói */
export function useTechnicianServicePackagesQuery(
  kind: ServicePackageKind,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery<PackageView[], ApiError>({
    queryKey: technicianQuotationKeys.servicePackages(kind),
    queryFn: () => quotationService.listServicePackages(kind),
    enabled,
  })
}

type PackageVars = { quotationId: string; kind: ServicePackageKind; revision: number }

/** Chọn / đổi gói của một loại; số lượng, đơn giá, thành tiền, tổng đọc lại từ báo giá backend trả về */
export function useSetCartServicePackageMutation() {
  return useCartWrite(({ quotationId, kind, revision, packageId }: PackageVars & { packageId: string }) =>
    quotationService.setServicePackage(quotationId, kind, { packageId, revision }),
  )
}

export function useRemoveCartServicePackageMutation() {
  return useCartWrite(({ quotationId, kind, revision }: PackageVars) =>
    quotationService.removeServicePackage(quotationId, kind, revision),
  )
}

type DecisionVars = { quotationId: string; decision: OnSiteDecision; revision: number; note: string | null }

/**
 * Khách đồng ý thì backend lập (hoặc trả lại) đúng một hợp đồng 30/70; khách đổi ý trước khi trả 30% thì hợp đồng đó bị huỷ. Cả hai
 * đổi hợp đồng và khoản trả, nên tải lại cả hai cùng danh sách báo giá
 */
export function useOnSiteDecisionMutation() {
  return useCartWrite(
    ({ quotationId, decision, revision, note }: DecisionVars) =>
      quotationService.recordOnSiteDecision(quotationId, decision, revision, note),
    [contractKeys.all, paymentPlanKeys.all],
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

// Huỷ lần thanh toán 100% báo giá đã mở trước bản 30/70: backend cho 5 lần / 10 phút nên chỉ gọi khi bấm. Mở mới đã bỏ (410)
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
