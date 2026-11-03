import { useState } from 'react'
import { Button } from '@/components/common/ui/button'
import { SettingReasonDialog } from './SettingReasonDialog'
import { DispatchSlaSection } from './DispatchSlaSection'
import { MaintenanceWarrantySection, PaymentQuotationSection } from './AfterSalesSections'
import type { SystemSettingView } from '@/types/res/adminSystemSettingsRes'
import type { SystemSettingValueRequest } from '@/types/req/adminSystemSettingsReq'

type Props = {
  settings: SystemSettingView[]
  isSaving: boolean
  onSave: (changes: SystemSettingValueRequest[], reason: string) => Promise<void>
}

const AFTER_SALES_KEYS = [
  'dispatch.reviewSlaMinutes',
  'dispatch.escalationDelayMinutes',
  'dispatch.reminderIntervalMinutes',
  'dispatch.proposalResponseWindowMinutes',
  'afterSales.inspectionDurationMinutes',
  'afterSales.maintenanceBookingLeadDays',
  'afterSales.maintenanceNoticeLeadDays',
  'afterSales.customerResponseHours',
  'afterSales.followUpMaxDays',
  'afterSales.delayedMaintenanceExtensionDays',
  'afterSales.appointmentChangeLeadHours',
  'afterSales.disasterWaitingDays',
  'afterSales.quotationValidityDays',
  'afterSales.checkoutExpiryMinutes',
]

export function AfterSalesPolicyTab({ settings, isSaving, onSave }: Props) {
  const [draft, setDraft] = useState<Record<string, number>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)

  const settingMap = new Map(settings.map((s) => [s.key, s]))
  const getValue = (key: string) => draft[key] ?? settingMap.get(key)?.value ?? 0
  const getDef = (key: string) => settingMap.get(key)
  const handleChange = (key: string, val: number) => setDraft((p) => ({ ...p, [key]: val }))

  const changedKeys = AFTER_SALES_KEYS.filter((k) => draft[k] !== undefined && draft[k] !== settingMap.get(k)?.value)
  const hasChanges = changedKeys.length > 0

  const handleConfirmSave = async (reason: string) => {
    const payload: SystemSettingValueRequest[] = changedKeys.map((k) => ({
      key: k,
      value: draft[k]!,
      unit: settingMap.get(k)?.unit,
    }))
    await onSave(payload, reason)
    setDraft({})
    setConfirmOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-surface-1 p-4">
        <h3 className="text-body font-semibold text-fg-1">Chính sách Điều phối & Dịch vụ Sau bán</h3>
        {hasChanges && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={isSaving} onClick={() => setDraft({})}>
              Hủy thay đổi ({changedKeys.length})
            </Button>
            <Button variant="primary" icon="save" disabled={isSaving} onClick={() => setConfirmOpen(true)}>
              Lưu thay đổi ({changedKeys.length})
            </Button>
          </div>
        )}
      </div>

      <DispatchSlaSection getValue={getValue} getDef={getDef} isSaving={isSaving} onChange={handleChange} />
      <MaintenanceWarrantySection getValue={getValue} getDef={getDef} isSaving={isSaving} onChange={handleChange} />
      <PaymentQuotationSection getValue={getValue} getDef={getDef} isSaving={isSaving} onChange={handleChange} />

      <SettingReasonDialog
        open={confirmOpen}
        title="Xác nhận lưu chính sách Điều phối & Sau bán"
        description={`Bạn đang chuẩn bị thay đổi ${changedKeys.length} cài đặt chính sách. Vui lòng nhập lý do điều chỉnh:`}
        isPending={isSaving}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSave}
      />
    </div>
  )
}
