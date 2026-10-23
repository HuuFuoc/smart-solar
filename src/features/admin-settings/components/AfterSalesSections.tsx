import { SettingFieldInput } from './SettingFieldInput'
import type { SystemSettingView } from '@/types/res/adminSystemSettingsRes'

type SectionProps = {
  getValue: (key: string) => number
  getDef: (key: string) => SystemSettingView | undefined
  isSaving: boolean
  onChange: (key: string, val: number) => void
}

export function MaintenanceWarrantySection({ getValue, getDef, isSaving, onChange }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="border-b border-line pb-2">
        <h4 className="text-body font-semibold text-fg-1">2. Bảo hành, Bảo trì & Xử lý sự cố</h4>
        <p className="text-meta text-fg-3">Thời hạn đặt lịch bảo dưỡng, thông báo định kỳ và xử lý thiên tai.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SettingFieldInput
          id="inspectionDurationMinutes"
          label="Thời lượng kiểm tra sự cố"
          description="Ước tính thời gian giữ chỗ lịch kỹ thuật viên."
          value={getValue('afterSales.inspectionDurationMinutes')}
          unit="MINUTES"
          min={15}
          max={480}
          defaultValue={getDef('afterSales.inspectionDurationMinutes')?.defaultValue ?? 60}
          disabled={isSaving}
          onChange={(v) => onChange('afterSales.inspectionDurationMinutes', v)}
        />
        <SettingFieldInput
          id="maintenanceBookingLeadDays"
          label="Đặt lịch bảo trì trước tối thiểu"
          description="Lịch bảo trì phải được đặt trước ngày diễn ra."
          value={getValue('afterSales.maintenanceBookingLeadDays')}
          unit="DAYS"
          min={0}
          max={60}
          defaultValue={getDef('afterSales.maintenanceBookingLeadDays')?.defaultValue ?? 7}
          disabled={isSaving}
          onChange={(v) => onChange('afterSales.maintenanceBookingLeadDays', v)}
        />
        <SettingFieldInput
          id="maintenanceNoticeLeadDays"
          label="Thông báo trước kỳ bảo dưỡng"
          description="Khách được gửi thông báo trước khi kỳ bảo dưỡng mở."
          value={getValue('afterSales.maintenanceNoticeLeadDays')}
          unit="DAYS"
          min={1}
          max={90}
          defaultValue={getDef('afterSales.maintenanceNoticeLeadDays')?.defaultValue ?? 14}
          disabled={isSaving}
          onChange={(v) => onChange('afterSales.maintenanceNoticeLeadDays', v)}
        />
        <SettingFieldInput
          id="customerResponseHours"
          label="Hạn phản hồi tạo việc Sales"
          description="Không đặt lịch sau thông báo sẽ tạo việc chăm sóc."
          value={getValue('afterSales.customerResponseHours')}
          unit="HOURS"
          min={1}
          max={336}
          defaultValue={getDef('afterSales.customerResponseHours')?.defaultValue ?? 24}
          disabled={isSaving}
          onChange={(v) => onChange('afterSales.customerResponseHours', v)}
        />
        <SettingFieldInput
          id="followUpMaxDays"
          label="Thời hạn chăm sóc tối đa"
          description="Hết thời gian này sẽ ghi nhận chưa hoàn thành."
          value={getValue('afterSales.followUpMaxDays')}
          unit="DAYS"
          min={1}
          max={60}
          defaultValue={getDef('afterSales.followUpMaxDays')?.defaultValue ?? 7}
          disabled={isSaving}
          onChange={(v) => onChange('afterSales.followUpMaxDays', v)}
        />
        <SettingFieldInput
          id="delayedMaintenanceExtensionDays"
          label="Gia hạn bảo trì do hoãn"
          description="Lịch bị hoãn được gia hạn sau kỳ kết thúc."
          value={getValue('afterSales.delayedMaintenanceExtensionDays')}
          unit="DAYS"
          min={0}
          max={180}
          defaultValue={getDef('afterSales.delayedMaintenanceExtensionDays')?.defaultValue ?? 30}
          disabled={isSaving}
          onChange={(v) => onChange('afterSales.delayedMaintenanceExtensionDays', v)}
        />
        <SettingFieldInput
          id="appointmentChangeLeadHours"
          label="Hạn chót đổi / hủy lịch bảo trì"
          description="Khách hàng được đổi/hủy trực tuyến trước giờ hẹn."
          value={getValue('afterSales.appointmentChangeLeadHours')}
          unit="HOURS"
          min={0}
          max={336}
          defaultValue={getDef('afterSales.appointmentChangeLeadHours')?.defaultValue ?? 24}
          disabled={isSaving}
          onChange={(v) => onChange('afterSales.appointmentChangeLeadHours', v)}
        />
        <SettingFieldInput
          id="disasterWaitingDays"
          label="Thời gian chờ gói thiên tai"
          description="Thời gian chờ hiệu lực khi kích hoạt gói rủi ro mới."
          value={getValue('afterSales.disasterWaitingDays')}
          unit="DAYS"
          min={0}
          max={60}
          defaultValue={getDef('afterSales.disasterWaitingDays')?.defaultValue ?? 7}
          disabled={isSaving}
          onChange={(v) => onChange('afterSales.disasterWaitingDays', v)}
        />
      </div>
    </div>
  )
}

export function PaymentQuotationSection({ getValue, getDef, isSaving, onChange }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="border-b border-line pb-2">
        <h4 className="text-body font-semibold text-fg-1">3. Báo giá & Thanh toán Sau bán</h4>
        <p className="text-meta text-fg-3">Thời hạn thanh toán PayOS và hiệu lực báo giá sửa chữa.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SettingFieldInput
          id="quotationValidityDays"
          label="Hiệu lực báo giá sửa chữa / bảo trì"
          description="Báo giá sau bán cần được chấp thuận và thanh toán trong số ngày này."
          value={getValue('afterSales.quotationValidityDays')}
          unit="DAYS"
          min={1}
          max={60}
          defaultValue={getDef('afterSales.quotationValidityDays')?.defaultValue ?? 7}
          disabled={isSaving}
          onChange={(v) => onChange('afterSales.quotationValidityDays', v)}
        />
        <SettingFieldInput
          id="checkoutExpiryMinutes"
          label="Thời hạn phiên thanh toán PayOS"
          description="Thời gian hiệu lực của cổng thanh toán PayOS đối với gói dịch vụ sau bán."
          value={getValue('afterSales.checkoutExpiryMinutes')}
          unit="MINUTES"
          min={5}
          max={1440}
          defaultValue={getDef('afterSales.checkoutExpiryMinutes')?.defaultValue ?? 30}
          disabled={isSaving}
          onChange={(v) => onChange('afterSales.checkoutExpiryMinutes', v)}
        />
      </div>
    </div>
  )
}
