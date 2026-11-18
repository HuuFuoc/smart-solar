import { useId, useState, type KeyboardEvent } from 'react'
import { formatCount } from '@/features/ai-usage/aiUsageDisplay'
import { formatUsd } from '@/features/ai-usage/aiUsageRules'
import { useElementWidth } from '@/hooks/useElementWidth'
import type { AiUsageDayView } from '@/types/res/adminRagUsageRes'

// Chi phí mỗi ngày (UTC), một chuỗi cột; số lượt chỉ ở tooltip và bảng, không thêm trục thứ hai.
// Có bảng số liệu bên dưới cho trình đọc màn hình. Không dùng outline-none vì ở Tailwind v4 nó làm mất vòng focus-visible

const MARGIN = { top: 24, right: 8, bottom: 28, left: 76 }
const PLOT_HEIGHT = { min: 160, max: 220, ratio: 0.2 }
const BAR_MAX = 20
const RADIUS = 4
const tick = new Intl.NumberFormat('vi-VN', { maximumSignificantDigits: 2 })

function niceStep(max: number) {
  const raw = max / 4
  const power = 10 ** Math.floor(Math.log10(raw))
  const unit = raw / power
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) * power
}

function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(RADIUS, h, w / 2)
  const base = y + h
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`
}

/** "17/11" */
const dayLabel = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`

export function DailyCostChart({ days }: { days: AiUsageDayView[] }) {
  const [boxRef, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const hintId = useId()
  const list = [...days].sort((a, b) => a.date.localeCompare(b.date))
  if (list.length === 0) return null

  const max = Math.max(...list.map((d) => d.costUsd), 0)
  const step = niceStep(max || 1)
  const top = Math.ceil((max || 1) / step) * step
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
  const peak = list.reduce((best, d, i) => (d.costUsd > list[best]!.costUsd ? i : best), 0)

  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right)
  const plotH = Math.round(Math.min(PLOT_HEIGHT.max, Math.max(PLOT_HEIGHT.min, width * PLOT_HEIGHT.ratio)))
  const band = plotW / list.length
  const barW = Math.min(BAR_MAX, band * 0.6)
  const y = (v: number) => MARGIN.top + plotH - (v / top) * plotH
  const cx = (i: number) => MARGIN.left + band * i + band / 2
  // Nhãn ngày thưa dần khi cột hẹp
  const labelEvery = Math.max(1, Math.ceil(36 / Math.max(band, 1)))

  function onKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    const last = list.length - 1
    const current = active ?? peak
    const next =
      e.key === 'ArrowRight'
        ? Math.min(last, current + 1)
        : e.key === 'ArrowLeft'
          ? Math.max(0, current - 1)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null
    if (next !== null) {
      e.preventDefault()
      setActive(next)
    } else if (e.key === 'Escape') setActive(null)
  }

  const current = active === null ? null : list[active]!
  return (
    <div>
      <div ref={boxRef} className="relative w-full">
        {width > 0 && (
          <svg
            width={width}
            height={MARGIN.top + plotH + MARGIN.bottom}
            role="group"
            aria-label="Biểu đồ chi phí theo ngày, USD"
            aria-describedby={hintId}
            tabIndex={0}
            className="block rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onKeyDown={onKeyDown}
            onFocus={() => setActive((a) => a ?? peak)}
            onBlur={() => setActive(null)}
            onPointerLeave={() => setActive(null)}
          >
            <g aria-hidden>
              {ticks.map((t) => (
                <g key={t}>
                  <line
                    x1={MARGIN.left}
                    x2={MARGIN.left + plotW}
                    y1={y(t)}
                    y2={y(t)}
                    className={t === 0 ? 'stroke-line-2' : 'stroke-line'}
                    strokeWidth="1"
                  />
                  <text x={MARGIN.left - 8} y={y(t) + 4} textAnchor="end" className="tnum fill-fg-3 text-meta">
                    {tick.format(t)}
                  </text>
                </g>
              ))}
              {list.map((d, i) => {
                const h = Math.max(0, y(0) - y(d.costUsd))
                return (
                  <g key={d.date}>
                    {active === i && (
                      <rect x={cx(i) - band / 2} y={MARGIN.top} width={band} height={plotH} className="fill-hover" />
                    )}
                    {h > 0 && <path d={columnPath(cx(i) - barW / 2, y(d.costUsd), barW, h)} className="fill-chart-1" />}
                    {(i % labelEvery === 0 || active === i) && (
                      <text
                        x={cx(i)}
                        y={MARGIN.top + plotH + 18}
                        textAnchor="middle"
                        className={active === i ? 'fill-fg text-meta font-semibold' : 'fill-fg-3 text-meta'}
                      >
                        {dayLabel(d.date)}
                      </text>
                    )}
                    {/* Vùng bắt chuột cao bằng cả vùng vẽ */}
                    <rect
                      x={cx(i) - band / 2}
                      y={MARGIN.top}
                      width={band}
                      height={plotH}
                      fill="transparent"
                      onPointerEnter={() => setActive(i)}
                      onPointerDown={() => setActive(i)}
                    />
                  </g>
                )
              })}
            </g>
          </svg>
        )}
        {current && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-container border border-line bg-panel px-3 py-2 shadow-pop"
            style={{
              left: Math.min(Math.max(cx(active!), 96), width - 96),
              top: Math.max(0, y(current.costUsd) - 8),
            }}
          >
            <p className="tnum text-body font-semibold whitespace-nowrap text-fg">{formatUsd(current.costUsd)}</p>
            <p className="tnum text-meta whitespace-nowrap text-fg-2">
              Ngày {dayLabel(current.date)}, {formatCount(current.requests)} lượt
              {current.failed > 0 && `, ${formatCount(current.failed)} lỗi`}
            </p>
          </div>
        )}
      </div>
      {/* Tooltip ẩn hiện nên cần vùng cố định này cho trình đọc màn hình */}
      <p aria-live="polite" className="sr-only">
        {current
          ? `Ngày ${dayLabel(current.date)}: ${formatUsd(current.costUsd)}, ${formatCount(current.requests)} lượt`
          : ''}
      </p>
      <p id={hintId} className="mt-1 text-meta text-fg-3">
        Rê chuột lên cột, hoặc chọn biểu đồ rồi dùng phím mũi tên để xem từng ngày. Ngày tính theo giờ UTC.
      </p>

      <details className="mt-3">
        <summary className="tap w-fit cursor-pointer text-body font-medium text-accent-fg underline-offset-4 hover:underline">
          Xem bảng số liệu
        </summary>
        <div className="scroll-x mt-3">
          <table className="w-full border-collapse text-body">
            <thead>
              <tr className="text-left text-meta text-fg-2">
                {['Ngày', 'Tổng', 'Soạn câu trả lời', 'Đọc câu hỏi', 'Nạp tài liệu', 'Lượt', 'Lỗi'].map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={
                      i === 0
                        ? 'border-b border-line-2 pr-3 pb-2 font-semibold'
                        : 'border-b border-line-2 px-3 pb-2 text-right font-semibold'
                    }
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tnum">
              {list.map((d) => (
                <tr key={d.date}>
                  <th scope="row" className="border-b border-line py-2 pr-3 text-left font-normal text-fg-2">
                    {dayLabel(d.date)}
                  </th>
                  <td className="border-b border-line px-3 py-2 text-right">{formatUsd(d.costUsd)}</td>
                  <td className="border-b border-line px-3 py-2 text-right">{formatUsd(d.generationCostUsd)}</td>
                  <td className="border-b border-line px-3 py-2 text-right">{formatUsd(d.embeddingCostUsd)}</td>
                  <td className="border-b border-line px-3 py-2 text-right">{formatUsd(d.ingestionCostUsd)}</td>
                  <td className="border-b border-line px-3 py-2 text-right">{formatCount(d.requests)}</td>
                  <td className="border-b border-line px-3 py-2 text-right">{formatCount(d.failed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
