import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { useSalesTasksQuery } from '@/hooks/useManagerAfterSales'
import { useManagerNavAlerts } from '@/hooks/useManagerNavAlerts'
import { useStaffInstallationSchedulesQuery } from '@/hooks/useInstallationSchedules'
import { usePendingCashCount } from '@/hooks/usePaymentDesk'
import { ROUTES } from '@/routes/paths'

// Số đỏ trên menu xem useManagerNavAlerts (cả gói đi kèm chờ đối soát); thêm lịch thi công phải hẹn lại. Việc của kinh doanh chưa ai nhận là số xám: kinh
// doanh tự nhận, quản lý chỉ theo dõi
export function ManageLayout({ children }: { children?: ReactNode }) {
  const isManager = useAuth().user?.role === 'manager'
  const alerts = useManagerNavAlerts(isManager, ROUTES.manage)
  const unclaimedTasks = useSalesTasksQuery(undefined, { enabled: isManager }).data?.filter(
    (t) => t.status === 'OPEN',
  ).length
  const toReschedule = useStaffInstallationSchedulesQuery('RESCHEDULE_REQUIRED', { enabled: isManager }).data?.length
  const pendingCash = usePendingCashCount({ enabled: isManager }).data
  return (
    <AppShell
      portal={PORTALS.manage}
      badges={{
        [ROUTES.manage.dispatch]: { value: alerts.dispatch, attention: true },
        [ROUTES.manage.installations]: { value: alerts.installations, attention: true },
        [ROUTES.manage.afterSales]: { value: alerts.afterSales, attention: true },
        [ROUTES.manage.bundledPackages]: { value: alerts.reconciliation, attention: true },
        [ROUTES.manage.installationSchedules]: { value: toReschedule, attention: true },
        [ROUTES.manage.payments]: { value: pendingCash, attention: true },
        [ROUTES.manage.salesTasks]: { value: unclaimedTasks },
        [ROUTES.manage.technicians]: { value: alerts.technicians, attention: true },
      }}
    >
      {children ?? <Outlet />}
    </AppShell>
  )
}
