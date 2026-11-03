import { apiClient } from './api/client'
import { ENDPOINTS } from './api/endpoints'
import type { RollbackRagConfigurationRequest } from '@/types/req/adminRagConfigurationReq'
import type {
  RagActivationView,
  RagConfigurationState,
  RagModelCatalog,
  RagConfigurationHistoryView,
  RagConfigurationValidationView,
  RagConfigurationView,
  RagReindexStaleView,
  SaveRagConfigurationDraftRequest,
} from '@/types/res/adminRagConfigTypes'

export const adminRagConfigService = {
  async getConfiguration(): Promise<RagConfigurationState> {
    const res = await apiClient.get<RagConfigurationState>(ENDPOINTS.adminRagConfig.base)
    return res.data
  },

  async getModels(): Promise<RagModelCatalog> {
    const res = await apiClient.get<RagModelCatalog>(ENDPOINTS.adminRagConfig.models)
    return res.data
  },

  async getVersions(page = 1, pageSize = 20): Promise<RagConfigurationHistoryView> {
    const res = await apiClient.get<RagConfigurationHistoryView>(ENDPOINTS.adminRagConfig.versions, {
      params: { page, pageSize },
    })
    return res.data
  },

  async saveDraft(payload: SaveRagConfigurationDraftRequest): Promise<RagConfigurationView> {
    const res = await apiClient.put<RagConfigurationView>(ENDPOINTS.adminRagConfig.draft, payload)
    return res.data
  },

  /** Kiểm lại bản nháp đã lưu (không có body); không có bản nháp thì 404 RAG_CONFIG_DRAFT_NOT_FOUND */
  async validateDraft(): Promise<RagConfigurationValidationView> {
    const res = await apiClient.post<RagConfigurationValidationView>(ENDPOINTS.adminRagConfig.validate)
    return res.data
  },

  async activateDraft(expectedRevision: number): Promise<RagActivationView> {
    const res = await apiClient.post<RagActivationView>(ENDPOINTS.adminRagConfig.activate, { expectedRevision })
    return res.data
  },

  /** Chép một phiên bản đã từng dùng (SUPERSEDED) thành phiên bản mới và áp dụng; bản đang dùng thì 409 RAG_CONFIG_INVALID_STATE */
  async rollback(version: number): Promise<RagActivationView> {
    const body: RollbackRagConfigurationRequest = { version }
    const res = await apiClient.post<RagActivationView>(ENDPOINTS.adminRagConfig.rollback, body)
    return res.data
  },

  /** Bỏ bản nháp; lệch revision thì 409 RAG_CONFIG_STALE_REVISION */
  async deleteDraft(expectedRevision: number): Promise<void> {
    await apiClient.delete(ENDPOINTS.adminRagConfig.draft, { params: { expectedRevision } })
  },

  /** 202: xếp lượt nạp lại cho các phiên bản tài liệu cắt theo cấu hình cũ (không có body) */
  async reindexStale(): Promise<RagReindexStaleView> {
    const res = await apiClient.post<RagReindexStaleView>(ENDPOINTS.adminRagConfig.reindexStale)
    return res.data
  },
}
