import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { technicianReadiness } from '@/features/scheduling/components/schedulingDisplay'
import { useTechniciansQuery } from '@/hooks/useTechnicianAdmin'
import { ROUTES } from '@/routes/paths'

/*
  Children replace the Outlet while the first page module is still loading, so the rail never pops in late.
  Số đỏ cạnh "Kỹ thuật viên": người chưa có nơi xuất phát nên chưa nhận lịch được.
*/
export function ManageLayout({ children }: { children?: ReactNode }) {
  const isManager = useAuth().user?.role === 'manager'
  const missingBase = useTechniciansQuery({ enabled: isManager }).data?.filter((t) => technicianReadiness(t).tone === 'danger').length
  return (
    <AppShell portal={PORTALS.manage} badges={{ [ROUTES.manage.technicians]: { value: missingBase || undefined, attention: true } }}>
      {children ?? <Outlet />}
    </AppShell>
  )
}
