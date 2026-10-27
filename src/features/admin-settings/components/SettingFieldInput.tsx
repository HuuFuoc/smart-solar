import { Badge } from '@/components/common/ui/badge'

type SettingFieldInputProps = {
  id: string
  label: string
  description?: string
  value: number
  unit: string
  min: number
  max: number
  step?: number
  defaultValue?: number
  disabled?: boolean
  onChange: (val: number) => void
}

export function SettingFieldInput({
  id,
  label,
  description,
  value,
  unit,
  min,
  max,
  step = 1,
  defaultValue,
  disabled,
  onChange,
}: SettingFieldInputProps) {
  const hasError = value < min || value > max
  const isChanged = defaultValue !== undefined && value !== defaultValue

  return (
    <div className="flex flex-col justify-between rounded-control border border-line bg-surface-1 p-3.5 transition-colors hover:border-fg-3/40">
      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={id} className="text-body font-medium text-fg-1">
            {label}
          </label>
          <Badge tone={isChanged ? 'accent' : 'neutral'}>{unit}</Badge>
        </div>
        {description && <p className="mt-1 text-meta text-fg-3">{description}</p>}
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="number"
            min={min}
            max={max}
            step={step}
            value={Number.isNaN(value) ? '' : value}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className={`w-full rounded-control border px-3 py-1.5 text-body text-fg-1 outline-none transition-colors ${
              hasError ? 'border-err bg-err/10 focus:border-err' : 'border-line bg-canvas focus:border-accent'
            }`}
          />
          {defaultValue !== undefined && value !== defaultValue && (
            <button
              type="button"
              disabled={disabled}
              title={`Khôi phục mặc định: ${defaultValue}`}
              onClick={() => onChange(defaultValue)}
              className="text-meta text-accent hover:underline disabled:opacity-50"
            >
              Mặc định
            </button>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between text-meta text-fg-3">
          <span>
            Khoảng: {min} – {max} {unit}
          </span>
          {defaultValue !== undefined && <span>Mặc định: {defaultValue}</span>}
        </div>
        {hasError && (
          <p className="mt-1 text-meta text-err">
            Giá trị phải nằm trong khoảng từ {min} đến {max} {unit}.
          </p>
        )}
      </div>
    </div>
  )
}
