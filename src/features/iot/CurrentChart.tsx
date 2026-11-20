import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltipBox } from '@/components/common/charts/ChartTooltip'
import { formatAmps } from '@/features/iot/iotRules'
import { formatAxisTime, formatReadingTime } from '@/features/iot/iotDisplay'

// Dòng điện (A) theo thời gian: đúng các điểm backend trả (trục thời gian thật, không nối thêm điểm cho khoảng thiếu), giữ dấu âm.
// Bảng số liệu đi kèm ở khối lịch sử cho trình đọc màn hình

type Point = { readingId: string; at: number; receivedAt: string; currentAmps: number }

const AXIS = 'var(--fg-3)'
const GRID = 'var(--line)'
const LINE = 'var(--chart-1)'
const tick = { fill: AXIS, fontSize: 12 }
const ampsAxis = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

export function CurrentChart({ points, height = 220 }: { points: Point[]; height?: number }) {
  if (points.length === 0) return null
  const hasNegative = points.some((p) => p.currentAmps < 0)
  const first = points[0]!
  const last = points[points.length - 1]!
  return (
    <div
      role="img"
      aria-label={`Biểu đồ dòng điện đo được, ${points.length} số đo từ ${formatReadingTime(first.receivedAt)} đến ${formatReadingTime(last.receivedAt)}`}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="at"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            tickFormatter={formatAxisTime}
            minTickGap={48}
          />
          <YAxis
            tick={tick}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => ampsAxis.format(v)}
            label={{ value: 'A', position: 'insideTopLeft', fill: AXIS, fontSize: 12, dy: -4 }}
          />
          {hasNegative && <ReferenceLine y={0} stroke={AXIS} />}
          <Tooltip
            isAnimationActive={false}
            cursor={{ stroke: AXIS, strokeWidth: 1 }}
            content={({ active, payload }) => {
              const p = active ? (payload?.[0]?.payload as Point | undefined) : undefined
              if (!p) return null
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
            dot={points.length <= 30 ? { r: 3, fill: LINE, strokeWidth: 0 } : false}
            activeDot={{ r: 5, fill: LINE, stroke: 'var(--surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
