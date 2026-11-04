export type StackedPart = { key: string; label: string; value: number; percent: number; color: string }

// Thanh chia phần kèm chú thích từng phần: màu, tên, số lượng, tỉ lệ
export function StackedBar({ parts }: { parts: StackedPart[] }) {
  return (
    <div>
      <div aria-hidden className="flex h-2 w-full overflow-hidden rounded-control bg-surface-2">
        {parts.map((p) =>
          p.percent > 0 ? (
            <div
              key={p.key}
              style={{ width: `${p.percent}%`, backgroundColor: p.color }}
              title={`${p.label}: ${p.value} (${p.percent}%)`}
            />
          ) : null,
        )}
      </div>
      <dl className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-x-6 gap-y-1 text-body">
        {parts.map((p) => (
          <div key={p.key} className="flex items-baseline gap-2">
            <span
              aria-hidden
              className="mt-1.5 size-2 shrink-0 self-start rounded-sm"
              style={{ backgroundColor: p.color }}
            />
            <dt className="min-w-0 text-fg-2">{p.label}</dt>
            <dd className="tnum ml-auto shrink-0 font-semibold text-fg">
              {p.value} <span className="font-normal text-fg-3">({p.percent}%)</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
