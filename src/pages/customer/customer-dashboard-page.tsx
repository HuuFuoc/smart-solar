import { ErrorState, PageSkeleton } from '@/components/common/ui/states'
import { ActiveProjectCard } from '@/features/customer-dashboard/components/ActiveProjectCard'
import { DashboardEmptyState } from '@/features/customer-dashboard/components/DashboardEmptyState'
import { DashboardHeader } from '@/features/customer-dashboard/components/DashboardHeader'
import { DashboardStats } from '@/features/customer-dashboard/components/DashboardStats'
import { RecentServiceRequestsCard } from '@/features/customer-dashboard/components/RecentServiceRequestsCard'
import { UpcomingAppointmentsCard } from '@/features/customer-dashboard/components/UpcomingAppointmentsCard'
import { WorkflowStatusBarChart } from '@/features/customer-dashboard/components/WorkflowStatusBarChart'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import { useMyInstallationsQuery } from '@/hooks/useCustomerInstallations'
import { useMyServiceRequestsQuery } from '@/hooks/useCustomerServiceRequests'

export function CustomerDashboardPage() {
  const { data: installations = [], isLoading: loadingInstallations, isError: errorInstallations, refetch: refetchInstallations } =
    useMyInstallationsQuery()
  const { data: surveyRequests = [], isLoading: loadingRequests, isError: errorRequests, refetch: refetchRequests } =
    useMyRequestsQuery()
  const { data: serviceRequests = [], isLoading: loadingServices, isError: errorServices, refetch: refetchServices } =
    useMyServiceRequestsQuery()

  const isLoading = loadingInstallations && loadingRequests && loadingServices
  const isAllError = errorInstallations && errorRequests && errorServices

  if (isLoading) {
    return <PageSkeleton />
  }

  if (isAllError) {
    return (
      <ErrorState
        title="Không thể tải dữ liệu bảng điều khiển"
        message="Đã xảy ra lỗi khi kết nối với máy chủ. Vui lòng thử tải lại trang."
        onRetry={() => {
          refetchInstallations()
          refetchRequests()
          refetchServices()
        }}
      />
    )
  }

  const activeProject =
    installations.find((p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED') ||
    installations[0]

  const activeProjectsCount = installations.filter(
    (p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED',
  ).length
  const upcomingAppointmentsCount = surveyRequests.filter(
    (r) =>
      r.appointment &&
      r.appointment.status !== 'CANCELLED' &&
      r.appointment.status !== 'COMPLETED',
  ).length
  const completedProjectsCount = installations.filter((p) => p.status === 'COMPLETED').length
  const pendingServicesCount = serviceRequests.filter(
    (s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED',
  ).length

  const hasAnyData =
    installations.length > 0 || surveyRequests.length > 0 || serviceRequests.length > 0

  return (
    <div className="space-y-8">
      <DashboardHeader />

      <DashboardStats
        activeProjects={activeProjectsCount}
        upcomingAppointments={upcomingAppointmentsCount}
        completedProjects={completedProjectsCount}
        pendingServices={pendingServicesCount}
      />

      {!hasAnyData ? (
        <DashboardEmptyState />
      ) : (
        <>
          {/* Tiến độ và lịch hẹn nằm ngang đặt ở đầu */}
          <WorkflowStatusBarChart
            surveyRequests={surveyRequests}
            serviceRequests={serviceRequests}
          />

          <div className="grid gap-8 lg:grid-cols-2">
            <ActiveProjectCard project={activeProject} />
            <UpcomingAppointmentsCard requests={surveyRequests} />
          </div>

          <RecentServiceRequestsCard requests={serviceRequests} />
        </>
      )}
    </div>
  )
}