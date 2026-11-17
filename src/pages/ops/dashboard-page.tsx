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
import { isCompletedStatus, isPendingStatus, isScheduledStatus } from '@/features/pre-surveys/preSurveyDisplay'

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

  // Statistical calculations from real dataset
  const totalCount = mySurveys.length
  const pendingAssignmentCount = mySurveys.filter((s) => isPendingStatus(s.status)).length
  const scheduledCount = mySurveys.filter((s) => isScheduledStatus(s.status)).length
  const completedCount = mySurveys.filter((s) => isCompletedStatus(s.status)).length

  return (
    <div className="sv-list space-y-6">
      <SalesDashboardHeader
        pendingCount={pendingSurveys.length}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <SalesDashboardStats
        totalSurveys={totalCount}
        pendingAssignment={pendingAssignmentCount}
        scheduledSurveys={scheduledCount}
        completedSurveys={completedCount}
      />

      {/* Grid 2 cột cân đối: Cột chính bên trái (~67%) và Cột phụ bên phải (~33%) */}
      <div className="grid gap-6 items-start lg:grid-cols-12">
        {/* Cột chính bên trái: Tiến độ mini + Bảng Hồ sơ của tôi */}
        <div className="space-y-6 lg:col-span-8">
          <SalesPipelineFunnel
            total={totalCount}
            pending={pendingAssignmentCount}
            scheduled={scheduledCount}
            completed={completedCount}
          />

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
