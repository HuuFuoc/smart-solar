import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Field, Textarea } from '@/components/common/ui/field'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { installationErrorMessage } from '@/features/installation-projects/projectDisplay'
import type { ApiError } from '@/services/api/errors'

// Phần dùng chung của các khối và hộp thoại thi công

/** Trạng thái tải của một khối trong trang (QueryBoundary vẽ khung chờ cả trang, quá to ở đây) */
export function PanelQuery<T>({
  query,
  children,
}: {
  query: UseQueryResult<T, ApiError>
  children: (data: T) => ReactNode
}) {
  if (query.isPending)
    return (
      <div aria-busy="true" aria-label="Đang tải" className="space-y-2">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    )
  if (query.data === undefined)
    return (
      <ErrorState
        title="Không tải được phần này."
        message={installationErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    )
  return <>{children(query.data)}</>
}

/** Lý do tối đa 500 ký tự (backend cắt phần thừa khi phân công / huỷ, từ chối khi trả về làm lại) */
export const REASON_MAX = 500

export function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="flex basis-full items-center gap-1.5 text-body font-medium text-danger" role="alert">
      <Icon name="error" className="shrink-0 text-[20px]" />
      {message}
    </p>
  )
}

export function ReasonField({
  id,
  label = 'Lý do',
  required,
  hint,
  value,
  onChange,
}: {
  id: string
  label?: string
  required: boolean
  hint?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field
      label={label}
      htmlFor={id}
      required={required}
      hint={hint ?? (required ? 'Bắt buộc, tối đa 500 ký tự.' : 'Không bắt buộc, tối đa 500 ký tự.')}
    >
      <Textarea
        id={id}
        rows={2}
        maxLength={REASON_MAX}
        aria-required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}
