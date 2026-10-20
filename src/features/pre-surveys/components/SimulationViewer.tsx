import type { ReactNode } from 'react'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { SimulationResult } from '@/features/pre-surveys/components/SimulationResult'
import { useSimulationQuery } from '@/hooks/useSimulations'
import { isApiError } from '@/services/api/errors'

/* Khung chờ cùng dáng kết quả: hàng số liệu, hình bố trí, biểu đồ. */
export function SimulationSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
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

/** Tải bản đầy đủ của một lần chạy (GET .../simulations/{id}) rồi vẽ kết quả; dùng ở wizard khách hàng và trang sales. */
export function SimulationViewer({ preSurveyId, simulationId, staleNote }: { preSurveyId: string; simulationId: string; staleNote?: ReactNode }) {
  const query = useSimulationQuery(preSurveyId, simulationId)
  if (query.isPending) return <SimulationSkeleton />
  if (!query.data) {
    const clientError = isApiError(query.error) && query.error.status >= 400 && query.error.status < 500
    return <ErrorState title="Không tải được kết quả mô phỏng." message={query.error?.message} onRetry={clientError ? undefined : () => query.refetch()} />
  }
  return (
    <div aria-busy={query.isPlaceholderData} className={query.isPlaceholderData ? 'opacity-50 transition-opacity' : undefined}>
      <SimulationResult detail={query.data} staleNote={staleNote} />
    </div>
  )
}
