import { cn } from '@/utils/cn'

/*
 * Biểu đồ "Generation Yield Impact" trong maintenance_task: hai đường sản lượng
 * (baseline trước vệ sinh màu secondary, post-wash màu primary) trên lưới nét đứt,
 * kèm chấm đánh dấu đỉnh và hàng chú giải giờ bắt đầu / kết thúc.
 */
export type YieldSeriesPoint = { x: number; y: number }

export type YieldImpactChartProps = {
  /** Toạ độ trong hệ 400x120 như code.html */
  baseline: YieldSeriesPoint[]
  postWash: YieldSeriesPoint[]
  /** Chấm nhấn trên đường post-wash */
  marker?: YieldSeriesPoint
  startLabel: string
  endLabel: string
  baselineLabel: string
  postWashLabel: string
  className?: string
}

const BASE_Y = 110

function toLine(points: YieldSeriesPoint[]) {
  return points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x},${point.y}`).join(' ')
}

function toArea(points: YieldSeriesPoint[]) {
  const last = points[points.length - 1]
  if (!last) return ''
  const first = points[0]
  return `${toLine(points)} L ${last.x},${BASE_Y} L ${first?.x ?? 0},${BASE_Y} Z`
}

export function YieldImpactChart({
  baseline,
  postWash,
  marker,
  startLabel,
  endLabel,
  baselineLabel,
  postWashLabel,
  className,
}: YieldImpactChartProps) {
  return (
    <div className={cn('w-full pt-space-xs', className)}>
      <svg viewBox="0 0 400 120" preserveAspectRatio="none" role="img" aria-label={postWashLabel} className="h-28 w-full">
        <defs>
          <linearGradient id="yield-pre" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fe932c" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#fe932c" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="yield-post" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0d5c3a" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0d5c3a" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line x1="0" x2="400" y1="30" y2="30" stroke="#ccdbf3" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="0" x2="400" y1="70" y2="70" stroke="#ccdbf3" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="0" x2="400" y1="110" y2="110" stroke="#ccdbf3" strokeWidth="1" />

        <path d={toArea(baseline)} fill="url(#yield-pre)" />
        <path d={toLine(baseline)} fill="none" stroke="#fe932c" strokeWidth="2.5" strokeLinecap="round" />

        <path d={toArea(postWash)} fill="url(#yield-post)" />
        <path d={toLine(postWash)} fill="none" stroke="#0d5c3a" strokeWidth="2.5" strokeLinecap="round" />

        {marker && <circle cx={marker.x} cy={marker.y} r="4.5" fill="#0d5c3a" />}
      </svg>

      <div className="flex items-center justify-between pt-1 text-label-sm text-on-surface-variant">
        <span>{startLabel}</span>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="h-1 w-2.5 rounded-sm bg-secondary-container" />
            {baselineLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="h-1 w-2.5 rounded-sm bg-primary-container" />
            {postWashLabel}
          </span>
        </span>
        <span>{endLabel}</span>
      </div>
    </div>
  )
}
