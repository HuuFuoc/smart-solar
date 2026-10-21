import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import type { AcceptanceChoice } from '@/common/installation'
import * as installationService from '@/services/customerInstallationService'
import type { ApiError } from '@/services/api/errors'
import type {
  EvidenceDisposition,
  HandoverView,
  InstallationCustomerView,
  InstallationEvidenceFileView,
} from '@/types/res/customerInstallationsRes'

// Dự án lắp đặt của khách. URL ảnh ký sẵn không đi qua cache của react-query (EvidenceGallery tự xin khi hiện ảnh)
// Sau khi gửi nghiệm thu (kể cả lỗi, vì trạng thái có thể đã đổi) tải lại mọi thứ của dự án. Không cập nhật lạc quan

export const customerInstallationKeys = {
  all: ['customer-installations'] as const,
  list: () => [...customerInstallationKeys.all, 'list'] as const,
  detail: (projectId: string) => [...customerInstallationKeys.all, 'detail', projectId] as const,
  evidence: (projectId: string) => [...customerInstallationKeys.all, 'evidence', projectId] as const,
  handover: (projectId: string) => [...customerInstallationKeys.all, 'handover', projectId] as const,
}

export function useMyInstallationsQuery() {
  return useQuery<InstallationCustomerView[], ApiError>({
    queryKey: customerInstallationKeys.list(),
    queryFn: installationService.listMyProjects,
  })
}

export function useMyInstallationQuery(projectId: string | undefined) {
  return useQuery<InstallationCustomerView, ApiError>({
    queryKey: customerInstallationKeys.detail(projectId ?? ''),
    queryFn: () => installationService.getMyProject(projectId!),
    enabled: Boolean(projectId),
  })
}

export function useInstallationEvidenceQuery(projectId: string | undefined) {
  return useQuery<InstallationEvidenceFileView[], ApiError>({
    queryKey: customerInstallationKeys.evidence(projectId ?? ''),
    queryFn: () => installationService.listEvidence(projectId!),
    enabled: Boolean(projectId),
  })
}

/** Hàm xin URL ảnh cho EvidenceGallery. Gọi thẳng API mỗi lần, không cache: URL ký sẵn dùng một lần rồi bỏ */
export function useEvidenceUrlFetcher(projectId: string) {
  return useCallback(
    (evidenceId: string, disposition: EvidenceDisposition) =>
      installationService.getEvidenceUrl(projectId, evidenceId, disposition),
    [projectId],
  )
}

/** Chỉ gọi khi dự án đã COMPLETED, trước đó backend trả 409 */
export function useHandoverQuery(projectId: string | undefined, completed: boolean) {
  return useQuery<HandoverView, ApiError>({
    queryKey: customerInstallationKeys.handover(projectId ?? ''),
    queryFn: () => installationService.getHandover(projectId!),
    enabled: Boolean(projectId) && completed,
  })
}

type DecideVars = { projectId: string; decision: AcceptanceChoice; reason: string | null }

export function useDecideAcceptanceMutation() {
  const queryClient = useQueryClient()
  return useMutation<InstallationCustomerView, ApiError, DecideVars>({
    mutationFn: ({ projectId, decision, reason }) =>
      installationService.decideAcceptance(projectId, { decision, reason }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: customerInstallationKeys.all }),
  })
}
