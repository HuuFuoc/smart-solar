import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { uploadFile } from '@/services/fileService'
import * as visitService from '@/services/technicianAfterSalesService'
import type { TechnicianQuotationRequest } from '@/types/req/technicianAfterSalesQuotationsReq'
import type { ApiError } from '@/services/api/errors'
import type {
  ContinueRepairRequest,
  DiagnosedItemRequest,
  FinishOnSiteRequest,
  InspectionReportRequest,
  WorkReportRequest,
} from '@/types/req/technicianAfterSalesReq'
import type { ServiceQuotationPaymentView, TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'
import { serviceQuotationPollMs } from '@/features/after-sales/technicianVisitRules'

// Buổi hẹn bảo hành, sửa chữa, bảo trì của kỹ thuật viên. Thao tác xong (kể cả lỗi) thì tải lại từ server

export const technicianAfterSalesKeys = {
  all: ['technician-after-sales'] as const,
  visits: () => [...technicianAfterSalesKeys.all, 'visits'] as const,
  visit: (visitId: string) => [...technicianAfterSalesKeys.visits(), visitId] as const,
  quotationPayment: (quotationId: string) =>
    [...technicianAfterSalesKeys.all, 'quotation-payment', quotationId] as const,
}

/** `enabled`: menu chỉ gọi khi đã chắc là kỹ thuật viên */
export function useMyVisitsQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<TechnicianVisitView[], ApiError>({
    queryKey: technicianAfterSalesKeys.visits(),
    queryFn: visitService.listVisits,
    refetchInterval: 60_000,
    enabled,
  })
}

/** Đang chờ tại công trình thì hỏi lại thường hơn để thấy ngay khi quản lý duyệt, khách trả tiền */
const WAITING_REFRESH_MS = 20_000

export function useMyVisitQuery(visitId: string | undefined) {
  return useQuery<TechnicianVisitView, ApiError>({
    queryKey: technicianAfterSalesKeys.visit(visitId ?? ''),
    queryFn: () => visitService.getVisit(visitId!),
    refetchInterval: (query) => (query.state.data?.waitingOnSite ? WAITING_REFRESH_MS : false),
    enabled: Boolean(visitId),
  })
}

/** Mutation trên một buổi hẹn; xong thì tải lại danh sách và chi tiết */
function useVisitMutation<Body>(action: (visitId: string, body: Body) => Promise<TechnicianVisitView>) {
  const queryClient = useQueryClient()
  return useMutation<TechnicianVisitView, ApiError, { visitId: string; body: Body }>({
    mutationFn: ({ visitId, body }) => action(visitId, body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: technicianAfterSalesKeys.visits() }),
  })
}

export function useRespondVisitMutation() {
  return useVisitMutation<{ accept: boolean; reason?: string }>((visitId, body) => visitService.respond(visitId, body))
}

export function useStartVisitMutation() {
  return useVisitMutation<void>((visitId) => visitService.start(visitId))
}

/** Tải một ảnh lên S3, đăng ký rồi gắn vào buổi hẹn */
export function useAddPhotoMutation() {
  return useVisitMutation<File>(async (visitId, file) => {
    const registered = await uploadFile(file, 'SERVICE_EVIDENCE')
    return visitService.addEvidence(visitId, { fileId: registered.fileId })
  })
}

export function useInspectionReportMutation() {
  return useVisitMutation<InspectionReportRequest>(visitService.reportInspection)
}

export function useContinueRepairMutation() {
  return useVisitMutation<ContinueRepairRequest>(visitService.continueRepair)
}

export function useFinishOnSiteMutation() {
  return useVisitMutation<FinishOnSiteRequest>(visitService.finishOnSite)
}

export function useSupplementaryItemMutation() {
  return useVisitMutation<DiagnosedItemRequest>(visitService.addSupplementaryItem)
}

export function useWorkReportMutation() {
  return useVisitMutation<WorkReportRequest>(visitService.reportWork)
}

export function useAbsenceMutation() {
  return useVisitMutation<{ note: string }>(visitService.reportAbsence)
}

export function useIssueRepairQuotationMutation() {
  const queryClient = useQueryClient()
  return useMutation<unknown, ApiError, { requestId: string; body: TechnicianQuotationRequest }>({
    mutationFn: ({ requestId, body }) => visitService.issueRepairQuotation(requestId, body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: technicianAfterSalesKeys.visits() }),
  })
}

/**
 * Trạng thái báo giá + thanh toán của một báo giá trên buổi hẹn (view buổi hẹn không có báo giá, chỉ có mã báo giá trên hạng
 * mục). Đang có link PayOS thì hỏi lại 5 giây / lần, chờ tiền mặt 1 phút / lần (backend cho 30 lần xem / phút)
 */
export function useServiceQuotationPaymentQuery(quotationId: string) {
  return useQuery<ServiceQuotationPaymentView, ApiError>({
    queryKey: technicianAfterSalesKeys.quotationPayment(quotationId),
    queryFn: () => visitService.getQuotationPayment(quotationId),
    refetchInterval: (query) => serviceQuotationPollMs(query.state.data),
    refetchOnWindowFocus: false,
  })
}

function useOnSiteWrite<V, R>(write: (variables: V) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation<R, ApiError, V>({
    mutationFn: write,
    onSettled: () => queryClient.invalidateQueries({ queryKey: technicianAfterSalesKeys.all }),
  })
}

export function useServiceQuotationDecisionMutation() {
  return useOnSiteWrite(
    ({ quotationId, decision, note }: { quotationId: string; decision: 'AGREED' | 'DECLINED'; note: string | null }) =>
      visitService.recordQuotationDecision(quotationId, decision, note),
  )
}

/** Mở / huỷ thanh toán: backend cho 5 lần / 10 phút, chỉ gọi khi bấm */
export function useStartServicePaymentMutation() {
  return useOnSiteWrite(({ quotationId, method }: { quotationId: string; method: 'ONLINE' | 'CASH' }) =>
    visitService.startQuotationPayment(quotationId, method),
  )
}

export function useCancelServicePaymentMutation() {
  return useOnSiteWrite((quotationId: string) => visitService.cancelQuotationPayment(quotationId))
}

export function useConfirmCompletionOnSiteMutation() {
  return useOnSiteWrite(({ requestId, note, files }: { requestId: string; note: string; files: File[] }) =>
    // Ảnh tải lần lượt rồi mới gắn: lệnh ghi tệp bị giới hạn số lần mỗi phút
    files
      .reduce<Promise<string[]>>(
        (ids, file) => ids.then(async (list) => [...list, (await uploadFile(file, 'SERVICE_EVIDENCE')).fileId]),
        Promise.resolve([]),
      )
      .then((evidenceFileIds) => visitService.confirmCompletionOnSite(requestId, { note, evidenceFileIds })),
  )
}
