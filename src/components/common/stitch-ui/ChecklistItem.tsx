import { useId, type ReactNode } from 'react'
import { Checkbox } from '@/components/common/stitch-ui/Checkbox'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ProgressBar } from '@/components/common/stitch-ui/ProgressBar'
import { StatusBadge } from '@/components/common/stitch-ui/StatusBadge'
import { cn } from '@/utils/cn'

// Trạng thái: done / pending / active (đang làm, có progress)
export type ChecklistState = 'done' | 'active' | 'pending'

export type ChecklistItemProps = {
  id?: string
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  title: string
  description?: string
  /** Mặc định suy từ checked: done / pending */
  state?: ChecklistState
  /** Chữ bên phải: "Verified 13:05", "Pending", "Active Now"... */
  status?: ReactNode
  /** Icon cạnh status khi done (mặc định verified) */
  statusIcon?: string
  /** Chỉ dùng cho state active */
  progress?: { value: number; leftText?: string; rightText?: string }
  className?: string
}

export function ChecklistItem({
  id,
  checked,
  onCheckedChange,
  disabled = false,
  title,
  description,
  state,
  status,
  statusIcon = 'verified',
  progress,
  className,
}: ChecklistItemProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const resolvedState: ChecklistState = state ?? (checked ? 'done' : 'pending')

  const checkbox = (
    <Checkbox
      id={inputId}
      checked={checked}
      disabled={disabled}
      onCheckedChange={(value) => onCheckedChange?.(value === true)}
      className="mt-0.5"
    />
  )

  if (resolvedState === 'active') {
    return (
      <div
        className={cn(
          'flex flex-col gap-space-xs rounded-xl border-2 border-primary-container/40 bg-surface-container p-space-sm',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-space-sm">
          <label htmlFor={inputId} className="flex cursor-pointer items-start gap-space-sm">
            {checkbox}
            <div className="flex flex-col">
              <span className="text-label-lg font-bold text-primary">{title}</span>
              {description && <span className="text-body-sm text-on-surface-variant">{description}</span>}
            </div>
          </label>
          {status && (
            <StatusBadge variant="active" size="sm" pulse className="shrink-0 font-bold">
              {status}
            </StatusBadge>
          )}
        </div>
        {progress && (
          <>
            <ProgressBar value={progress.value} label={title} className="mt-1" />
            {(progress.leftText || progress.rightText) && (
              <div className="flex items-center justify-between px-1 text-label-sm text-on-surface-variant">
                <span>{progress.leftText}</span>
                <span className="font-bold text-primary">{progress.rightText}</span>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'group flex cursor-pointer items-start gap-space-sm rounded-xl bg-surface-container-low p-space-sm transition-colors hover:bg-surface-container',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      {checkbox}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-space-sm">
          <span className="text-label-lg font-bold text-on-surface">{title}</span>
          {status &&
            (resolvedState === 'done' ? (
              <span className="flex shrink-0 items-center gap-1 text-label-sm font-semibold text-primary">
                <Icon name={statusIcon} className="text-[16px]" />
                {status}
              </span>
            ) : (
              <StatusBadge variant="neutral" size="sm" dot={false} className="shrink-0 font-semibold">
                {status}
              </StatusBadge>
            ))}
        </div>
        {description && <span className="text-body-sm text-on-surface-variant">{description}</span>}
      </div>
    </label>
  )
}
