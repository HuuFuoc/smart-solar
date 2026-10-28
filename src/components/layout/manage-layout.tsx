import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { useManagerNavAlerts } from '@/hooks/useManagerNavAlerts'
import { ROUTES } from '@/routes/paths'

// Số đỏ trên menu xem useManagerNavAlerts
export function ManageLayout({ children }: { children?: ReactNode }) {
  const isManager = useAuth().user?.role === 'manager'
  const alerts = useManagerNavAlerts(isManager, ROUTES.manage)
  return (
    <AppShell
      portal={PORTALS.manage}
      badges={{
        [ROUTES.manage.installations]: { value: alerts.installations, attention: true },
        [ROUTES.manage.afterSales]: { value: alerts.afterSales, attention: true },
        [ROUTES.manage.technicians]: { value: alerts.technicians, attention: true },
      }}
    >
      {children ?? <Outlet />}
    </AppShell>
  )
}
