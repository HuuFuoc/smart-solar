import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { useSalesTasksQuery } from '@/hooks/useManagerAfterSales'
import { useManagerNavAlerts } from '@/hooks/useManagerNavAlerts'
import { usePricingApprovalsQuery } from '@/hooks/useManagerQuotations'
import { ROUTES } from '@/routes/paths'

// Số đỏ trên menu xem useManagerNavAlerts; thêm báo giá chờ quản lý duyệt. Việc của kinh doanh chưa ai nhận là số xám: kinh
// doanh tự nhận, quản lý chỉ theo dõi
export function ManageLayout({ children }: { children?: ReactNode }) {
  const isManager = useAuth().user?.role === 'manager'
  const alerts = useManagerNavAlerts(isManager, ROUTES.manage)
  const unclaimedTasks = useSalesTasksQuery(undefined, { enabled: isManager }).data?.filter(
    (t) => t.status === 'OPEN',
  ).length
  const pricingToDecide = usePricingApprovalsQuery({ enabled: isManager }).data?.length
  return (
    <AppShell
      portal={PORTALS.manage}
      badges={{
        [ROUTES.manage.dispatch]: { value: alerts.dispatch, attention: true },
        [ROUTES.manage.installations]: { value: alerts.installations, attention: true },
        [ROUTES.manage.afterSales]: { value: alerts.afterSales, attention: true },
        [ROUTES.manage.pricingApprovals]: { value: pricingToDecide, attention: true },
        [ROUTES.manage.salesTasks]: { value: unclaimedTasks },
        [ROUTES.manage.technicians]: { value: alerts.technicians, attention: true },
      }}
    >
      {children ?? <Outlet />}
    </AppShell>
  )
}
