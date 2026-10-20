import { useId, useState, type KeyboardEvent } from 'react'
import { MONTHS, MONTH_NAMES, formatKwh, formatOne } from '@/features/pre-surveys/components/simulationDisplay'
import { useElementWidth } from '@/hooks/useElementWidth'
import type { MonthlyPvEnergy } from '@/types/res/simulationsRes'

/*
  Sản lượng điện theo tháng (PVGIS, năm điển hình): biểu đồ cột một chuỗi theo skill dataviz – cột ≤ 24px, đỉnh bo 4px,
  chân vuông trên một đường gốc; lưới ngang mảnh; một chuỗi nên không có chú giải (tiêu đề panel đã nói đang vẽ gì);
  chỉ ghi số trên cột cao nhất. Rê chuột hoặc focus rồi dùng phím mũi tên để xem từng tháng; bảng số liệu bên dưới
  cho người không xem được hình. Màu cột là token --chart-1 (đã đo ≥ 3:1 trên nền ở cả hai chế độ).
  Vòng focus: KHÔNG gắn `outline-none` – ở Tailwind v4 nó đặt --tw-outline-style: none và `focus-visible:outline-2` dùng lại
  biến đó, nên vòng focus biến mất (lỗi kiểm thử 09/10/2026).
*/

const MARGIN = { top: 24, right: 8, bottom: 28, left: 52 }
/** Cao vùng vẽ theo bề rộng (≈ 1/5), trong khoảng 180–240px: kết quả rộng hết trang thì biểu đồ không thành một dải mỏng. */
const PLOT_HEIGHT = { min: 180, max: 240, ratio: 0.2 }
const BAR_MAX = 24
const RADIUS = 4

/** Trục y tròn số: 0 / 500 / 1.000 / 1.500… */
function niceStep(max: number) {
  const raw = max / 4
  const power = 10 ** Math.floor(Math.log10(raw))
  const unit = raw / power
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) * power
}

/* Cột bo 4px ở đỉnh (đầu dữ liệu), vuông ở chân. */
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(RADIUS, h, w / 2)
  const base = y + h
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`
}

export function EnergyChart({ monthly }: { monthly: MonthlyPvEnergy[] }) {
  const [boxRef, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const hintId = useId()
  const months = [...monthly].sort((a, b) => a.month - b.month)
  if (months.length === 0) return null

  const max = Math.max(...months.map((m) => m.energyKwh), 0)
  const step = niceStep(max || 1)
  const top = Math.ceil((max || 1) / step) * step
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
  const peak = months.reduce((best, m, i) => (m.energyKwh > months[best]!.energyKwh ? i : best), 0)

  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right)
  const plotH = Math.round(Math.min(PLOT_HEIGHT.max, Math.max(PLOT_HEIGHT.min, width * PLOT_HEIGHT.ratio)))
  const band = plotW / months.length
  const barW = Math.min(BAR_MAX, band * 0.6)
  const y = (v: number) => MARGIN.top + plotH - (v / top) * plotH
  const cx = (i: number) => MARGIN.left + band * i + band / 2
  const shortLabels = band < 30

  function onKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    const last = months.length - 1
    const current = active ?? peak
    const next = e.key === 'ArrowRight' ? Math.min(last, current + 1) : e.key === 'ArrowLeft' ? Math.max(0, current - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : null
    if (next !== null) {
      e.preventDefault()
      setActive(next)
    } else if (e.key === 'Escape') setActive(null)
  }

  const current = active === null ? null : months[active]!
  return (
    <div>
      <div ref={boxRef} className="relative w-full">
        {width > 0 && (
          <svg
            width={width}
            height={MARGIN.top + plotH + MARGIN.bottom}
            role="group"
            aria-label="Biểu đồ sản lượng điện theo tháng, kWh"
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
                  <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={y(t)} y2={y(t)} className={t === 0 ? 'stroke-line-2' : 'stroke-line'} strokeWidth="1" />
                  <text x={MARGIN.left - 8} y={y(t) + 4} textAnchor="end" className="tnum fill-fg-3 text-meta">
                    {formatKwh(t)}
                  </text>
                </g>
              ))}
              {months.map((m, i) => {
                const h = Math.max(0, y(0) - y(m.energyKwh))
                return (
                  <g key={m.month}>
                    {active === i && <rect x={cx(i) - band / 2} y={MARGIN.top} width={band} height={plotH} className="fill-hover" />}
                    <path d={columnPath(cx(i) - barW / 2, y(m.energyKwh), barW, h)} className="fill-chart-1" />
                    <text x={cx(i)} y={MARGIN.top + plotH + 18} textAnchor="middle" className={active === i ? 'fill-fg text-meta font-semibold' : 'fill-fg-3 text-meta'}>
                      {shortLabels ? m.month : MONTHS[m.month - 1]}
                    </text>
                    {i === peak && active !== i && (
                      <text x={cx(i)} y={y(m.energyKwh) - 6} textAnchor="middle" className="tnum fill-fg-2 text-meta">
                        {formatKwh(m.energyKwh)}
                      </text>
                    )}
                    {/* Vùng bắt chuột cả cột (cao bằng vùng vẽ), lớn hơn hẳn cột. */}
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
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-container border border-line bg-canvas px-3 py-2 shadow-pop"
            style={{
              left: Math.min(Math.max(cx(active!), 72), width - 72),
              top: Math.max(0, y(current.energyKwh) - 8),
            }}
          >
            <p className="tnum text-body font-semibold whitespace-nowrap text-fg">{formatKwh(current.energyKwh)} kWh</p>
            <p className="text-meta whitespace-nowrap text-fg-2">
              {MONTH_NAMES[current.month - 1]}
              {current.stdDevKwh != null && <>, dao động ±{formatKwh(current.stdDevKwh)} kWh</>}
            </p>
          </div>
        )}
      </div>
      {/* Vùng đọc cố định cho trình đọc màn hình: tooltip hiện / ẩn nên không tự được đọc. */}
      <p aria-live="polite" className="sr-only">
        {current ? `${MONTH_NAMES[current.month - 1]}: ${formatKwh(current.energyKwh)} kWh` : ''}
      </p>
      <p id={hintId} className="mt-1 text-meta text-fg-3">
        Rê chuột lên cột, hoặc chọn biểu đồ rồi dùng phím mũi tên để xem từng tháng.
      </p>

      <details className="mt-3">
        <summary className="tap w-fit cursor-pointer text-body font-medium text-accent-fg underline-offset-4 hover:underline">Xem bảng số liệu</summary>
        <div className="scroll-x mt-3">
          <table className="w-full border-collapse text-body">
            <thead>
              <tr className="text-left text-meta text-fg-2">
                <th scope="col" className="border-b border-line-2 pr-3 pb-2 font-semibold">Tháng</th>
                <th scope="col" className="border-b border-line-2 px-3 pb-2 text-right font-semibold">Sản lượng (kWh)</th>
                <th scope="col" className="border-b border-line-2 px-3 pb-2 text-right font-semibold">Dao động (± kWh)</th>
                <th scope="col" className="border-b border-line-2 pb-2 pl-3 text-right font-semibold">Bức xạ trên mặt tấm (kWh/m²)</th>
              </tr>
            </thead>
            <tbody className="tnum">
              {months.map((m) => (
                <tr key={m.month}>
                  <th scope="row" className="border-b border-line py-2 pr-3 text-left font-normal text-fg-2">
                    {MONTH_NAMES[m.month - 1]}
                  </th>
                  <td className="border-b border-line px-3 py-2 text-right">{formatKwh(m.energyKwh)}</td>
                  <td className="border-b border-line px-3 py-2 text-right">{formatKwh(m.stdDevKwh)}</td>
                  <td className="border-b border-line py-2 pl-3 text-right">{formatOne(m.inPlaneIrradiationKwhPerM2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
