import { formatCount, formatPercent } from '@/components/common/charts/chartTheme'

export type FunnelStep = { key: string; label: string; value: number; hint?: string; color: string }

// Phễu: mỗi bước một thanh dài theo số của bước đầu; bên phải là số và tỉ lệ so với bước trước (tỉ lệ chuyển đổi, nơi gọi ghi
// rõ ở mô tả của khối).
// Bước sau phải nằm trong bước trước (nơi gọi bảo đảm), nên thanh luôn ngắn dần
export function FunnelChart({ steps, ariaLabel }: { steps: FunnelStep[]; ariaLabel: string }) {
  const first = steps[0]?.value ?? 0
  return (
    <ol aria-label={ariaLabel} className="space-y-3">
      {steps.map((s, i) => {
        const prev = i === 0 ? null : steps[i - 1]!.value
        const width = first > 0 ? Math.max(s.value > 0 ? 2 : 0, (s.value / first) * 100) : 0
        return (
          <li key={s.key}>
            <div className="flex items-baseline gap-x-2 text-body">
              <span className="min-w-0 flex-1 text-fg">
                {s.label}
                {s.hint && <span className="block text-meta text-fg-3">{s.hint}</span>}
              </span>
              <span className="tnum shrink-0 font-semibold text-fg">{formatCount(s.value)}</span>
              <span
                className="tnum w-12 shrink-0 text-right text-meta text-fg-3"
                aria-label={prev === null ? undefined : `${formatPercent(s.value, prev)} so với bước trước`}
              >
                {prev === null ? '' : formatPercent(s.value, prev)}
              </span>
            </div>
            <span aria-hidden className="mt-1 block h-3 w-full rounded-control bg-surface-2">
              <span className="block h-3 rounded-control" style={{ width: `${width}%`, backgroundColor: s.color }} />
            </span>
          </li>
        )
      })}
    </ol>
  )
}
