import { useState, type ReactNode } from 'react'
import { Link, Outlet } from 'react-router'
import { Count } from '@/components/common/ui/badge'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { useMyAppointmentsQuery } from '@/hooks/useTechnicianJobs'
import { ROUTES } from '@/routes/paths'

// Layout cho /tech/*. Số đỏ cạnh "Việc của tôi" là số lịch đang chờ kỹ thuật viên nhận việc
export function TechLayout({ children }: { children?: ReactNode }) {
  // Chỉ gọi khi phiên kỹ thuật viên đã khôi phục xong
  const isTechnician = useAuth().user?.role === 'technician'
  const jobs = useMyAppointmentsQuery({ enabled: isTechnician }).data
  // Lấy mốc thời gian lúc mở portal là đủ cho số đếm
  const [now] = useState(() => Date.now())
  const waiting = jobs?.filter((j) => j.status === 'ASSIGNED' && new Date(j.endsAt).getTime() >= now).length
  return (
    <AppShell
      portal={PORTALS.tech}
      badges={{ [ROUTES.tech.jobs]: { value: waiting || undefined, attention: true } }}
      collapsedHint={
        waiting ? (
          <Link to={ROUTES.tech.jobs} className="tap gap-2 underline-offset-4 hover:text-fg hover:underline">
            <Count value={waiting} attention />
            <span className="sr-only sm:not-sr-only">lịch chờ nhận việc</span>
          </Link>
        ) : undefined
      }
    >
      {children ?? <Outlet />}
    </AppShell>
  )
}
