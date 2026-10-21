import { Field, Input, Radio, Textarea } from '@/components/common/ui/field'
import type { FormErrors, ProfileForm } from '@/features/pre-surveys/assessmentForm'
import { CUSTOMER_TYPES } from '@/common/preSurvey'

type Props = {
  value: ProfileForm
  errors: FormErrors<ProfileForm>
  onChange: (patch: Partial<ProfileForm>) => void
}

// Ô nhập của bước "Thông tin khách hàng". State nằm ở trang cha
export function ProfileFields({ value, errors, onChange }: Props) {
  const isBusiness = value.customerType === '2'
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-body font-medium text-fg">Bạn lắp đặt cho</legend>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {CUSTOMER_TYPES.map((type) => (
            <Radio
              key={type.value}
              name="customerType"
              value={String(type.value)}
              checked={value.customerType === String(type.value)}
              onChange={() => onChange({ customerType: String(type.value) as ProfileForm['customerType'] })}
              label={type.label}
            />
          ))}
        </div>
      </fieldset>

      {isBusiness && (
        <>
          <Field label="Tên doanh nghiệp" htmlFor="companyName" hint="Không bắt buộc." error={errors.companyName}>
            <Input
              id="companyName"
              autoComplete="organization"
              value={value.companyName}
              onChange={(e) => onChange({ companyName: e.target.value })}
              aria-invalid={Boolean(errors.companyName)}
            />
          </Field>
          <Field label="Mã số thuế" htmlFor="taxCode" hint="Không bắt buộc." error={errors.taxCode}>
            <Input
              id="taxCode"
              inputMode="numeric"
              value={value.taxCode}
              onChange={(e) => onChange({ taxCode: e.target.value })}
              aria-invalid={Boolean(errors.taxCode)}
            />
          </Field>
        </>
      )}

      <Field label="Ghi chú" htmlFor="profileNote" hint="Không bắt buộc." className="sm:col-span-2" error={errors.note}>
        <Textarea id="profileNote" rows={3} value={value.note} onChange={(e) => onChange({ note: e.target.value })} />
      </Field>
    </div>
  )
}
