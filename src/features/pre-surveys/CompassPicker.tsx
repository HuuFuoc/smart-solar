import { COMPASS_GRID } from '@/common/preSurvey'

type Props = {
  /** Góc phương vị dạng chuỗi ("180"), chuỗi rỗng là chưa chọn */
  value: string
  error?: string
  onChange: (degree: string) => void
  /** Tên nhóm radio. Hai la bàn trên cùng trang phải khác tên */
  name?: string
  legend?: string
  hint?: string
  className?: string
}

const OPTION_CLASS =
  'press flex h-11 cursor-pointer items-center justify-center rounded-control border border-line-2 px-2 text-center text-body text-fg-2 hover:border-fg hover:text-fg has-checked:border-accent has-checked:bg-accent-soft has-checked:font-semibold has-checked:text-fg has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring'

// Chọn hướng trên la bàn 3x3 thay vì gõ góc: khách hiểu "mái quay về hướng Nam" hơn "180 độ".
// Mỗi hướng là một radio ẩn trong label, nên Tab vào nhóm rồi dùng phím mũi tên như nhóm radio thường.
export function CompassPicker({
  value,
  error,
  onChange,
  name = 'azimuth',
  legend = 'Mặt mái quay về hướng nào?',
  hint = 'Hướng mặt mái nhìn ra (phía mép thấp). Mái bằng thì chọn Nam.',
  className = 'sm:col-span-2',
}: Props) {
  return (
    <fieldset className={className}>
      <legend className="text-body font-medium text-fg">{legend}</legend>
      <p className="mt-1 mb-3 text-meta text-fg-3">{hint}</p>
      <div className="grid max-w-sm grid-cols-3 gap-2">
        {COMPASS_GRID.map((cell, index) => {
          // Ô giữa lưới là hình mái, không chọn được
          if (cell === null) {
            return (
              <div
                key="roof"
                aria-hidden
                className="flex h-11 items-center justify-center rounded-control border border-dashed border-line-2 text-meta text-fg-3"
              >
                Mái
              </div>
            )
          }
          return (
            <label key={index} className={OPTION_CLASS}>
              <input
                type="radio"
                name={name}
                className="sr-only"
                value={String(cell.degree)}
                checked={value !== '' && Number(value) === cell.degree}
                onChange={() => onChange(String(cell.degree))}
                aria-invalid={Boolean(error)}
              />
              {cell.label}
            </label>
          )
        })}
      </div>
      {error && (
        <p className="mt-2 text-meta text-danger" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
