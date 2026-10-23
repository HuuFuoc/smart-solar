import { apiClient } from './api/client'
import { ENDPOINTS } from './api/endpoints'
import type { SchedulingSettingsView, SystemSettingRevisionView, PagedResult } from '@/types/res/adminSystemSettingsRes'
import type { UpdateSchedulingSettingsRequest } from '@/types/req/adminSystemSettingsReq'

export const adminSystemSettingsService = {
  async getScheduling(): Promise<SchedulingSettingsView> {
    const res = await apiClient.get<SchedulingSettingsView>(ENDPOINTS.adminSystemSettings.scheduling)
    return res.data
  },

  async updateScheduling(payload: UpdateSchedulingSettingsRequest): Promise<SchedulingSettingsView> {
    const res = await apiClient.put<SchedulingSettingsView>(ENDPOINTS.adminSystemSettings.scheduling, payload)
    return res.data
  },

  async getHistory(page = 1, pageSize = 20, key?: string): Promise<PagedResult<SystemSettingRevisionView>> {
    const res = await apiClient.get<PagedResult<SystemSettingRevisionView>>(
      ENDPOINTS.adminSystemSettings.history,
      { params: { page, pageSize, key: key || undefined } }
    )
    return res.data
  },
}
