import { apiClient } from './api/client'
import { ENDPOINTS } from './api/endpoints'
import type {
  RagConfigurationState,
  RagModelCatalog,
  RagConfigurationHistoryView,
  RagConfigurationView,
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

  async activateDraft(expectedRevision: number): Promise<void> {
    await apiClient.post(ENDPOINTS.adminRagConfig.activate, { expectedRevision })
  },
}
