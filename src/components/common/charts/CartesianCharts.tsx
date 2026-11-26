import { useNavigate } from 'react-router'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { CHART_AXIS, CHART_GRID, CHART_SURFACE, formatCount } from '@/components/common/charts/chartTheme'
import { ChartTooltipBox } from '@/components/common/charts/ChartTooltip'
import { LegendItem } from '@/components/common/charts/ChartPanel'

export type Series = { key: string; label: string; color: string }
/** Một cột / một điểm trên trục ngang: `label` là nhãn trục, `values` theo khoá của từng chuỗi */
export type CategoryRow = { key: string; label: string; title?: string; values: Record<string, number>; href?: string }

type Common = {
  rows: CategoryRow[]
  series: Series[]
  /** Định dạng trong tooltip và chú giải */
  formatValue?: (n: number) => string
  /** Định dạng nhãn trục dọc (gọn hơn) */
  formatAxis?: (n: number) => string
  height?: number
  ariaLabel: string
  /** Tổng các chuỗi trong tooltip, khi cộng các chuỗi có nghĩa (cùng đơn vị, không trùng nhau) */
  showTotal?: boolean
}

const axisTick = { fill: CHART_AXIS, fontSize: 12 }

function SeriesLegend({ series }: { series: Series[] }) {
  if (series.length < 2) return null
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
      {series.map((s) => (
        <LegendItem key={s.key} color={s.color} label={s.label} />
      ))}
    </ul>
  )
}

function tooltipContent(rows: CategoryRow[], series: Series[], format: (n: number) => string, showTotal: boolean) {
  return function Content(p: TooltipContentProps) {
    if (!p.active) return null
    const row = rows.find((r) => r.label === p.label) ?? (p.payload?.[0]?.payload as CategoryRow | undefined)
    if (!row) return null
    const total = series.reduce((s, x) => s + (row.values[x.key] ?? 0), 0)
    return (
      <ChartTooltipBox
        title={row.title ?? row.label}
        rows={[...series].reverse().map((s) => ({
          key: s.key,
          color: s.color,
          label: s.label,
          value: format(row.values[s.key] ?? 0),
        }))}
        total={showTotal && series.length > 1 ? format(total) : undefined}
      />
    )
  }
}

/** Recharts đọc giá trị qua dataKey: trải `values` ra cột phẳng */
const flatten = (rows: CategoryRow[]) =>
  rows.map((r) => ({ ...r.values, label: r.label, key: r.key, title: r.title, href: r.href, values: r.values }))

// Cột dọc, một chuỗi hoặc xếp chồng nhiều chuỗi cộng được với nhau. Cột rộng tối đa 24px, đầu cột bo 4px, các phần cách nhau 2px
export function ColumnChart({
  rows,
  series,
  formatValue = formatCount,
  formatAxis = formatCount,
  height = 240,
  ariaLabel,
  showTotal = true,
  stacked = true,
}: Common & { stacked?: boolean }) {
  const navigate = useNavigate()
  const last = series.length - 1
  return (
    <div>
      <SeriesLegend series={series} />
      <div role="img" aria-label={ariaLabel} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={flatten(rows)} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke={CHART_GRID} />
            <XAxis
              dataKey="label"
              tick={axisTick}
              tickLine={false}
              axisLine={{ stroke: CHART_GRID }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={formatAxis}
              allowDecimals={false}
            />
            <Tooltip
              isAnimationActive={false}
              cursor={{ fill: 'var(--color-hover)' }}
              content={tooltipContent(rows, series, formatValue, showTotal)}
            />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId={stacked ? 'stack' : undefined}
                fill={s.color}
                maxBarSize={24}
                radius={!stacked || i === last ? [4, 4, 0, 0] : 0}
                stroke={CHART_SURFACE}
                strokeWidth={stacked && series.length > 1 ? 1 : 0}
                isAnimationActive={false}
                className={rows.some((r) => r.href) ? 'cursor-pointer' : undefined}
                onClick={(d: { payload?: { href?: string } }) => {
                  const href = d.payload?.href
                  if (href) void navigate(href)
                }}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Xu hướng theo thời gian: vùng (một tổng) hoặc đường (nhiều chuỗi không cộng với nhau). Đường 2px, vùng tô nhạt 10%
export function TrendChart({
  rows,
  series,
  formatValue = formatCount,
  formatAxis = formatCount,
  height = 240,
  ariaLabel,
  showTotal = false,
  variant = 'line',
}: Common & { variant?: 'line' | 'area' }) {
  const data = flatten(rows)
  const tooltip = (
    <Tooltip
      isAnimationActive={false}
      cursor={{ stroke: CHART_AXIS, strokeWidth: 1 }}
      content={tooltipContent(rows, series, formatValue, showTotal)}
    />
  )
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={CHART_GRID} />
      <XAxis
        dataKey="label"
        tick={axisTick}
        tickLine={false}
        axisLine={{ stroke: CHART_GRID }}
        interval="preserveStartEnd"
      />
      <YAxis
        tick={axisTick}
        tickLine={false}
        axisLine={false}
        width={56}
        tickFormatter={formatAxis}
        allowDecimals={false}
      />
    </>
  )
  const dot = rows.length <= 12 ? { r: 4, strokeWidth: 2, stroke: CHART_SURFACE } : false
  return (
    <div>
      <SeriesLegend series={series} />
      <div role="img" aria-label={ariaLabel} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {variant === 'area' ? (
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              {axes}
              {tooltip}
              {series.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  fill={s.color}
                  fillOpacity={0.1}
                  dot={dot ? { ...dot, fill: s.color } : false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: CHART_SURFACE, fill: s.color }}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              {axes}
              {tooltip}
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="linear"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={dot ? { ...dot, fill: s.color } : false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: CHART_SURFACE, fill: s.color }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
