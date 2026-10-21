import type { ReactNode } from 'react'
import { Checkbox, Icon, StatusBadge } from '@/components/common/stitch-ui'
import { cn } from '@/utils/cn'

// Danh sách bước công việc. installation: có số thứ tự, protocol: trạng thái dạng pill
export type ExecutionStepState = 'done' | 'active' | 'pending'

export type ExecutionStepItem = {
  id: string
  /** Số thứ tự đứng trước tiêu đề; bỏ trống ở variant protocol */
  order?: number
  title: string
  description: string
  state: ExecutionStepState
  /** Giờ hoàn thành khi done, nhãn hàng đợi khi pending */
  statusText: string
  /** installation: số liệu của bước đang làm, protocol: kết quả khi xong */
  activeMetric?: string
}

export type ExecutionStepListProps = {
  steps: ExecutionStepItem[]
  checkedIds: string[]
  onToggle: (id: string, checked: boolean) => void
  variant?: 'installation' | 'protocol'
  /** Nội dung phụ dưới mô tả của một bước (bộ đếm panel, bảng số đo...) */
  renderExtra?: (step: ExecutionStepItem) => ReactNode
  className?: string
}

export function ExecutionStepList({
  steps,
  checkedIds,
  onToggle,
  variant = 'installation',
  renderExtra,
  className,
}: ExecutionStepListProps) {
  const isProtocol = variant === 'protocol'

  return (
    <ol className={cn('flex flex-col', isProtocol ? 'gap-space-sm' : 'gap-space-xs', className)}>
      {steps.map((step) => {
        const checked = checkedIds.includes(step.id)
        const isActive = step.state === 'active'
        const extra = renderExtra?.(step)
        const protocolStatus = isActive
          ? step.statusText
          : checked
            ? (step.activeMetric ?? step.statusText)
            : step.statusText

        return (
          <li
            key={step.id}
            className={cn(
              'rounded-xl p-space-md transition-all duration-200',
              'flex flex-col gap-space-sm',
              isProtocol
                ? isActive
                  ? 'bg-primary-fixed/20'
                  : 'bg-surface-container-low hover:bg-surface-container'
                : isActive
                  ? 'bg-surface-container-lowest shadow-level-2 ring-2 ring-primary-container'
                  : 'bg-surface-container-low',
              step.state === 'pending' && (isProtocol ? 'opacity-90' : 'opacity-80'),
            )}
          >
            <div className={cn('flex min-w-0 flex-1 items-start', isProtocol ? 'gap-space-md' : 'gap-space-sm')}>
              {isProtocol && isActive ? (
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary-container text-on-primary">
                  <Icon name="sync" className="text-[14px]" />
                </div>
              ) : (
                <Checkbox
                  id={step.id}
                  checked={checked}
                  onCheckedChange={(value) => onToggle(step.id, value === true)}
                  className="mt-1"
                />
              )}

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-space-sm">
                  {/* Badge "Active" chảy cùng dòng với tiêu đề như thiết kế, không tách thành flex item riêng */}
                  <label
                    htmlFor={step.id}
                    className={cn(
                      'min-w-0 flex-1 cursor-pointer text-label-lg font-bold text-on-surface',
                      isProtocol && checked && 'line-through opacity-80',
                    )}
                  >
                    {step.order !== undefined && `${step.order}. `}
                    {step.title}
                    {!isProtocol && isActive && (
                      <StatusBadge
                        variant="warning"
                        size="sm"
                        dot={false}
                        className="ml-space-xs align-middle font-bold"
                      >
                        {step.statusText}
                      </StatusBadge>
                    )}
                  </label>

                  {isProtocol ? (
                    <span
                      className={cn(
                        'shrink-0 rounded-full py-0.5 text-label-sm',
                        isActive
                          ? 'bg-primary-container px-2.5 font-semibold text-on-primary'
                          : 'bg-surface-container px-2 text-on-surface-variant',
                      )}
                    >
                      {protocolStatus}
                    </span>
                  ) : (
                    <>
                      {step.state === 'done' && (
                        <span className="mt-0.5 flex shrink-0 items-center gap-1 text-label-sm font-bold text-primary">
                          <Icon name="check_circle" className="text-[16px]" />
                          {step.statusText}
                        </span>
                      )}
                      {isActive && step.activeMetric && (
                        <span className="mt-0.5 shrink-0 text-label-sm font-bold text-secondary">
                          {step.activeMetric}
                        </span>
                      )}
                      {step.state === 'pending' && (
                        <span className="mt-0.5 shrink-0 text-label-sm text-on-surface-variant">{step.statusText}</span>
                      )}
                    </>
                  )}
                </div>

                <p className="mt-0.5 text-body-sm text-on-surface-variant">{step.description}</p>
                {!isProtocol && extra}
              </div>
            </div>

            {isProtocol && extra}
          </li>
        )
      })}
    </ol>
  )
}
