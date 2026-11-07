import { Button } from '@/components/common/ui/button'
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
    <div className="flex flex-col justify-between rounded-control border border-line bg-canvas p-3.5 transition-colors hover:border-fg-3/40">
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
            className={`h-11 w-full rounded-control border px-3 text-body text-fg outline-none transition-colors lg:h-9 ${
              hasError
                ? 'border-danger bg-danger-soft focus:border-danger'
                : 'border-line-2 bg-canvas focus:border-accent'
            }`}
          />
          {defaultValue !== undefined && value !== defaultValue && (
            <Button
              variant="ghost"
              size="sm"
              icon="restart_alt"
              bleed={false}
              disabled={disabled}
              aria-label={`Dùng giá trị mặc định: ${defaultValue}`}
              onClick={() => onChange(defaultValue)}
            >
              Mặc định
            </Button>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between text-meta text-fg-3">
          <span>
            Khoảng: {min} – {max} {unit}
          </span>
          {defaultValue !== undefined && <span>Mặc định: {defaultValue}</span>}
        </div>
        {hasError && (
          <p className="mt-1 text-meta text-danger">
            Giá trị phải nằm trong khoảng từ {min} đến {max} {unit}.
          </p>
        )}
      </div>
    </div>
  )
}
