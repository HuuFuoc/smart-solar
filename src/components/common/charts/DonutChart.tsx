import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipContentProps } from 'recharts'
import { CHART_SURFACE, formatCount, formatPercent } from '@/components/common/charts/chartTheme'
import { ChartTooltipBox } from '@/components/common/charts/ChartTooltip'
import { cx } from '@/utils/cx'

export type DonutSlice = {
  key: string
  label: string
  value: number
  color: string
  /** Bấm lát / dòng chú giải thì mở danh sách đã lọc đúng nhóm này */
  href?: string
  /** Dòng phụ trong chú giải, vd. số tiền */
  note?: ReactNode
}

// Tỉ trọng của một tổng (≤ 6 phần, phần nhỏ gộp "Khác" ở nơi gọi). Lát cách nhau 2px màu nền; tên và số nằm ở chú giải
// bên cạnh, nên không phải đọc màu để biết lát nào là gì
export function DonutChart({
  slices,
  centerValue,
  centerLabel,
  formatValue = formatCount,
  ariaLabel,
  className,
}: {
  slices: DonutSlice[]
  centerValue: ReactNode
  centerLabel: string
  formatValue?: (n: number) => string
  ariaLabel: string
  className?: string
}) {
  const navigate = useNavigate()
  const total = slices.reduce((s, x) => s + x.value, 0)
  const drawn = slices.filter((s) => s.value > 0)
  return (
    <div className={cx('grid items-center gap-4 sm:grid-cols-[minmax(0,11rem)_1fr]', className)}>
      <div className="relative mx-auto aspect-square w-full max-w-44" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={drawn}
              dataKey="value"
              nameKey="label"
              innerRadius="68%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke={CHART_SURFACE}
              strokeWidth={2}
              isAnimationActive={false}
              onClick={(_, index) => {
                const href = drawn[index]?.href
                if (href) void navigate(href)
              }}
            >
              {drawn.map((s) => (
                <Cell key={s.key} fill={s.color} className={s.href ? 'cursor-pointer' : undefined} />
              ))}
            </Pie>
            <Tooltip
              isAnimationActive={false}
              content={(p: TooltipContentProps) => {
                const item = p.active ? (p.payload?.[0]?.payload as DonutSlice | undefined) : undefined
                if (!item) return null
                return (
                  <ChartTooltipBox
                    rows={[
                      {
                        key: item.key,
                        color: item.color,
                        label: item.label,
                        value: `${formatValue(item.value)} (${formatPercent(item.value, total)})`,
                      },
                    ]}
                  />
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-figure font-semibold text-fg">{centerValue}</span>
          <span className="max-w-[7rem] text-meta text-fg-3">{centerLabel}</span>
        </div>
      </div>
      <ul className="min-w-0 space-y-1.5">
        {slices.map((s) => {
          const body = (
            <>
              <span aria-hidden className="size-2.5 shrink-0 self-center rounded-[3px]" style={{ backgroundColor: s.color }} />
              <span className="min-w-0 flex-1 text-fg-2">
                {s.label}
                {s.note && <span className="block text-meta text-fg-3">{s.note}</span>}
              </span>
              <span className="tnum shrink-0 font-semibold text-fg">{formatValue(s.value)}</span>
              <span className="tnum w-11 shrink-0 text-right text-meta text-fg-3">{formatPercent(s.value, total)}</span>
            </>
          )
          return (
            <li key={s.key}>
              {s.href ? (
                <Link
                  to={s.href}
                  className="-mx-2 flex items-baseline gap-2 rounded-control px-2 py-0.5 text-body hover:bg-hover"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex items-baseline gap-2 py-0.5 text-body">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
