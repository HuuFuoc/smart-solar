import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as technicianInstallationService from '@/services/technicianInstallationService'
import type { ApiError } from '@/services/api/errors'
import type { AssetRequest } from '@/types/req/technicianInstallationsReq'
import type { InstallationEvidenceFileView } from '@/types/res/customerInstallationsRes'
import type { InstallationTechnicianView } from '@/types/res/technicianInstallationsRes'

export const technicianInstallationKeys = {
  all: ['technician-installations'] as const,
  list: () => [...technicianInstallationKeys.all, 'list'] as const,
  detail: (id: string) => [...technicianInstallationKeys.all, 'detail', id] as const,
  evidence: (id: string) => [...technicianInstallationKeys.all, 'evidence', id] as const,
}

/** Việc quản lý mới giao hiện ra không cần tải lại trang */
const LIST_REFRESH_MS = 60_000

type Options = { enabled?: boolean }

/** `enabled`: chỉ gọi khi phiên kỹ thuật viên đã khôi phục */
export function useMyInstallationsQuery({ enabled = true }: Options = {}) {
  return useQuery<InstallationTechnicianView[], ApiError>({
    queryKey: technicianInstallationKeys.list(),
    queryFn: technicianInstallationService.listMyInstallations,
    refetchInterval: LIST_REFRESH_MS,
    enabled,
  })
}

export function useMyInstallationQuery(id: string | undefined) {
  return useQuery<InstallationTechnicianView, ApiError>({
    queryKey: technicianInstallationKeys.detail(id ?? ''),
    queryFn: () => technicianInstallationService.getMyInstallation(id!),
    enabled: Boolean(id),
  })
}

export function useInstallationEvidenceQuery(id: string, { enabled = true }: Options = {}) {
  return useQuery<InstallationEvidenceFileView[], ApiError>({
    queryKey: technicianInstallationKeys.evidence(id),
    queryFn: () => technicianInstallationService.listInstallationEvidence(id),
    enabled,
  })
}

// Mọi thao tác trả về view mới: ghi ngay vào chi tiết, rồi làm mới danh sách, chi tiết và ảnh.
// Lỗi (kể cả 409 INSTALLATION_STALE_REVISION) cũng làm mới để người dùng thấy bản mới nhất rồi tự thử lại
function useInstallationMutation<V extends { id: string }>(
  mutationFn: (variables: V) => Promise<InstallationTechnicianView>,
) {
  const queryClient = useQueryClient()
  return useMutation<InstallationTechnicianView, ApiError, V>({
    mutationFn,
    onSuccess: (view, { id }) => {
      // Sau khi từ chối, công trình không còn là của mình: chỉ làm mới, không giữ view cũ
      if (view.myAssignmentStatus !== 'DECLINED') queryClient.setQueryData(technicianInstallationKeys.detail(id), view)
    },
    // Không chờ làm mới: sau khi từ chối, chi tiết tải lại sẽ là 404 và trang đã chuyển về danh sách
    onSettled: () => void queryClient.invalidateQueries({ queryKey: technicianInstallationKeys.all }),
  })
}

export function useAcceptInstallationMutation() {
  return useInstallationMutation(({ id, revision }: { id: string; revision: number }) =>
    technicianInstallationService.acceptInstallation(id, { expectedRevision: revision }),
  )
}

export function useDeclineInstallationMutation() {
  return useInstallationMutation(({ id, reason, revision }: { id: string; reason: string; revision: number }) =>
    technicianInstallationService.declineInstallation(id, { reason, expectedRevision: revision }),
  )
}

export function useStartInstallationMutation() {
  return useInstallationMutation(({ id }: { id: string }) => technicianInstallationService.startInstallation(id))
}

/** Ảnh vào lượt hiện tại. Mỗi ảnh một lần gọi, view trả về đã đếm ảnh mới cho báo cáo hoàn thành */
export function useAddEvidenceMutation() {
  return useInstallationMutation(({ id, fileId, caption }: { id: string; fileId: string; caption: string }) =>
    technicianInstallationService.addInstallationEvidence(id, { fileId, caption: caption || null }),
  )
}

export function useRegisterAssetsMutation() {
  return useInstallationMutation(({ id, assets }: { id: string; assets: AssetRequest[] }) =>
    technicianInstallationService.registerInstallationAssets(id, { assets }),
  )
}

export function useReportCompletionMutation() {
  return useInstallationMutation(({ id, report, revision }: { id: string; report: string; revision: number }) =>
    technicianInstallationService.reportInstallationCompletion(id, {
      completionReport: report,
      expectedRevision: revision,
    }),
  )
}
