import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltipBox } from '@/components/common/charts/ChartTooltip'
import { Button } from '@/components/common/ui/button'
import { Segmented } from '@/components/common/ui/segmented'
import { formatAxisTime, formatReadingTime } from '@/features/iot/iotDisplay'
import {
  ampsAxis,
  CHART_WINDOWS,
  chartGapMs,
  defaultWindow,
  formatAmps,
  pointsInWindow,
  spikeIds,
  withGaps,
  type ChartPoint,
  type ChartWindow,
  type GapPoint,
} from '@/features/iot/iotRules'

// Dòng điện (A) theo thời gian: đúng các điểm backend trả (trục thời gian thật), giữ dấu âm. Mặc định xem khoảng ngắn nhất có đủ số
// đo gần nhất để loạt số đo dày không dồn vào một mép; trục dòng điện ôm sát các số đo thường, số đo chênh hẳn xung quanh (nhiễu cảm
// biến, chập chờn) đánh dấu ở mép trục và ghi rõ giá trị, bấm "Hiện đủ khung" để vẽ cả chúng. Đường ngắt ở chỗ thiết bị không gửi
// số đo, không vẽ nối qua. Bảng số liệu đi kèm ở khối lịch sử cho trình đọc màn hình

const AXIS = 'var(--fg-3)'
const GRID = 'var(--line)'
const LINE = 'var(--chart-1)'
const OUTSIDE = 'var(--danger)'
const tick = { fill: AXIS, fontSize: 12 }
const ampsTick = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

/** Tam giác ở mép trục chỉ về phía số đo nằm ngoài khung */
function EdgeMarker({ cx, cy, down }: { cx?: number; cy?: number; down: boolean }) {
  if (cx === undefined || cy === undefined) return <g />
  const d = down
    ? `M${cx - 5},${cy - 8} L${cx + 5},${cy - 8} L${cx},${cy} Z`
    : `M${cx - 5},${cy + 8} L${cx + 5},${cy + 8} L${cx},${cy} Z`
  return <path d={d} fill={OUTSIDE} />
}

function outsideText(points: ChartPoint[]) {
  const listed = points
    .slice(0, 3)
    .map((p) => `${formatAmps(p.currentAmps)} lúc ${formatAxisTime(p.at)}`)
    .join(', ')
  return points.length > 3 ? `${listed} và ${points.length - 3} số đo khác` : listed
}

export function CurrentChart({
  points,
  reportIntervalSeconds,
  height = 240,
}: {
  points: ChartPoint[]
  /** Chu kỳ gửi của thiết bị (giây), để biết chỗ nào là thiếu số đo */
  reportIntervalSeconds?: number | null
  height?: number
}) {
  const [picked, setPicked] = useState<ChartWindow | null>(null)
  const [fullRange, setFullRange] = useState(false)
  if (points.length === 0) return null

  const view = picked ?? defaultWindow(points)
  const visible = pointsInWindow(points, view)
  const spikes = spikeIds(points)
  const spikesInView = visible.filter((p) => spikes.has(p.readingId))
  const outside = fullRange ? [] : spikesInView
  const inside = outside.length > 0 ? visible.filter((p) => !spikes.has(p.readingId)) : visible
  const { domain, ticks } = ampsAxis(inside.map((p) => p.currentAmps))
  const { line, gaps } = withGaps(inside, chartGapMs(reportIntervalSeconds))
  const first = visible[0]!
  const last = visible[visible.length - 1]!
  const xDomain: [number, number] = first.at === last.at ? [first.at - 30_000, last.at + 30_000] : [first.at, last.at]
  const gapMinutes = Math.round(chartGapMs(reportIntervalSeconds) / 60_000)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Segmented
          label="Khoảng xem"
          size="sm"
          className="w-full max-w-md"
          options={CHART_WINDOWS.map((w) => ({ value: w.value, label: w.label }))}
          value={view}
          onChange={setPicked}
        />
        <p className="tnum text-meta text-fg-2">
          Đang xem {visible.length.toLocaleString('vi-VN')}/{points.length.toLocaleString('vi-VN')} số đo
        </p>
      </div>

      <div
        role="img"
        aria-label={`Biểu đồ dòng điện đo được, ${visible.length} số đo từ ${formatReadingTime(first.receivedAt)} đến ${formatReadingTime(last.receivedAt)}`}
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={line} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis
              dataKey="at"
              type="number"
              scale="time"
              domain={xDomain}
              allowDataOverflow
              tick={tick}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              tickFormatter={formatAxisTime}
              minTickGap={48}
            />
            <YAxis
              domain={domain}
              ticks={ticks}
              allowDataOverflow
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => ampsTick.format(v)}
              label={{ value: 'A', position: 'insideTopLeft', fill: AXIS, fontSize: 12, dy: -4 }}
            />
            {domain[0] < 0 && domain[1] > 0 && <ReferenceLine y={0} stroke={AXIS} strokeDasharray="4 4" />}
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: AXIS, strokeWidth: 1 }}
              content={({ active, payload }) => {
                const p = active ? (payload?.[0]?.payload as ChartPoint | GapPoint | undefined) : undefined
                if (!p || p.currentAmps === null) return null
                return (
                  <ChartTooltipBox
                    title={formatReadingTime(p.receivedAt)}
                    rows={[{ key: 'a', color: LINE, label: 'Dòng điện', value: formatAmps(p.currentAmps) }]}
                  />
                )
              }}
            />
            <Line
              type="linear"
              dataKey="currentAmps"
              stroke={LINE}
              strokeWidth={2}
              connectNulls={false}
              dot={inside.length <= 40 ? { r: 3, fill: LINE, strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: LINE, stroke: 'var(--surface)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
            {outside.map((p) => {
              const down = p.currentAmps < domain[0]
              return (
                <ReferenceDot
                  key={p.readingId}
                  x={p.at}
                  y={down ? domain[0] : domain[1]}
                  r={6}
                  ifOverflow="visible"
                  shape={(props: { cx?: number; cy?: number }) => <EdgeMarker {...props} down={down} />}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {(spikesInView.length > 0 || gaps > 0) && (
        <div className="space-y-2 text-meta text-fg-2">
          {outside.length > 0 && (
            <p>
              <span className="font-medium text-fg">
                {outside.length.toLocaleString('vi-VN')} số đo chênh hẳn các số đo xung quanh
              </span>{' '}
              nên nằm ngoài khung, đánh dấu tam giác đỏ ở mép trục: <span className="tnum">{outsideText(outside)}</span>
              .
            </p>
          )}
          {spikesInView.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              bleed={false}
              icon={fullRange ? 'zoom_in' : 'zoom_out_map'}
              onClick={() => setFullRange((v) => !v)}
            >
              {fullRange ? 'Thu khung theo số đo thường' : 'Hiện đủ khung'}
            </Button>
          )}
          {gaps > 0 && (
            <p>
              Đường ngắt ở {gaps.toLocaleString('vi-VN')} chỗ thiết bị không gửi số đo quá {gapMinutes} phút.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
