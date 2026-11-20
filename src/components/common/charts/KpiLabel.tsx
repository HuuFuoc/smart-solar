import { Icon } from '@/components/common/stitch-ui/Icon'
import { WithTooltip } from '@/components/common/ui/tooltip'

// Nhãn của một ô số kèm nút (i) giải thích cách tính. Nút nhận focus bàn phím; trình đọc màn hình đọc cả lời giải thích
export function KpiLabel({ label, hint }: { label: string; hint?: string }) {
  if (!hint) return <>{label}</>
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <WithTooltip label={hint}>
        {(tip) => (
          <button
            type="button"
            aria-label={`Cách tính: ${hint}`}
            className="relative inline-flex size-5 items-center justify-center rounded-full text-fg-3 hover:text-fg after:absolute after:-inset-3 after:content-['']"
            {...tip}
          >
            <Icon name="info" className="text-[16px]" />
          </button>
        )}
      </WithTooltip>
    </span>
  )
}
