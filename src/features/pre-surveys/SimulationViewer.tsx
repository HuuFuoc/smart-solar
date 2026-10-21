import type { ReactNode } from 'react'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { SelectedSimulationSummary } from '@/features/pre-surveys/SelectedSimulationSummary'
import { SimulationResult } from '@/features/pre-surveys/SimulationResult'
import { useSimulationQuery } from '@/hooks/useSimulations'
import { isSummaryOnly } from '@/features/pre-surveys/simulationDisplay'
import { isApiError } from '@/services/api/errors'

/** Khung chờ cùng dáng với kết quả: hàng số liệu, hình bố trí, biểu đồ */
export function SimulationSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-72" />
      <Skeleton className="h-48" />
    </div>
  )
}

type Props = {
  preSurveyId: string
  simulationId: string
  /** Câu nhắc khi lần chạy này tính theo mặt lắp cũ */
  staleNote?: ReactNode
}

// Tải một lần chạy rồi vẽ kết quả. Dùng ở wizard của khách hàng, trang của sales và của kỹ thuật viên.
// Kết quả đầy đủ hết hạn sau 24 giờ: mô phỏng chính khi đó chỉ còn bản tóm tắt, lần chạy khác thì báo lỗi 410.
export function SimulationViewer({ preSurveyId, simulationId, staleNote }: Props) {
  const query = useSimulationQuery(preSurveyId, simulationId)
  if (query.isPending) return <SimulationSkeleton />

  if (!query.data) {
    // Lỗi 4xx (không có quyền, không tìm thấy) thử lại cũng vậy nên không hiện nút thử lại
    const clientError = isApiError(query.error) && query.error.status >= 400 && query.error.status < 500
    return (
      <ErrorState
        title="Không tải được kết quả mô phỏng."
        message={query.error?.message}
        onRetry={clientError ? undefined : () => query.refetch()}
      />
    )
  }

  const view = query.data
  // Đang đổi sang lần chạy khác: giữ kết quả cũ (mờ đi) tới khi bản mới về
  return (
    <div
      aria-busy={query.isPlaceholderData}
      className={query.isPlaceholderData ? 'opacity-50 transition-opacity' : undefined}
    >
      {isSummaryOnly(view) ? (
        <SelectedSimulationSummary summary={view} staleNote={staleNote} />
      ) : (
        <SimulationResult detail={view} staleNote={staleNote} />
      )}
    </div>
  )
}
