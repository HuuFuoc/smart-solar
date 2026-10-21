import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router'
import { Count } from '@/components/common/ui/badge'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { useOpenAppointmentsQuery } from '@/hooks/useTechnicianJobs'
import { ROUTES } from '@/routes/paths'

// Layout cho /tech/*. Số đỏ cạnh "Việc của tôi" là số lịch trong khu vực đang chờ người nhận
export function TechLayout({ children }: { children?: ReactNode }) {
  // Chỉ gọi khi phiên kỹ thuật viên đã khôi phục xong
  const isTechnician = useAuth().user?.role === 'technician'
  const open = useOpenAppointmentsQuery({ enabled: isTechnician }).data
  const waiting = open?.filter((job) => job.canAccept).length
  return (
    <AppShell
      portal={PORTALS.tech}
      badges={{ [ROUTES.tech.jobs]: { value: waiting || undefined, attention: true } }}
      collapsedHint={
        waiting ? (
          <Link to={ROUTES.tech.jobs} className="tap gap-2 underline-offset-4 hover:text-fg hover:underline">
            <Count value={waiting} attention />
            <span className="sr-only sm:not-sr-only">lịch chờ bạn nhận</span>
          </Link>
        ) : undefined
      }
    >
      {children ?? <Outlet />}
    </AppShell>
  )
}
