import { Checkbox, Field, Input, fieldMessageId } from '@/components/common/ui/field'
import { advisorFormErrors, hasAdvisorInput, type AdvisorForm } from '@/features/chat/advisorRules'

// Số liệu nhập thêm để trợ lý tính cấu hình tham khảo (diện tích mái, ngân sách, điện tiêu thụ). Gửi kèm câu hỏi tiếp theo rồi
// xoá; ghi trong câu hỏi cũng được, trợ lý tự đọc

export function AdvisorInputs({
  value,
  onChange,
  disabled,
}: {
  value: AdvisorForm
  onChange: (next: AdvisorForm) => void
  disabled: boolean
}) {
  const errors = advisorFormErrors(value)
  const set = (patch: Partial<AdvisorForm>) => onChange({ ...value, ...patch })
  return (
    <details className="border-t border-line px-4 py-2 md:px-5" open={hasAdvisorInput(value) || undefined}>
      <summary className="tap cursor-pointer text-meta font-medium text-fg-2">Thêm số liệu để tư vấn cấu hình</summary>
      <div className="mt-2 grid gap-3">
        <Field label="Diện tích mái (m²)" htmlFor="advisor-area" error={errors.roofArea}>
          <Input
            id="advisor-area"
            inputMode="decimal"
            className="tnum"
            disabled={disabled}
            aria-describedby={fieldMessageId('advisor-area')}
            value={value.roofArea}
            onChange={(e) => set({ roofArea: e.target.value })}
          />
        </Field>
        <Field label="Ngân sách (VND)" htmlFor="advisor-budget" error={errors.budget}>
          <Input
            id="advisor-budget"
            inputMode="numeric"
            className="tnum"
            disabled={disabled}
            aria-describedby={fieldMessageId('advisor-budget')}
            value={value.budget}
            onChange={(e) => set({ budget: e.target.value })}
          />
        </Field>
        <Field label="Điện dùng (kWh/tháng)" htmlFor="advisor-kwh" error={errors.monthlyKwh}>
          <Input
            id="advisor-kwh"
            inputMode="decimal"
            className="tnum"
            disabled={disabled}
            aria-describedby={fieldMessageId('advisor-kwh')}
            value={value.monthlyKwh}
            onChange={(e) => set({ monthlyKwh: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-2">
        <Checkbox
          checked={value.wantsBattery}
          disabled={disabled}
          onChange={(e) => set({ wantsBattery: e.target.checked })}
          label="Muốn có pin lưu trữ"
        />
      </div>
    </details>
  )
}
