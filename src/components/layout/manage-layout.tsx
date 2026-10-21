import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { technicianReadiness } from '@/features/scheduling/schedulingDisplay'
import { useTechniciansQuery } from '@/hooks/useTechnicianAdmin'
import { ROUTES } from '@/routes/paths'

// Số đỏ cạnh "Kỹ thuật viên" là số người chưa thuộc khu vực nào
export function ManageLayout({ children }: { children?: ReactNode }) {
  const isManager = useAuth().user?.role === 'manager'
  const missingBase = useTechniciansQuery({ enabled: isManager }).data?.filter(
    (t) => technicianReadiness(t).tone === 'danger',
  ).length
  return (
    <AppShell
      portal={PORTALS.manage}
      badges={{ [ROUTES.manage.technicians]: { value: missingBase || undefined, attention: true } }}
    >
      {children ?? <Outlet />}
    </AppShell>
  )
}
