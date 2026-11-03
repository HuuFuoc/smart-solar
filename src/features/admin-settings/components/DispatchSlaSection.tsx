import { SettingFieldInput } from './SettingFieldInput'
import type { SystemSettingView } from '@/types/res/adminSystemSettingsRes'

type SectionProps = {
  getValue: (key: string) => number
  getDef: (key: string) => SystemSettingView | undefined
  isSaving: boolean
  onChange: (key: string, val: number) => void
}

export function DispatchSlaSection({ getValue, getDef, isSaving, onChange }: SectionProps) {
  return (
    <div className="space-y-3">
      <h4 className="border-b border-line pb-2 text-body font-semibold text-fg-1">SLA Xử lý & Điều phối yêu cầu</h4>
      <div className="grid gap-4 md:grid-cols-2">
        <SettingFieldInput
          id="dispatchReviewSlaMinutes"
          label="Thời hạn xử lý yêu cầu điều phối"
          description="Hạn chót nhân viên phải duyệt yêu cầu điều phối ở vùng chưa phủ sóng."
          value={getValue('dispatch.reviewSlaMinutes')}
          unit="MINUTES"
          min={5}
          max={10080}
          defaultValue={getDef('dispatch.reviewSlaMinutes')?.defaultValue ?? 240}
          disabled={isSaving}
          onChange={(v) => onChange('dispatch.reviewSlaMinutes', v)}
        />
        <SettingFieldInput
          id="dispatchEscalationDelayMinutes"
          label="Độ trễ leo thang lên Admin"
          description="Thời gian chờ sau khi quá hạn duyệt trước khi báo động leo thang lên cấp Admin."
          value={getValue('dispatch.escalationDelayMinutes')}
          unit="MINUTES"
          min={0}
          max={10080}
          defaultValue={getDef('dispatch.escalationDelayMinutes')?.defaultValue ?? 0}
          disabled={isSaving}
          onChange={(v) => onChange('dispatch.escalationDelayMinutes', v)}
        />
        <SettingFieldInput
          id="dispatchReminderIntervalMinutes"
          label="Tần suất nhắc nhở nhân viên"
          description="Khoảng cách giữa các thông báo nhắc việc khi yêu cầu bị quá hạn (0 = tắt)."
          value={getValue('dispatch.reminderIntervalMinutes')}
          unit="MINUTES"
          min={0}
          max={10080}
          defaultValue={getDef('dispatch.reminderIntervalMinutes')?.defaultValue ?? 0}
          disabled={isSaving}
          onChange={(v) => onChange('dispatch.reminderIntervalMinutes', v)}
        />
        <SettingFieldInput
          id="dispatchProposalResponseWindowMinutes"
          label="Thời hạn khách phản hồi đề xuất"
          description="Thời gian khách hàng có để chấp nhận đề xuất điều phối lịch khảo sát."
          value={getValue('dispatch.proposalResponseWindowMinutes')}
          unit="MINUTES"
          min={15}
          max={10080}
          defaultValue={getDef('dispatch.proposalResponseWindowMinutes')?.defaultValue ?? 1440}
          disabled={isSaving}
          onChange={(v) => onChange('dispatch.proposalResponseWindowMinutes', v)}
        />
      </div>
    </div>
  )
}
