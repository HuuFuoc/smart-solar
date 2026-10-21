import { useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { formatTwo } from '@/features/pre-surveys/simulationDisplay'
import { NUDGE_M } from '@/features/pre-surveys/surfaceForm'
import { useElementWidth } from '@/hooks/useElementWidth'
import { useViewportHeight } from '@/hooks/useViewportHeight'
import { cx } from '@/utils/cx'
import { roundTo3Decimals } from '@/utils/number'

// Mặt bằng mặt lắp vẽ bằng SVG, theo hệ toạ độ của mặt lắp (không xoay theo hướng Bắc):
// mép trên của hình là mép cao của mái, đi xuống là xuôi dốc.
// Vẽ bằng pixel (đo bề rộng khung) để chữ luôn đúng cỡ và kéo thả đổi đúng ra mét.
// Dùng ở hai nơi: editor mặt lắp (chọn, kéo thả vật cản) và kết quả mô phỏng (vẽ thêm tấm pin).

export type PlanObstacle = { name: string; xM: number; yM: number; widthM: number; lengthM: number }
export type PlanPanel = { centerXM: number; centerYM: number; widthM: number; depthM: number; rotationDegree: number }

type Props = {
  widthM: number
  lengthM: number
  obstacles: PlanObstacle[]
  /** Tấm pin (kết quả mô phỏng) */
  panels?: PlanPanel[]
  /** Vùng lùi mép (kết quả mô phỏng), mét */
  setbackM?: number
  /** Khoảng cách quanh vật cản (kết quả mô phỏng), mét */
  clearanceM?: number
  selected?: number | null
  onSelect?: (index: number | null) => void
  /** Có thì cho kéo thả / dịch vật cản bằng phím (editor). Toạ độ mới đã làm tròn và nằm trong mặt lắp */
  onMove?: (index: number, xM: number, yM: number) => void
  /** Mô tả cho trình đọc màn hình */
  label: string
  /** Chú thích hiện ngay dưới hình */
  caption?: ReactNode
  className?: string
}

const MARGIN = { top: 28, right: 12, bottom: 28, left: 36 }
/** Phần chiều cao màn hình dành cho thanh trên, thanh thao tác và nhãn */
const RESERVED_HEIGHT = 200
/** Màn thấp vẫn giữ hình đủ lớn để kéo vật cản */
const MIN_PLOT_HEIGHT = 280
/** Chú thích không hẹp hơn mức này, kẻo mỗi dòng chỉ vài chữ */
const CAPTION_MIN_WIDTH = 320
/** Các khoảng lưới có thể dùng (mét). Chọn khoảng nhỏ nhất mà hai vạch cách nhau tối thiểu ~32px */
const GRID_STEPS = [0.5, 1, 2, 5, 10, 20, 50]

/** Làm tròn `value` theo bội số của `step` */
function snapToStep(value: number, step: number) {
  return roundTo3Decimals(Math.round(value / step) * step)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

/** Tên vật cản để hiện, chưa đặt tên thì dùng số thứ tự */
function obstacleName(obstacle: PlanObstacle, index: number) {
  return obstacle.name || `Vật cản ${index + 1}`
}

/**
 * Kích thước và vị trí hình vẽ (pixel).
 * Hình phóng to hết mức có thể: rộng bằng khung, cao vừa phần màn hình còn lại, căn giữa theo chiều ngang.
 */
function computeLayout(boxWidth: number, viewportHeight: number, widthM: number, lengthM: number) {
  const maxPlotWidth = Math.max(0, boxWidth - MARGIN.left - MARGIN.right)
  const maxPlotHeight = Math.max(MIN_PLOT_HEIGHT, viewportHeight - RESERVED_HEIGHT)
  const scale = widthM > 0 && lengthM > 0 ? Math.min(maxPlotWidth / widthM, maxPlotHeight / lengthM) : 0
  const plotWidth = widthM * scale
  const plotHeight = lengthM * scale
  const left = MARGIN.left + (maxPlotWidth - plotWidth) / 2
  const top = MARGIN.top
  const gridStep = GRID_STEPS.find((step) => step * scale >= 32) ?? GRID_STEPS.at(-1)!

  // Hình hẹp hơn khung (bị giới hạn chiều cao nên căn giữa) thì chú thích rộng bằng hình, nằm ngay dưới hình
  let captionStyle: { marginLeft: number; width: number } | undefined
  if (scale > 0 && plotWidth < maxPlotWidth - 1) {
    const captionWidth = Math.min(boxWidth, Math.max(plotWidth, CAPTION_MIN_WIDTH))
    const marginLeft = clamp(left + plotWidth / 2 - captionWidth / 2, 0, boxWidth - captionWidth)
    captionStyle = { marginLeft, width: captionWidth }
  }

  return {
    scale,
    plotWidth,
    plotHeight,
    left,
    top,
    gridStep,
    captionStyle,
    /** Mét theo chiều rộng thành toạ độ x (pixel) */
    toX: (meters: number) => left + meters * scale,
    /** Mét theo chiều dài thành toạ độ y (pixel) */
    toY: (meters: number) => top + meters * scale,
  }
}

type Layout = ReturnType<typeof computeLayout>

/** Vị trí các vạch lưới (mét), không tính hai mép */
function gridPositions(length: number, step: number) {
  const positions: number[] = []
  for (let position = step; position < length - 1e-9; position += step) positions.push(position)
  return positions
}

type DragState = { index: number; pointerX: number; pointerY: number; startXM: number; startYM: number }

const ARROW_DIRECTIONS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

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
}: Props) {
  const [boxRef, boxWidth] = useElementWidth<HTMLDivElement>()
  const viewportHeight = useViewportHeight()
  const hatchId = useId()
  const hintId = useId()
  const dragRef = useRef<DragState | null>(null)
  // Câu đọc cho trình đọc màn hình sau khi dịch vật cản bằng phím (kéo chuột thì đã thấy ô nhập đổi theo)
  const [announcement, setAnnouncement] = useState('')
  const interactive = Boolean(onMove)
  const layout = computeLayout(boxWidth, viewportHeight, widthM, lengthM)

  /**
   * Dịch vật cản đi (dx, dy) mét tính từ vị trí lúc bắt đầu, kẹp trong mặt lắp.
   * Làm tròn bước dịch theo 0,1 m chứ không làm tròn vị trí, nên vật cản ở 0,35 m dịch phải thành 0,45 m.
   */
  function moveObstacle(index: number, startX: number, startY: number, dx: number, dy: number) {
    const obstacle = obstacles[index]
    if (!obstacle || !onMove) return null
    const x = clamp(roundTo3Decimals(startX + snapToStep(dx, NUDGE_M)), 0, roundTo3Decimals(widthM - obstacle.widthM))
    const y = clamp(roundTo3Decimals(startY + snapToStep(dy, NUDGE_M)), 0, roundTo3Decimals(lengthM - obstacle.lengthM))
    onMove(index, x, y)
    return { x, y }
  }

  function handlePointerDown(event: PointerEvent<SVGRectElement>, index: number) {
    onSelect?.(index)
    if (!onMove || event.button !== 0) return
    const obstacle = obstacles[index]!
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      index,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startXM: obstacle.xM,
      startYM: obstacle.yM,
    }
  }

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    const drag = dragRef.current
    if (!drag || layout.scale <= 0) return
    const dx = (event.clientX - drag.pointerX) / layout.scale
    const dy = (event.clientY - drag.pointerY) / layout.scale
    moveObstacle(drag.index, drag.startXM, drag.startYM, dx, dy)
  }

  function handlePointerEnd() {
    dragRef.current = null
  }

  function handleKeyDown(event: KeyboardEvent<SVGRectElement>, index: number) {
    const direction = ARROW_DIRECTIONS[event.key]
    if (direction && onMove) {
      event.preventDefault()
      onSelect?.(index)
      // Giữ Shift thì dịch 1 m mỗi lần
      const step = event.shiftKey ? 1 : NUDGE_M
      const obstacle = obstacles[index]!
      const moved = moveObstacle(index, obstacle.xM, obstacle.yM, direction[0] * step, direction[1] * step)
      if (moved) {
        const name = obstacleName(obstacle, index)
        setAnnouncement(`${name}: cách mép trái ${formatTwo(moved.x)} m, cách mép cao ${formatTwo(moved.y)} m`)
      }
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect?.(index)
      return
    }
    if (event.key === 'Escape') onSelect?.(null)
  }

  const { scale, plotWidth, plotHeight, left, top, toX, toY } = layout
  const verticalLines = scale > 0 ? gridPositions(widthM, layout.gridStep) : []
  const horizontalLines = scale > 0 ? gridPositions(lengthM, layout.gridStep) : []
  const showSetback = setbackM !== undefined && setbackM > 0 && widthM > 2 * setbackM && lengthM > 2 * setbackM

  return (
    <div ref={boxRef} className={cx('w-full', className)}>
      {scale > 0 && (
        <svg
          width={boxWidth}
          height={top + plotHeight + MARGIN.bottom}
          role={interactive ? 'group' : 'img'}
          aria-label={label}
          aria-describedby={interactive ? hintId : undefined}
          className="block select-none"
          onPointerDown={(event) => {
            // Bấm ra ngoài mặt lắp thì bỏ chọn
            if (event.target === event.currentTarget) onSelect?.(null)
          }}
        >
          <defs>
            <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" className="stroke-fg-3" strokeWidth="1.5" />
            </pattern>
          </defs>

          {/* Nhãn kích thước: rộng trên mép cao, dài dọc mép trái */}
          <text x={left + plotWidth / 2} y={top - 10} textAnchor="middle" className="fill-fg-2 text-meta">
            Mép cao, rộng {formatTwo(widthM)} m
          </text>
          <text
            x={left - 12}
            y={top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 ${left - 12} ${top + plotHeight / 2})`}
            className="fill-fg-2 text-meta"
          >
            Dài {formatTwo(lengthM)} m
          </text>
          <text x={left + plotWidth / 2} y={top + plotHeight + 20} textAnchor="middle" className="fill-fg-3 text-meta">
            Mép thấp
          </text>

          {/* Mặt lắp và lưới */}
          <rect
            x={left}
            y={top}
            width={plotWidth}
            height={plotHeight}
            className="fill-surface-2 stroke-fg-3"
            strokeWidth="1"
            onPointerDown={() => onSelect?.(null)}
          />
          <g aria-hidden className="pointer-events-none stroke-line" strokeWidth="1">
            {verticalLines.map((x) => (
              <line key={`x${x}`} x1={toX(x)} x2={toX(x)} y1={top} y2={top + plotHeight} />
            ))}
            {horizontalLines.map((y) => (
              <line key={`y${y}`} x1={left} x2={left + plotWidth} y1={toY(y)} y2={toY(y)} />
            ))}
          </g>

          {/* Vùng lùi mép (kết quả mô phỏng) */}
          {showSetback && (
            <rect
              aria-hidden
              x={toX(setbackM)}
              y={toY(setbackM)}
              width={(widthM - 2 * setbackM) * scale}
              height={(lengthM - 2 * setbackM) * scale}
              className="pointer-events-none fill-none stroke-fg-3"
              strokeDasharray="4 4"
            />
          )}

          {panels && panels.length > 0 && <PanelShapes panels={panels} layout={layout} />}

          {obstacles.map((obstacle, index) => (
            <ObstacleShape
              key={index}
              obstacle={obstacle}
              index={index}
              layout={layout}
              surfaceWidthM={widthM}
              surfaceLengthM={lengthM}
              clearanceM={clearanceM ?? 0}
              hatchId={hatchId}
              selected={selected === index}
              interactive={interactive}
              selectable={interactive || Boolean(onSelect)}
              onPointerDown={(event) => handlePointerDown(event, index)}
              onPointerMove={handlePointerMove}
              onPointerEnd={handlePointerEnd}
              onKeyDown={(event) => handleKeyDown(event, index)}
            />
          ))}
        </svg>
      )}

      {interactive && (
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      )}
      {(interactive || caption) && (
        <div className="mt-2 space-y-1 text-pretty" style={layout.captionStyle}>
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

/** Tấm pin của kết quả mô phỏng */
function PanelShapes({ panels, layout }: { panels: PlanPanel[]; layout: Layout }) {
  const { scale, toX, toY } = layout
  return (
    <g aria-hidden className="pointer-events-none fill-pv-glass stroke-pv-frame">
      {panels.map((panel, index) => (
        <rect
          key={index}
          x={-panel.widthM / 2}
          y={-panel.depthM / 2}
          width={panel.widthM}
          height={panel.depthM}
          // Vẽ theo mét rồi phóng bằng transform, xoay quanh tâm tấm giống footprint của backend
          transform={`translate(${toX(panel.centerXM)} ${toY(panel.centerYM)}) scale(${scale}) rotate(${panel.rotationDegree})`}
          strokeWidth={Math.min(1, (panel.widthM * scale) / 8) / scale}
        />
      ))}
    </g>
  )
}

type ObstacleShapeProps = {
  obstacle: PlanObstacle
  index: number
  layout: Layout
  surfaceWidthM: number
  surfaceLengthM: number
  clearanceM: number
  hatchId: string
  selected: boolean
  /** Kéo thả và dùng phím được */
  interactive: boolean
  /** Bấm để chọn được */
  selectable: boolean
  onPointerDown: (event: PointerEvent<SVGRectElement>) => void
  onPointerMove: (event: PointerEvent<SVGRectElement>) => void
  onPointerEnd: () => void
  onKeyDown: (event: KeyboardEvent<SVGRectElement>) => void
}

function ObstacleShape({
  obstacle,
  index,
  layout,
  surfaceWidthM,
  surfaceLengthM,
  clearanceM,
  hatchId,
  selected,
  interactive,
  selectable,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onKeyDown,
}: ObstacleShapeProps) {
  // Chưa nhập đủ kích thước thì không vẽ (nếu vẽ sẽ thành ô 0 x 0 vẫn nhận Tab mà không thấy)
  if (obstacle.widthM <= 0 || obstacle.lengthM <= 0) return null

  // Chỉ vẽ phần nằm trong mặt lắp, để số quá lớn không làm hình tràn ra ngoài khung.
  // Nằm hẳn ngoài mặt lắp thì không vẽ, danh sách vật cản vẫn báo lỗi.
  const visibleLeft = Math.max(0, obstacle.xM)
  const visibleTop = Math.max(0, obstacle.yM)
  const visibleRight = Math.min(surfaceWidthM, obstacle.xM + obstacle.widthM)
  const visibleBottom = Math.min(surfaceLengthM, obstacle.yM + obstacle.lengthM)
  if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) return null

  const { scale, toX, toY } = layout
  const x = toX(visibleLeft)
  const y = toY(visibleTop)
  const width = (visibleRight - visibleLeft) * scale
  const height = (visibleBottom - visibleTop) * scale

  // Vật cản tràn ra ngoài mặt lắp (đang nhập dở hoặc sai số) thì viền đỏ, trùng với lỗi ở ô nhập
  const outside =
    obstacle.xM < 0 ||
    obstacle.yM < 0 ||
    roundTo3Decimals(obstacle.xM + obstacle.widthM) > surfaceWidthM ||
    roundTo3Decimals(obstacle.yM + obstacle.lengthM) > surfaceLengthM
  let strokeClass = 'stroke-fg-2'
  if (outside) strokeClass = 'stroke-danger'
  else if (selected) strokeClass = 'stroke-accent'

  const name = obstacleName(obstacle, index)
  const ariaLabel = interactive
    ? `${name}: cách mép trái ${formatTwo(obstacle.xM)} m, cách mép cao ${formatTwo(obstacle.yM)} m`
    : undefined

  return (
    <g>
      {/* Khoảng cách quanh vật cản (kết quả mô phỏng) */}
      {clearanceM > 0 && (
        <rect
          aria-hidden
          x={toX(Math.max(0, obstacle.xM - clearanceM))}
          y={toY(Math.max(0, obstacle.yM - clearanceM))}
          width={
            (Math.min(surfaceWidthM, obstacle.xM + obstacle.widthM + clearanceM) -
              Math.max(0, obstacle.xM - clearanceM)) *
            scale
          }
          height={
            (Math.min(surfaceLengthM, obstacle.yM + obstacle.lengthM + clearanceM) -
              Math.max(0, obstacle.yM - clearanceM)) *
            scale
          }
          className="pointer-events-none fill-none stroke-fg-3"
          strokeDasharray="3 3"
        />
      )}
      <rect x={x} y={y} width={width} height={height} fill={`url(#${hatchId})`} className="pointer-events-none" />
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={ariaLabel}
        className={cx(
          'fill-transparent outline-none',
          strokeClass,
          interactive && 'cursor-grab touch-none focus-visible:stroke-ring active:cursor-grabbing',
        )}
        strokeWidth={selected ? 2.5 : 1.5}
        onPointerDown={selectable ? onPointerDown : undefined}
        onPointerMove={interactive ? onPointerMove : undefined}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={interactive ? onKeyDown : undefined}
      />
      <ObstacleLabel name={obstacle.name} index={index} x={x} y={y} width={width} height={height} selected={selected} />
    </g>
  )
}

/** Số thứ tự (trùng số ở danh sách vật cản) và tên vật cản, cắt bớt theo bề ngang ô */
function ObstacleLabel({
  name,
  index,
  x,
  y,
  width,
  height,
  selected,
}: {
  name: string
  index: number
  x: number
  y: number
  width: number
  height: number
  selected: boolean
}) {
  const number = index + 1
  const fillClass = selected ? 'fill-accent-fg' : 'fill-fg'

  // Đủ chỗ thì ghi số và tên ở góc trên trái
  if (width > 56 && height > 22) {
    const maxNameLength = Math.floor((width - 12) / 7) - String(number).length - 1
    return (
      <text
        x={x + 6}
        y={y + 16}
        className={cx('pointer-events-none text-meta', fillClass)}
        paintOrder="stroke"
        stroke="var(--surface-2)"
        strokeWidth="3"
      >
        <tspan className="font-semibold">{number}</tspan>
        {name && ` ${truncate(name, maxNameLength)}`}
      </text>
    )
  }

  // Không đủ chỗ ghi tên thì chỉ ghi số thứ tự ở giữa
  if (width > 14 && height > 14) {
    return (
      <text
        aria-hidden
        x={x + width / 2}
        y={y + height / 2 + 4}
        textAnchor="middle"
        className={cx('pointer-events-none text-meta font-semibold', fillClass)}
        paintOrder="stroke"
        stroke="var(--surface-2)"
        strokeWidth="3"
      >
        {number}
      </text>
    )
  }
  return null
}

/** Cắt chữ còn tối đa `max` ký tự, có dấu "…" ở cuối */
function truncate(text: string, max: number) {
  if (max <= 1) return ''
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(1, max - 1))}…`
}
