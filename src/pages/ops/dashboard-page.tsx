import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { paymentPlanKeys } from '@/hooks/paymentPlanKeys'
import { collectionKeys } from '@/hooks/useCollections'
import { ErrorState, PageSkeleton } from '@/components/common/ui/states'
import {
  useClaimSurveyRequestMutation,
  useEscalatedAppointmentsQuery,
  useMySurveyRequestsQuery,
  usePendingSurveyRequestsQuery,
} from '@/hooks/useSurveyRequests'
import { useMyTasksQuery, useOpenTasksQuery } from '@/hooks/useSalesAfterSales'
import { errorMessage } from '@/services/api/errors'
import type { PendingSurveyRequestItem } from '@/types/res/surveyRequestsRes'
import { todayVn } from '@/features/scheduling/schedulingDisplay'

import { SalesDashboardHeader } from '@/features/sales-dashboard/components/SalesDashboardHeader'
import { SalesInsights } from '@/features/sales-dashboard/SalesInsights'
import { SalesUrgentActionsCard } from '@/features/sales-dashboard/components/SalesUrgentActionsCard'
import { SalesRecentSurveysCard } from '@/features/sales-dashboard/components/SalesRecentSurveysCard'
import { SalesRegionalDistributionCard } from '@/features/sales-dashboard/components/SalesRegionalDistributionCard'
import { SalesAfterSalesTasksCard } from '@/features/sales-dashboard/components/SalesAfterSalesTasksCard'

// /ops/dashboard: chỉ số và phân tích kinh doanh (SalesInsights) → việc cần xử lý ngay → hồ sơ của tôi, việc sau bán, địa bàn
export function OpsDashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const queryClient = useQueryClient()
  const today = useMemo(() => todayVn(), [])

  // Real Queries from API
  const {
    data: mySurveys = [],
    isLoading: loadingMy,
    isError: errorMy,
    refetch: refetchMy,
  } = useMySurveyRequestsQuery()

  const {
    data: pendingSurveys = [],
    isLoading: loadingPending,
    isError: errorPending,
    refetch: refetchPending,
  } = usePendingSurveyRequestsQuery()

  const {
    data: escalatedAppointments = [],
    isLoading: loadingEscalated,
    refetch: refetchEscalated,
  } = useEscalatedAppointmentsQuery()

  const { data: openTasks = [], refetch: refetchOpenTasks } = useOpenTasksQuery()

  const { data: myTasks = [], refetch: refetchMyTasks } = useMyTasksQuery()

  const claimMutation = useClaimSurveyRequestMutation()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.allSettled([
        refetchMy(),
        refetchPending(),
        refetchEscalated(),
        refetchOpenTasks(),
        refetchMyTasks(),
        queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
        queryClient.invalidateQueries({ queryKey: paymentPlanKeys.all }),
      ])
      toast.success('Đã làm mới dữ liệu thống kê kinh doanh!')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleClaim = async (item: PendingSurveyRequestItem) => {
    try {
      await claimMutation.mutateAsync(item.surveyRequestId)
      toast.success(`Đã tiếp nhận thành công hồ sơ của ${item.customerName || 'khách hàng'}!`)
    } catch (err) {
      toast.error(errorMessage(err, 'Không thể tiếp nhận hồ sơ. Vui lòng thử lại.'))
    }
  }

  const isLoading = loadingMy && loadingPending && loadingEscalated
  const isAllError = errorMy && errorPending

  if (isLoading) {
    return <PageSkeleton />
  }

  if (isAllError) {
    return (
      <ErrorState
        title="Không thể tải dữ liệu bảng điều khiển kinh doanh"
        message="Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút."
        onRetry={handleRefresh}
      />
    )
  }

  return (
    <div className="sv-list space-y-6">
      <SalesDashboardHeader
        pendingCount={pendingSurveys.length}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <SalesInsights mySurveys={mySurveys} surveysLoading={loadingMy} today={today} />

      {/* Grid 2 cột cân đối: Cột chính bên trái (~67%) và Cột phụ bên phải (~33%) */}
      <div className="grid gap-6 items-start lg:grid-cols-12">
        {/* Cột chính bên trái: Bảng Hồ sơ của tôi */}
        <div className="space-y-6 lg:col-span-8">
          <SalesRecentSurveysCard surveys={mySurveys} />
        </div>

        {/* Cột phụ bên phải: Việc cần xử lý ngay, Báo giá dịch vụ sau bán và Địa bàn theo phường/xã */}
        <div className="space-y-6 lg:col-span-4">
          <SalesUrgentActionsCard
            escalatedAppointments={escalatedAppointments}
            pendingRequests={pendingSurveys}
            onClaim={handleClaim}
            isClaiming={claimMutation.isPending}
          />

          <SalesAfterSalesTasksCard tasks={openTasks} myTasks={myTasks} />

          <SalesRegionalDistributionCard surveys={mySurveys} />
        </div>
      </div>
    </div>
  )
}
