import { useId } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import type { ShadeSummary } from '@/features/pre-surveys/SimulationScene'
import { formatHour } from '@/features/pre-surveys/sunPosition'

/** Khoảng giờ nắng trong ngày: từ bình minh (6:00) tới hoàng hôn (17:30) tại TP.HCM */
const FIRST_HOUR = 6
const LAST_HOUR = 17.5
/** Mỗi nấc 15 phút để bóng nắng di chuyển mượt mà */
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

/** Câu tóm tắt nắng trên tấm pin lúc này (ngắn gọn, chống co giật thanh trượt) */
function shadeText(shade: ShadeSummary | null) {
  if (!shade) return 'Đang tính bóng nắng...'
  if (shade.affectedPanels === 0) return 'Không tấm nào bị che'
  const value = shade.shadedPercent < 1 ? 'dưới 1' : percent.format(shade.shadedPercent)
  return `Bóng che ${value}% (${shade.affectedPanels}/${shade.totalPanels} tấm)`
}

// Thanh kéo giờ trong ngày, nằm đè lên mép dưới khung 3D. Kéo thì mặt trời và bóng nắng dời theo mượt mà
export function SunTimeSlider({ value, onChange, shade }: Props) {
  const id = useId()
  const note = shadeText(shade)
  return (
    <div className="absolute inset-x-3 bottom-3 rounded-container border border-line bg-canvas px-3 py-2 shadow-pop">
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="flex shrink-0 items-center gap-1.5 text-meta font-semibold text-fg min-w-[75px]">
          <Icon name="sunny" className="text-[20px] text-warn" />
          <span className="sr-only">Giờ nắng hôm nay:</span>
          <span className="tnum">{formatHour(value)}</span>
        </label>

        <div className="flex flex-1 items-center min-w-[120px]">
          <input
            id={id}
            type="range"
            min={FIRST_HOUR}
            max={LAST_HOUR}
            step={STEP_HOURS}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            aria-valuetext={`${formatHour(value)} hôm nay, ${note.toLowerCase()}`}
            className="w-full h-2 cursor-pointer accent-warn"
          />
        </div>

        {/* Thông tin che bóng: giới hạn độ rộng rõ ràng, ngăn chặn layout shift */}
        <div
          className="shrink-0 text-right min-w-[150px] max-w-[240px] truncate text-meta text-fg-2 font-medium"
          title={note}
        >
          {note}
        </div>
      </div>
    </div>
  )
}
