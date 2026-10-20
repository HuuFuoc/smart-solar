import { useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { NUDGE_M, round3 } from '@/features/pre-surveys/surfaceForm'
import { formatTwo } from '@/features/pre-surveys/simulationDisplay'
import { useElementWidth } from '@/hooks/useElementWidth'
import { useViewportHeight } from '@/hooks/useViewportHeight'
import { cx } from '@/utils/cx'

// Mặt bằng mặt lắp vẽ bằng SVG, theo hệ toạ độ của mặt lắp (không xoay theo hướng Bắc):
// mép trên của hình là mép cao của mái, đi xuống là xuôi dốc.
// Vẽ bằng pixel (đo bề rộng khung) để chữ luôn đúng cỡ và kéo thả đổi đúng ra mét.
// Dùng ở hai nơi: editor mặt lắp (chọn, kéo thả vật cản) và kết quả mô phỏng (vẽ thêm tấm pin).

export type PlanObstacle = { name: string; xM: number; yM: number; widthM: number; lengthM: number }
export type PlanPanel = { centerXM: number; centerYM: number; widthM: number; depthM: number; rotationDegree: number }

const MARGIN = { top: 28, right: 12, bottom: 28, left: 36 }
/** Phần chiều cao màn hình dành cho thanh trên, thanh thao tác và nhãn */
const RESERVED_HEIGHT = 200
/** Màn thấp vẫn giữ hình đủ lớn để kéo vật cản */
const MIN_PLOT_HEIGHT = 280
/** Chú thích không hẹp hơn mức này, kẻo mỗi dòng chỉ vài chữ */
const CAPTION_MIN_WIDTH = 320
/** Các khoảng lưới có thể dùng (mét). Chọn khoảng nhỏ nhất mà hai vạch cách nhau tối thiểu ~32px */
const GRID_STEPS = [0.5, 1, 2, 5, 10, 20, 50]

const snap = (value: number, step: number) => round3(Math.round(value / step) * step)
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max))

export function SurfacePlan({
  widthM,
  lengthM,
  obstacles,
  panels,
  setbackM,
  clearanceM,
  selected = null,
  onSelect,
  onMove,
  label,
  caption,
  className,
}: {
  widthM: number
  lengthM: number
  obstacles: PlanObstacle[]
  panels?: PlanPanel[]
  /** Vùng lùi mép của kết quả mô phỏng (mét) */
  setbackM?: number
  /** Khoảng cách quanh vật cản của kết quả mô phỏng (mét) */
  clearanceM?: number
  selected?: number | null
  onSelect?: (index: number | null) => void
  /** Có thì vật cản kéo thả / dịch bằng phím được. Toạ độ mới đã làm tròn theo bước 0,1 m */
  onMove?: (index: number, xM: number, yM: number) => void
  /** Mô tả cho trình đọc màn hình */
  label: string
  /** Chú thích ngay dưới hình */
  caption?: ReactNode
  className?: string
}) {
  const [boxRef, boxWidth] = useElementWidth<HTMLDivElement>()
  const viewportHeight = useViewportHeight()
  const hatchId = useId()
  const hintId = useId()
  const drag = useRef<{ index: number; pointerX: number; pointerY: number; xM: number; yM: number } | null>(null)
  const interactive = Boolean(onMove)

  const plotMaxW = Math.max(0, boxWidth - MARGIN.left - MARGIN.right)
  const plotMaxH = Math.max(MIN_PLOT_HEIGHT, viewportHeight - RESERVED_HEIGHT)
  const scale = widthM > 0 && lengthM > 0 ? Math.min(plotMaxW / widthM, plotMaxH / lengthM) : 0
  const plotW = widthM * scale
  const plotH = lengthM * scale
  const left = MARGIN.left + (plotMaxW - plotW) / 2
  const top = MARGIN.top
  const px = (xM: number) => left + xM * scale
  const py = (yM: number) => top + yM * scale
  const grid = GRID_STEPS.find((s) => s * scale >= 32) ?? GRID_STEPS.at(-1)!
  // Hình hẹp hơn khung (căn giữa) thì chú thích rộng bằng hình để nằm ngay dưới hình
  const captionWidth = Math.min(boxWidth, Math.max(plotW, CAPTION_MIN_WIDTH))
  const captionStyle =
    scale > 0 && plotW < plotMaxW - 1
      ? { marginLeft: clamp(left + plotW / 2 - captionWidth / 2, 0, boxWidth - captionWidth), width: captionWidth }
      : undefined
  // Câu đọc cho trình đọc màn hình sau khi dịch vật cản bằng phím (kéo chuột thì đã thấy ô nhập đổi theo)
  const [announcement, setAnnouncement] = useState('')

  // Làm tròn bước dịch theo 0,1 m chứ không làm tròn vị trí, nên 0,35 m dịch phải thành 0,45 m. Kẹp trong mặt lắp
  function move(index: number, fromX: number, fromY: number, dx: number, dy: number) {
    const o = obstacles[index]
    if (!o || !onMove) return null
    const x = clamp(round3(fromX + snap(dx, NUDGE_M)), 0, round3(widthM - o.widthM))
    const y = clamp(round3(fromY + snap(dy, NUDGE_M)), 0, round3(lengthM - o.lengthM))
    onMove(index, x, y)
    return { x, y }
  }

  function onPointerDown(e: PointerEvent<SVGRectElement>, index: number) {
    onSelect?.(index)
    if (!onMove || e.button !== 0) return
    const o = obstacles[index]!
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { index, pointerX: e.clientX, pointerY: e.clientY, xM: o.xM, yM: o.yM }
  }

  function onPointerMove(e: PointerEvent<SVGRectElement>) {
    const d = drag.current
    if (!d || scale <= 0) return
    move(d.index, d.xM, d.yM, (e.clientX - d.pointerX) / scale, (e.clientY - d.pointerY) / scale)
  }

  function onKeyDown(e: KeyboardEvent<SVGRectElement>, index: number) {
    const o = obstacles[index]!
    const step = e.shiftKey ? 1 : NUDGE_M
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const d = delta[e.key]
    if (d && onMove) {
      e.preventDefault()
      onSelect?.(index)
      const moved = move(index, o.xM, o.yM, d[0], d[1])
      if (moved)
        setAnnouncement(
          `${o.name || `Vật cản ${index + 1}`}: cách mép trái ${formatTwo(moved.x)} m, cách mép cao ${formatTwo(moved.y)} m`,
        )
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect?.(index)
    } else if (e.key === 'Escape') onSelect?.(null)
  }

  const gridLines: number[][] = [[], []]
  if (scale > 0) {
    for (let x = grid; x < widthM - 1e-9; x += grid) gridLines[0]!.push(x)
    for (let y = grid; y < lengthM - 1e-9; y += grid) gridLines[1]!.push(y)
  }

  return (
    <div ref={boxRef} className={cx('w-full', className)}>
      {scale > 0 && (
        <svg
          width={boxWidth}
          height={top + plotH + MARGIN.bottom}
          role={interactive ? 'group' : 'img'}
          aria-label={label}
          aria-describedby={interactive ? hintId : undefined}
          className="block select-none"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onSelect?.(null)
          }}
        >
          <defs>
            <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" className="stroke-fg-3" strokeWidth="1.5" />
            </pattern>
          </defs>

          {/* Kích thước: rộng ghi trên mép cao, dài ghi dọc mép trái */}
          <text x={left + plotW / 2} y={top - 10} textAnchor="middle" className="fill-fg-2 text-meta">
            Mép cao, rộng {formatTwo(widthM)} m
          </text>
          <text
            x={left - 12}
            y={top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 ${left - 12} ${top + plotH / 2})`}
            className="fill-fg-2 text-meta"
          >
            Dài {formatTwo(lengthM)} m
          </text>
          <text x={left + plotW / 2} y={top + plotH + 20} textAnchor="middle" className="fill-fg-3 text-meta">
            Mép thấp
          </text>

          {/* Mặt lắp và lưới */}
          <rect
            x={left}
            y={top}
            width={plotW}
            height={plotH}
            className="fill-surface-2 stroke-fg-3"
            strokeWidth="1"
            onPointerDown={() => onSelect?.(null)}
          />
          <g aria-hidden className="pointer-events-none stroke-line" strokeWidth="1">
            {gridLines[0]!.map((x) => (
              <line key={`x${x}`} x1={px(x)} x2={px(x)} y1={top} y2={top + plotH} />
            ))}
            {gridLines[1]!.map((y) => (
              <line key={`y${y}`} x1={left} x2={left + plotW} y1={py(y)} y2={py(y)} />
            ))}
          </g>

          {setbackM !== undefined && setbackM > 0 && widthM > 2 * setbackM && lengthM > 2 * setbackM && (
            <rect
              aria-hidden
              x={px(setbackM)}
              y={py(setbackM)}
              width={(widthM - 2 * setbackM) * scale}
              height={(lengthM - 2 * setbackM) * scale}
              className="pointer-events-none fill-none stroke-fg-3"
              strokeDasharray="4 4"
            />
          )}

          {panels && panels.length > 0 && (
            <g aria-hidden className="pointer-events-none fill-pv-glass stroke-pv-frame">
              {panels.map((p, i) => (
                <rect
                  key={i}
                  x={-p.widthM / 2}
                  y={-p.depthM / 2}
                  width={p.widthM}
                  height={p.depthM}
                  // Vẽ theo mét rồi phóng bằng transform để xoay quanh tâm tấm như footprint của backend
                  transform={`translate(${px(p.centerXM)} ${py(p.centerYM)}) scale(${scale}) rotate(${p.rotationDegree})`}
                  strokeWidth={Math.min(1, (p.widthM * scale) / 8) / scale}
                />
              ))}
            </g>
          )}

          {obstacles.map((o, i) => {
            // Vật cản chưa nhập đủ hoặc sai kích thước thì không vẽ
            if (!(o.widthM > 0 && o.lengthM > 0)) return null
            const isSelected = selected === i

            // Vật cản tràn ra ngoài mặt lắp (đang nhập dở hoặc sai số) thì viền đỏ, trùng với lỗi ở ô nhập
            const outside =
              o.xM < 0 || o.yM < 0 || round3(o.xM + o.widthM) > widthM || round3(o.yM + o.lengthM) > lengthM
            // Chỉ vẽ phần nằm trong mặt lắp để hình không tràn ra ngoài, danh sách vật cản vẫn báo lỗi
            const x0 = Math.max(0, o.xM)
            const y0 = Math.max(0, o.yM)
            const x1 = Math.min(widthM, o.xM + o.widthM)
            const y1 = Math.min(lengthM, o.yM + o.lengthM)
            if (x1 <= x0 || y1 <= y0) return null
            const x = px(x0)
            const y = py(y0)
            const w = (x1 - x0) * scale
            const h = (y1 - y0) * scale
            const c = clearanceM ?? 0
            return (
              <g key={i}>
                {c > 0 && (
                  <rect
                    aria-hidden
                    x={px(Math.max(0, o.xM - c))}
                    y={py(Math.max(0, o.yM - c))}
                    width={(Math.min(widthM, o.xM + o.widthM + c) - Math.max(0, o.xM - c)) * scale}
                    height={(Math.min(lengthM, o.yM + o.lengthM + c) - Math.max(0, o.yM - c)) * scale}
                    className="pointer-events-none fill-none stroke-fg-3"
                    strokeDasharray="3 3"
                  />
                )}
                <rect x={x} y={y} width={w} height={h} fill={`url(#${hatchId})`} className="pointer-events-none" />
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  role={interactive ? 'button' : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  aria-label={
                    interactive
                      ? `${o.name || `Vật cản ${i + 1}`}: cách mép trái ${formatTwo(o.xM)} m, cách mép cao ${formatTwo(o.yM)} m`
                      : undefined
                  }
                  className={cx(
                    'fill-transparent outline-none',
                    outside ? 'stroke-danger' : isSelected ? 'stroke-accent' : 'stroke-fg-2',
                    interactive && 'cursor-grab touch-none focus-visible:stroke-ring active:cursor-grabbing',
                  )}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  onPointerDown={interactive || onSelect ? (e) => onPointerDown(e, i) : undefined}
                  onPointerMove={interactive ? onPointerMove : undefined}
                  onPointerUp={() => (drag.current = null)}
                  onPointerCancel={() => (drag.current = null)}
                  onKeyDown={interactive ? (e) => onKeyDown(e, i) : undefined}
                />
                {w > 56 && h > 22 ? (
                  // Số thứ tự (trùng số ở danh sách vật cản) rồi tên, cắt bớt theo bề ngang ô
                  <text
                    x={x + 6}
                    y={y + 16}
                    className={cx('pointer-events-none text-meta', isSelected ? 'fill-accent-fg' : 'fill-fg')}
                    paintOrder="stroke"
                    stroke="var(--surface-2)"
                    strokeWidth="3"
                  >
                    <tspan className="font-semibold">{i + 1}</tspan>
                    {o.name && ` ${truncate(o.name, Math.floor((w - 12) / 7) - String(i + 1).length - 1)}`}
                  </text>
                ) : (
                  // Không đủ chỗ ghi tên thì chỉ ghi số thứ tự
                  w > 14 &&
                  h > 14 && (
                    <text
                      aria-hidden
                      x={x + w / 2}
                      y={y + h / 2 + 4}
                      textAnchor="middle"
                      className={cx(
                        'pointer-events-none text-meta font-semibold',
                        isSelected ? 'fill-accent-fg' : 'fill-fg',
                      )}
                      paintOrder="stroke"
                      stroke="var(--surface-2)"
                      strokeWidth="3"
                    >
                      {i + 1}
                    </text>
                  )
                )}
              </g>
            )
          })}
        </svg>
      )}
      {interactive && (
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      )}
      {(interactive || caption) && (
        <div className="mt-2 space-y-1 text-pretty" style={captionStyle}>
          {interactive && (
            <p id={hintId} className="text-meta text-fg-3">
              Kéo vật cản để đổi vị trí, hoặc chọn rồi dùng phím mũi tên (giữ Shift để dịch 1&nbsp;m).
            </p>
          )}
          {caption}
        </div>
      )}
    </div>
  )
}

/** Cắt chữ còn tối đa `max` ký tự, thêm dấu ba chấm ở cuối */
function truncate(text: string, max: number) {
  if (max <= 1) return ''
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text
}
