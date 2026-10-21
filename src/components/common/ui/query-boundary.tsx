import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Notice } from '@/components/common/ui/lists'
import { ErrorState, PageSkeleton } from '@/components/common/ui/states'
import { isApiError } from '@/services/api/errors'

/* 4xx (không có quyền, không tìm thấy...) gọi lại vẫn vậy: không bày nút "Thử lại" vô ích. */
const retryable = (error: unknown) => !(isApiError(error) && error.status >= 400 && error.status < 500)

function errorTitle(error: unknown) {
  if (isApiError(error) && error.status === 404) return 'Không tìm thấy nội dung này.'
  if (isApiError(error) && error.status === 403) return 'Bạn không có quyền xem nội dung này.'
  return undefined
}

// Đang tải thì hiện skeleton, chưa có dữ liệu mà lỗi thì hiện lỗi
// Đã có dữ liệu mà làm mới nền bị lỗi thì giữ dữ liệu và hiện thông báo nhỏ
export function QueryBoundary<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  if (query.isPending) return <PageSkeleton />
  if (query.data === undefined)
    return (
      <ErrorState
        title={errorTitle(query.error)}
        message={query.error?.message}
        onRetry={retryable(query.error) ? () => query.refetch() : undefined}
      />
    )
  return (
    <>
      {query.isError && (
        <div role="status" className="mb-4">
          <Notice tone="warn">
            Không làm mới được dữ liệu, đang hiện bản tải lúc trước.{' '}
            <button type="button" className="tap ui-link font-medium" onClick={() => query.refetch()}>
              Thử lại
            </button>
          </Notice>
        </div>
      )}
      {children(query.data)}
    </>
  )
}
