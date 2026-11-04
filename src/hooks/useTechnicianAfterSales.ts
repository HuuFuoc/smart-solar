import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { uploadFile } from '@/services/fileService'
import * as visitService from '@/services/technicianAfterSalesService'
import type { ApiError } from '@/services/api/errors'
import type {
  ContinueRepairRequest,
  DiagnosedItemRequest,
  FinishOnSiteRequest,
  InspectionReportRequest,
  WorkReportRequest,
} from '@/types/req/technicianAfterSalesReq'
import type { TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'

// Buổi hẹn bảo hành, sửa chữa, bảo trì của kỹ thuật viên. Thao tác xong (kể cả lỗi) thì tải lại từ server

export const technicianAfterSalesKeys = {
  all: ['technician-after-sales'] as const,
  visits: () => [...technicianAfterSalesKeys.all, 'visits'] as const,
  visit: (visitId: string) => [...technicianAfterSalesKeys.visits(), visitId] as const,
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
