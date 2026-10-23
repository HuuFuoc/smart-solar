import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { ErrorState, PageSkeleton } from '@/components/common/ui/states'
import { SchedulingPolicyTab } from '@/features/admin-settings/components/SchedulingPolicyTab'
import { AfterSalesPolicyTab } from '@/features/admin-settings/components/AfterSalesPolicyTab'
import { RagConfigurationTab } from '@/features/admin-settings/components/RagConfigurationTab'
import { SettingsAuditLogTab } from '@/features/admin-settings/components/SettingsAuditLogTab'
import {
  useSchedulingSettingsQuery,
  useUpdateSchedulingSettingsMutation,
} from '@/hooks/useAdminSystemSettings'
import type { SystemSettingValueRequest } from '@/types/req/adminSystemSettingsReq'

type TabKey = 'scheduling' | 'afterSales' | 'rag' | 'audit'

export function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('scheduling')

  const { data: schedulingData, isLoading, isError, refetch } = useSchedulingSettingsQuery()
  const updateMutation = useUpdateSchedulingSettingsMutation()

  if (isLoading) return <PageSkeleton />

  if (isError || !schedulingData) {
    return (
      <ErrorState
        title="Không thể tải cài đặt hệ thống"
        message="Đã xảy ra lỗi khi kết nối với máy chủ cài đặt. Vui lòng thử tải lại trang."
        onRetry={() => void refetch()}
      />
    )
  }

  const handleSaveSettings = async (changes: SystemSettingValueRequest[], reason: string) => {
    try {
      await updateMutation.mutateAsync({
        settings: changes,
        expectedVersion: schedulingData.version,
        reason,
      })
      toast.success('Cập nhật chính sách hệ thống thành công!')
    } catch {
      toast.error('Lưu cài đặt thất bại. Phiên bản chính sách có thể đã thay đổi bởi quản trị viên khác.')
      void refetch()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-h2 font-semibold text-fg-1">Cài đặt hệ thống</h1>
            <Badge tone="accent">v{schedulingData.version} {schedulingData.bootstrap ? '(Mặc định)' : ''}</Badge>
          </div>
          <p className="mt-1 text-body text-fg-3">
            Quản trị các tham số vận hành, thời hạn lịch hẹn, khảo sát, lắp đặt, điều phối và cấu hình AI.
          </p>
        </div>
      </div>

      <div className="flex border-b border-line">
        <button
          type="button"
          onClick={() => setActiveTab('scheduling')}
          className={`border-b-2 px-4 py-2.5 text-body font-medium transition-colors ${
            activeTab === 'scheduling'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-fg-3 hover:text-fg-1'
          }`}
        >
          Lịch hẹn & Khảo sát
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('afterSales')}
          className={`border-b-2 px-4 py-2.5 text-body font-medium transition-colors ${
            activeTab === 'afterSales'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-fg-3 hover:text-fg-1'
          }`}
        >
          Điều phối & Sau bán
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rag')}
          className={`border-b-2 px-4 py-2.5 text-body font-medium transition-colors ${
            activeTab === 'rag'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-fg-3 hover:text-fg-1'
          }`}
        >
          Cấu hình AI / RAG
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`border-b-2 px-4 py-2.5 text-body font-medium transition-colors ${
            activeTab === 'audit'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-fg-3 hover:text-fg-1'
          }`}
        >
          Nhật ký thay đổi
        </button>
      </div>

      {activeTab === 'scheduling' && (
        <SchedulingPolicyTab
          settings={schedulingData.settings}
          isSaving={updateMutation.isPending}
          onSave={handleSaveSettings}
        />
      )}

      {activeTab === 'afterSales' && (
        <AfterSalesPolicyTab
          settings={schedulingData.settings}
          isSaving={updateMutation.isPending}
          onSave={handleSaveSettings}
        />
      )}

      {activeTab === 'rag' && <RagConfigurationTab />}

      {activeTab === 'audit' && <SettingsAuditLogTab />}
    </div>
  )
}
