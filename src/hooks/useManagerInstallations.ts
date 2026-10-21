import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as installationService from '@/services/managerInstallationService'
import { technicianAdminKeys } from '@/hooks/useTechnicianAdmin'
import type { ApiError } from '@/services/api/errors'
import type { AssignInstallationTechnicianRequest, ChecklistRequest } from '@/types/req/managerInstallationsReq'
import type {
  HandoverView,
  InstallationCandidateView,
  InstallationEvidenceFileView,
  InstallationEvidenceUrlView,
  InstallationProjectSummary,
  InstallationStaffView,
  InstallationStatus,
  PaidContractSource,
} from '@/types/res/managerInstallationsRes'

// Thi công phía quản lý / quản trị. Không cập nhật lạc quan: mutation xong (kể cả lỗi 409) thì tải lại từ server,
// không tự gửi lại với revision mới

export const managerInstallationKeys = {
  all: ['manager-installations'] as const,
  readyContracts: () => [...managerInstallationKeys.all, 'ready-contracts'] as const,
  projects: (status?: InstallationStatus) => [...managerInstallationKeys.all, 'projects', status ?? 'all'] as const,
  detail: (id: string) => [...managerInstallationKeys.all, 'detail', id] as const,
  candidates: (id: string, startsAt: string, endsAt: string) =>
    [...managerInstallationKeys.all, 'candidates', id, startsAt, endsAt] as const,
  evidence: (id: string) => [...managerInstallationKeys.all, 'evidence', id] as const,
  evidenceUrl: (id: string, evidenceId: string) =>
    [...managerInstallationKeys.all, 'evidence-url', id, evidenceId] as const,
  handover: (id: string) => [...managerInstallationKeys.all, 'handover', id] as const,
}

const QUEUE_REFRESH_MS = 60_000

/** Layout render trước khi xác thực xong, nên tắt query cho tới khi chắc là quản lý / quản trị */
type QueueOptions = { enabled?: boolean }

export function useReadyContractsQuery({ enabled = true }: QueueOptions = {}) {
  return useQuery<PaidContractSource[], ApiError>({
    queryKey: managerInstallationKeys.readyContracts(),
    queryFn: installationService.listReadyContracts,
    refetchInterval: QUEUE_REFRESH_MS,
    enabled,
  })
}

export function useInstallationProjectsQuery(status?: InstallationStatus, { enabled = true }: QueueOptions = {}) {
  return useQuery<InstallationProjectSummary[], ApiError>({
    queryKey: managerInstallationKeys.projects(status),
    queryFn: () => installationService.listProjects(status),
    refetchInterval: QUEUE_REFRESH_MS,
    enabled,
  })
}

export function useInstallationProjectQuery(id: string | undefined) {
  return useQuery<InstallationStaffView, ApiError>({
    queryKey: managerInstallationKeys.detail(id ?? ''),
    queryFn: () => installationService.getProject(id!),
    enabled: Boolean(id),
  })
}

/** Chỉ gọi khi người dùng bấm tìm (giới hạn 15 lần / phút), không thử lại tự động */
export function useTechnicianCandidatesQuery(id: string, interval: { startsAt: string; endsAt: string } | null) {
  return useQuery<InstallationCandidateView[], ApiError>({
    queryKey: managerInstallationKeys.candidates(id, interval?.startsAt ?? '', interval?.endsAt ?? ''),
    queryFn: () => installationService.listTechnicianCandidates(id, interval!.startsAt, interval!.endsAt),
    enabled: interval !== null,
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useInstallationEvidenceQuery(id: string) {
  return useQuery<InstallationEvidenceFileView[], ApiError>({
    queryKey: managerInstallationKeys.evidence(id),
    queryFn: () => installationService.listEvidence(id),
  })
}

/** Link ảnh hết hạn sau vài phút: không giữ trong cache khi khung xem đóng, không tự tải lại khi quay lại tab */
export function useEvidenceUrlQuery(id: string, evidenceId: string | null) {
  return useQuery<InstallationEvidenceUrlView, ApiError>({
    queryKey: managerInstallationKeys.evidenceUrl(id, evidenceId ?? ''),
    queryFn: () => installationService.getEvidenceUrl(id, evidenceId!, 'inline'),
    enabled: evidenceId !== null,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

/** Link tải về dùng ngay một lần nên đi qua mutation, không vào cache */
export function useEvidenceDownloadMutation(id: string) {
  return useMutation<InstallationEvidenceUrlView, ApiError, string>({
    mutationFn: (evidenceId) => installationService.getEvidenceUrl(id, evidenceId, 'attachment'),
    gcTime: 0,
  })
}

export function useHandoverQuery(id: string, { enabled = true }: QueueOptions = {}) {
  return useQuery<HandoverView, ApiError>({
    queryKey: managerInstallationKeys.handover(id),
    queryFn: () => installationService.getHandover(id),
    enabled,
  })
}

// Thao tác ghi trả về chi tiết mới nhất: đặt ngay vào cache rồi làm mới mọi danh sách liên quan.
// Phân công / huỷ đổi cả lịch của kỹ thuật viên nên làm mới luôn dữ liệu kỹ thuật viên
function useAfterWrite(id: string, { touchesSchedule = false } = {}) {
  const queryClient = useQueryClient()
  return {
    onSuccess: (view: InstallationStaffView) => queryClient.setQueryData(managerInstallationKeys.detail(id), view),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: managerInstallationKeys.all }),
        touchesSchedule && queryClient.invalidateQueries({ queryKey: technicianAdminKeys.all }),
      ]),
  }
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient()
  return useMutation<InstallationStaffView, ApiError, string>({
    mutationFn: (contractId) => installationService.createProjectFromContract(contractId),
    onSuccess: (view) => queryClient.setQueryData(managerInstallationKeys.detail(view.projectId), view),
    onSettled: () => queryClient.invalidateQueries({ queryKey: managerInstallationKeys.all }),
  })
}

export function useAssignInstallationMutation(id: string) {
  return useMutation<InstallationStaffView, ApiError, AssignInstallationTechnicianRequest>({
    mutationFn: (body) => installationService.assignTechnician(id, body),
    ...useAfterWrite(id, { touchesSchedule: true }),
  })
}

export function useChecklistItemMutation(id: string) {
  return useMutation<InstallationStaffView, ApiError, { itemId: string; body: ChecklistRequest }>({
    mutationFn: ({ itemId, body }) => installationService.updateChecklistItem(id, itemId, body),
    ...useAfterWrite(id),
  })
}

export function useCancelProjectMutation(id: string) {
  return useMutation<InstallationStaffView, ApiError, { reason: string; expectedRevision: number }>({
    mutationFn: (body) => installationService.cancelProject(id, body),
    ...useAfterWrite(id, { touchesSchedule: true }),
  })
}

export function useReturnToReworkMutation(id: string) {
  return useMutation<InstallationStaffView, ApiError, { reason: string; expectedRevision: number }>({
    mutationFn: (body) => installationService.returnToRework(id, body),
    ...useAfterWrite(id),
  })
}
