import { useId } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import type { ShadeSummary } from '@/features/pre-surveys/SimulationScene'
import { formatHour } from '@/features/pre-surveys/sunPosition'

/** Khoảng giờ của thanh kéo, đủ từ lúc mặt trời mọc tới lúc lặn ở TP.HCM */
const FIRST_HOUR = 6
const LAST_HOUR = 18
/** Mỗi nấc 15 phút để bóng nắng di chuyển mượt */
const STEP_HOURS = 0.25

const percent = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

type Props = {
  value: number
  onChange: (hour: number) => void
  /** Mặt trời đã lên khỏi đường chân trời chưa */
  sunUp: boolean
  /** Phần diện tích tấm mất nắng lúc này, null khi cảnh 3D chưa tải xong */
  shade: ShadeSummary | null
}

/** Câu tóm tắt nắng trên tấm pin lúc này */
function shadeText(hour: number, sunUp: boolean, shade: ShadeSummary | null) {
  if (!sunUp) return `Mặt trời ${hour < 12 ? 'chưa mọc' : 'đã lặn'}: 100% tấm không có nắng`
  if (!shade) return null
  if (shade.affectedPanels === 0) return 'Không tấm nào bị che'
  // Che rất ít thì làm tròn ra 0%, ghi "dưới 1%" cho đúng
  const value = shade.shadedPercent < 1 ? 'dưới 1' : percent.format(shade.shadedPercent)
  return `Bóng che ${value}% diện tích tấm (${shade.affectedPanels}/${shade.totalPanels} tấm bị che một phần)`
}

// Thanh kéo giờ trong ngày, nằm đè lên mép dưới khung 3D. Kéo thì mặt trời và bóng nắng đổi theo
export function SunTimeSlider({ value, onChange, sunUp, shade }: Props) {
  const id = useId()
  const note = shadeText(value, sunUp, shade)
  return (
    <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-line bg-canvas/90 px-3 py-2 backdrop-blur-sm">
      <label htmlFor={id} className="flex shrink-0 items-center gap-1.5 text-meta font-medium text-fg">
        <Icon name={sunUp ? 'sunny' : 'bedtime'} className="text-[20px] text-warn" />
        <span className="sr-only">Giờ nắng hôm nay:</span>
        <span className="tnum min-w-10">{formatHour(value)}</span>
      </label>
      <input
        id={id}
        type="range"
        min={FIRST_HOUR}
        max={LAST_HOUR}
        step={STEP_HOURS}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={note ? `${formatHour(value)} hôm nay, ${note.toLowerCase()}` : `${formatHour(value)} hôm nay`}
        className="min-w-40 flex-1 accent-warn"
      />
      {note && <span className="tnum shrink-0 text-meta text-fg-2">{note}</span>}
    </div>
  )
}
