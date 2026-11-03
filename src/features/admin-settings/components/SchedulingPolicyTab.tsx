import { useState } from 'react'
import { Button } from '@/components/common/ui/button'
import { SettingFieldInput } from './SettingFieldInput'
import { SettingReasonDialog } from './SettingReasonDialog'
import type { SystemSettingView } from '@/types/res/adminSystemSettingsRes'
import type { SystemSettingValueRequest } from '@/types/req/adminSystemSettingsReq'

type Props = {
  settings: SystemSettingView[]
  isSaving: boolean
  onSave: (changes: SystemSettingValueRequest[], reason: string) => Promise<void>
}

const SCHEDULING_KEYS = [
  'scheduling.acceptanceWindowMinutes',
  'scheduling.acceptanceMinimumLeadMinutes',
  'scheduling.acceptanceReminderLeadMinutes',
  'scheduling.customerChangeLeadMinutes',
  'scheduling.minimumBookingLeadMinutes',
  'scheduling.bookingHorizonDays',
  'scheduling.bufferBetweenAppointmentsMinutes',
  'onsiteSurvey.earlyStartMinutes',
  'installation.maxAssignmentDays',
]

export function SchedulingPolicyTab({ settings, isSaving, onSave }: Props) {
  const [draft, setDraft] = useState<Record<string, number>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)

  const settingMap = new Map(settings.map((s) => [s.key, s]))
  const getValue = (key: string) => draft[key] ?? settingMap.get(key)?.value ?? 0
  const getDef = (key: string) => settingMap.get(key)
  const setField = (key: string, v: number) => setDraft((p) => ({ ...p, [key]: v }))

  const changedKeys = SCHEDULING_KEYS.filter((k) => draft[k] !== undefined && draft[k] !== settingMap.get(k)?.value)
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
        <h3 className="text-body font-semibold text-fg-1">Chính sách thời gian Lịch hẹn & Khảo sát</h3>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SettingFieldInput
          id="acceptanceWindowMinutes"
          label="Thời gian chờ KTV nhận lịch"
          description="Thời gian tối đa KTV tự nhận lịch trước khi chuyển tiếp cho quản lý."
          value={getValue('scheduling.acceptanceWindowMinutes')}
          unit="MINUTES"
          min={5}
          max={10080}
          defaultValue={getDef('scheduling.acceptanceWindowMinutes')?.defaultValue ?? 240}
          disabled={isSaving}
          onChange={(v) => setField('scheduling.acceptanceWindowMinutes', v)}
        />
        <SettingFieldInput
          id="acceptanceMinimumLeadMinutes"
          label="Khoảng đệm tối thiểu nhận lịch"
          description="KTV phải nhận lịch trước thời điểm bắt đầu tối thiểu chừng này phút."
          value={getValue('scheduling.acceptanceMinimumLeadMinutes')}
          unit="MINUTES"
          min={0}
          max={10080}
          defaultValue={getDef('scheduling.acceptanceMinimumLeadMinutes')?.defaultValue ?? 120}
          disabled={isSaving}
          onChange={(v) => setField('scheduling.acceptanceMinimumLeadMinutes', v)}
        />
        <SettingFieldInput
          id="acceptanceReminderLeadMinutes"
          label="Thời điểm nhắc KTV nhận lịch"
          description="Nhắc nhở KTV trước hạn chót (0 = tắt nhắc nhở)."
          value={getValue('scheduling.acceptanceReminderLeadMinutes')}
          unit="MINUTES"
          min={0}
          max={10080}
          defaultValue={getDef('scheduling.acceptanceReminderLeadMinutes')?.defaultValue ?? 0}
          disabled={isSaving}
          onChange={(v) => setField('scheduling.acceptanceReminderLeadMinutes', v)}
        />
        <SettingFieldInput
          id="customerChangeLeadMinutes"
          label="Hạn chót khách đổi / hủy lịch"
          description="Khách hàng được đổi hoặc hủy lịch hẹn trực tuyến trước giờ hẹn tối thiểu."
          value={getValue('scheduling.customerChangeLeadMinutes')}
          unit="MINUTES"
          min={0}
          max={10080}
          defaultValue={getDef('scheduling.customerChangeLeadMinutes')?.defaultValue ?? 120}
          disabled={isSaving}
          onChange={(v) => setField('scheduling.customerChangeLeadMinutes', v)}
        />
        <SettingFieldInput
          id="minimumBookingLeadMinutes"
          label="Khoảng đệm tối thiểu đặt lịch"
          description="Khoảng cách tối thiểu từ lúc đặt đến lúc bắt đầu lịch (0 = bất kỳ lúc nào)."
          value={getValue('scheduling.minimumBookingLeadMinutes')}
          unit="MINUTES"
          min={0}
          max={10080}
          defaultValue={getDef('scheduling.minimumBookingLeadMinutes')?.defaultValue ?? 0}
          disabled={isSaving}
          onChange={(v) => setField('scheduling.minimumBookingLeadMinutes', v)}
        />
        <SettingFieldInput
          id="bookingHorizonDays"
          label="Khung thời gian mở lịch tối đa"
          description="Số ngày trong tương lai khách hàng được phép xem và chọn lịch hẹn."
          value={getValue('scheduling.bookingHorizonDays')}
          unit="DAYS"
          min={1}
          max={365}
          defaultValue={getDef('scheduling.bookingHorizonDays')?.defaultValue ?? 30}
          disabled={isSaving}
          onChange={(v) => setField('scheduling.bookingHorizonDays', v)}
        />
        <SettingFieldInput
          id="bufferBetweenAppointmentsMinutes"
          label="Khoảng nghỉ tối thiểu giữa 2 lịch"
          description="Khoảng nghỉ cố định tối thiểu giữa 2 cam kết công việc của cùng 1 KTV."
          value={getValue('scheduling.bufferBetweenAppointmentsMinutes')}
          unit="MINUTES"
          min={0}
          max={240}
          defaultValue={getDef('scheduling.bufferBetweenAppointmentsMinutes')?.defaultValue ?? 30}
          disabled={isSaving}
          onChange={(v) => setField('scheduling.bufferBetweenAppointmentsMinutes', v)}
        />
        <SettingFieldInput
          id="onSiteSurveyEarlyStartMinutes"
          label="Bắt đầu khảo sát sớm tối đa"
          description="Thời gian tối đa KTV được phép bắt đầu khảo sát trước giờ hẹn."
          value={getValue('onsiteSurvey.earlyStartMinutes')}
          unit="MINUTES"
          min={0}
          max={1440}
          defaultValue={getDef('onsiteSurvey.earlyStartMinutes')?.defaultValue ?? 120}
          disabled={isSaving}
          onChange={(v) => setField('onsiteSurvey.earlyStartMinutes', v)}
        />
        <SettingFieldInput
          id="installationMaxAssignmentDays"
          label="Thời lượng tối đa dự án lắp đặt"
          description="Số ngày lịch tối đa cho một phân công lắp đặt hệ thống điện mặt trời."
          value={getValue('installation.maxAssignmentDays')}
          unit="DAYS"
          min={1}
          max={365}
          defaultValue={getDef('installation.maxAssignmentDays')?.defaultValue ?? 14}
          disabled={isSaving}
          onChange={(v) => setField('installation.maxAssignmentDays', v)}
        />
      </div>

      <SettingReasonDialog
        open={confirmOpen}
        title="Xác nhận lưu chính sách Lịch hẹn & Khảo sát"
        description={`Bạn đang chuẩn bị thay đổi ${changedKeys.length} cài đặt. Vui lòng nhập lý do điều chỉnh:`}
        isPending={isSaving}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSave}
      />
    </div>
  )
}
