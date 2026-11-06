import { useMemo } from 'react'
import { ErrorState, PageSkeleton } from '@/components/common/ui/states'
import { ActiveProjectCard } from '@/features/customer-dashboard/components/ActiveProjectCard'
import { CustomerServicesWidget } from '@/features/customer-dashboard/components/CustomerServicesWidget'
import { DashboardEmptyState } from '@/features/customer-dashboard/components/DashboardEmptyState'
import { DashboardHeader } from '@/features/customer-dashboard/components/DashboardHeader'
import { DashboardStats } from '@/features/customer-dashboard/components/DashboardStats'
import {
  ProjectLifecycleStepper,
  type ProjectStage,
} from '@/features/customer-dashboard/components/ProjectLifecycleStepper'
import { UpcomingAppointmentsCard } from '@/features/customer-dashboard/components/UpcomingAppointmentsCard'
import { isUpcomingAppointment } from '@/features/customer-dashboard/services/dashboardChartService'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import { useSubscriptionsQuery } from '@/hooks/useCustomerAfterSales'
import { useMyInstallationsQuery } from '@/hooks/useCustomerInstallations'
import { useMyQuotationsQuery } from '@/hooks/useCustomerQuotations'
import { useMyServiceRequestsQuery } from '@/hooks/useCustomerServiceRequests'

function getProgressPercent(status: string): number {
  switch (status) {
    case 'PENDING_ASSIGNMENT':
      return 15
    case 'PENDING_TECHNICIAN_ACCEPTANCE':
      return 25
    case 'SCHEDULED':
      return 40
    case 'IN_PROGRESS':
      return 65
    case 'PENDING_CUSTOMER_ACCEPTANCE':
      return 90
    case 'REWORK_REQUIRED':
      return 75
    case 'COMPLETED':
      return 100
    case 'CANCELLED':
      return 0
    default:
      return 10
  }
}

export function CustomerDashboardPage() {
  const {
    data: installations = [],
    isLoading: loadingInstallations,
    isError: errorInstallations,
    refetch: refetchInstallations,
  } = useMyInstallationsQuery()

  const {
    data: surveyRequests = [],
    isLoading: loadingRequests,
    isError: errorRequests,
    refetch: refetchRequests,
  } = useMyRequestsQuery()

  const {
    data: serviceRequests = [],
    isLoading: loadingServices,
    isError: errorServices,
    refetch: refetchServices,
  } = useMyServiceRequestsQuery()

  const { data: quotations = [], isLoading: loadingQuotations, refetch: refetchQuotations } = useMyQuotationsQuery()

  const {
    data: subscriptions = [],
    isLoading: loadingSubscriptions,
    refetch: refetchSubscriptions,
  } = useSubscriptionsQuery()

  const isLoading =
    loadingInstallations && loadingRequests && loadingServices && loadingQuotations && loadingSubscriptions
  const isAllError = errorInstallations && errorRequests && errorServices

  const handleRefreshAll = () => {
    refetchInstallations()
    refetchRequests()
    refetchServices()
    refetchQuotations()
    refetchSubscriptions()
  }

  // Dự án lắp đặt đang chạy
  const activeProject =
    installations.find((p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED') || installations[0]

  const activeProjectsCount = installations.filter((p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED').length
  const activeProgressPct = activeProject ? getProgressPercent(activeProject.status) : null

  // Lịch hẹn khảo sát / thi công sắp tới
  const upcomingAppointments = useMemo(
    () =>
      surveyRequests
        .filter((r) => isUpcomingAppointment(r))
        .sort((a, b) => a.appointment!.startsAt.localeCompare(b.appointment!.startsAt)),
    [surveyRequests],
  )
  const upcomingAppointmentsCount = upcomingAppointments.length
  const nearestAppointmentTime = upcomingAppointments[0]?.appointment?.startsAt || null

  const completedProjectsCount = installations.filter((p) => p.status === 'COMPLETED').length
  const pendingServicesCount = serviceRequests.filter(
    (s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED' && s.status !== 'CLOSED_DUPLICATE',
  ).length

  const activeAssetsCount = useMemo(
    () => installations.reduce((sum, p) => sum + (p.assets?.length || 0), 0),
    [installations],
  )

  const hasAnyData =
    installations.length > 0 || surveyRequests.length > 0 || serviceRequests.length > 0 || quotations.length > 0

  // Xác định giai đoạn vòng đời dự án (Project Lifecycle Stepper)
  const currentStage: ProjectStage = useMemo(() => {
    if (completedProjectsCount > 0) return 'HANDOVER'
    if (activeProjectsCount > 0) return 'INSTALLATION'
    if (quotations.length > 0) return 'QUOTATION'
    if (surveyRequests.some((r) => r.status === 'COMPLETED')) return 'QUOTATION'
    if (surveyRequests.length > 0) return 'SURVEY'
    return 'ASSESSMENT'
  }, [completedProjectsCount, activeProjectsCount, quotations.length, surveyRequests])

  if (isLoading) {
    return <PageSkeleton />
  }

  if (isAllError) {
    return (
      <ErrorState
        title="Không thể tải dữ liệu bảng điều khiển"
        message="Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút."
        onRetry={handleRefreshAll}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Header & Quick Action Buttons */}
      <DashboardHeader />

      {/* Hàng 1 - Thẻ chỉ số tổng quan (4 Stat Cards) */}
      <DashboardStats
        activeProjects={activeProjectsCount}
        activeProgressPct={activeProgressPct}
        upcomingAppointments={upcomingAppointmentsCount}
        nearestAppointmentTime={nearestAppointmentTime}
        completedProjects={completedProjectsCount}
        pendingServices={pendingServicesCount}
      />

      {/* Trạng thái rỗng: khi khách chưa có bất kỳ dự án hay yêu cầu nào */}
      {!hasAnyData ? (
        <DashboardEmptyState />
      ) : (
        <>
          {/* Hàng 2 - Hành trình dự án (Project Stepper 5 bước) */}
          <ProjectLifecycleStepper
            currentStage={currentStage}
            stageDetail={activeProject ? `Dự án #${activeProject.projectId.slice(0, 8).toUpperCase()}` : null}
          />

          {/* Hàng 3 - Phân 2 cột nội dung: Cột chính (65%) & Cột phụ (35%) */}
          <div className="grid gap-6 items-start lg:grid-cols-12">
            {/* Cột chính (65% ~ 8/12 cột): Danh sách công trình / hồ sơ thi công chi tiết */}
            <div className="space-y-4 lg:col-span-8">
              <ActiveProjectCard installations={installations} surveyRequests={surveyRequests} />
            </div>

            {/* Cột phụ (35% ~ 4/12 cột): Lịch hẹn sắp tới (timeline mini) + Widget dịch vụ & bảo trì */}
            <div className="space-y-4 lg:col-span-4">
              <UpcomingAppointmentsCard requests={surveyRequests} />

              <CustomerServicesWidget
                subscriptions={subscriptions}
                serviceRequests={serviceRequests}
                activeAssetsCount={activeAssetsCount}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
