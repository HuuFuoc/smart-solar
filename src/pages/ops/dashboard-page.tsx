import { useState } from 'react'
import { toast } from 'sonner'
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

import { SalesDashboardHeader } from '@/features/sales-dashboard/components/SalesDashboardHeader'
import { SalesDashboardStats } from '@/features/sales-dashboard/components/SalesDashboardStats'
import { SalesPipelineFunnel } from '@/features/sales-dashboard/components/SalesPipelineFunnel'
import { SalesUrgentActionsCard } from '@/features/sales-dashboard/components/SalesUrgentActionsCard'
import { SalesRecentSurveysCard } from '@/features/sales-dashboard/components/SalesRecentSurveysCard'
import { SalesRegionalDistributionCard } from '@/features/sales-dashboard/components/SalesRegionalDistributionCard'
import { SalesAfterSalesTasksCard } from '@/features/sales-dashboard/components/SalesAfterSalesTasksCard'

export function OpsDashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false)

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

  const {
    data: openTasks = [],
    refetch: refetchOpenTasks,
  } = useOpenTasksQuery()

  const {
    data: myTasks = [],
    refetch: refetchMyTasks,
  } = useMyTasksQuery()

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
        message="Đã xảy ra lỗi khi kết nối với máy chủ API. Vui lòng kiểm tra kết nối mạng và thử lại."
        onRetry={handleRefresh}
      />
    )
  }

  // Statistical calculations from real dataset
  const totalCount = mySurveys.length
  const pendingAssignmentCount = mySurveys.filter((s) => s.status === 1).length
  const scheduledCount = mySurveys.filter((s) => s.status === 4).length
  const completedCount = mySurveys.filter((s) => s.status === 5).length

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with greeting, online badge and actions */}
      <SalesDashboardHeader
        totalSurveys={totalCount}
        pendingCount={pendingSurveys.length}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* 2. Top Metric Cards */}
      <SalesDashboardStats
        totalSurveys={totalCount}
        pendingAssignment={pendingAssignmentCount}
        scheduledSurveys={scheduledCount}
        completedSurveys={completedCount}
      />

      {/* 3. Main Content Grid (8 cols / 4 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left column (8 cols): Funnel & Detailed surveys */}
        <div className="space-y-6 lg:col-span-8">
          {/* Conversion Funnel */}
          <SalesPipelineFunnel
            total={totalCount}
            pending={pendingAssignmentCount}
            scheduled={scheduledCount}
            completed={completedCount}
          />

          {/* Recent Claimed Surveys Table with search & tabs */}
          <SalesRecentSurveysCard surveys={mySurveys} />
        </div>

        {/* Right column (4 cols): Urgent Actions, Regions & After-Sales */}
        <div className="space-y-6 lg:col-span-4">
          {/* Urgent Actions: Escalated & Pending claims */}
          <SalesUrgentActionsCard
            escalatedAppointments={escalatedAppointments}
            pendingRequests={pendingSurveys}
            onClaim={handleClaim}
            isClaiming={claimMutation.isPending}
          />

          {/* Regional Geographic Distribution */}
          <SalesRegionalDistributionCard surveys={mySurveys} />

          {/* After Sales Follow-up Tasks */}
          <SalesAfterSalesTasksCard tasks={openTasks} myTasks={myTasks} />
        </div>
      </div>
    </div>
  )
}
