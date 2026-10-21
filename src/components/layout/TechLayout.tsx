import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router'
import { Count } from '@/components/common/ui/badge'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { awaitsMyAnswer } from '@/features/installations/technicianInstallationDisplay'
import { useMyInstallationsQuery } from '@/hooks/useTechnicianInstallations'
import { useOpenAppointmentsQuery } from '@/hooks/useTechnicianJobs'
import { ROUTES } from '@/routes/paths'

// Layout cho /tech/*. Số đỏ cạnh "Việc của tôi" là số lịch trong khu vực đang chờ người nhận,
// cạnh "Lắp đặt" là số công trình quản lý giao đang chờ mình trả lời
export function TechLayout({ children }: { children?: ReactNode }) {
  // Chỉ gọi khi phiên kỹ thuật viên đã khôi phục xong
  const isTechnician = useAuth().user?.role === 'technician'
  const open = useOpenAppointmentsQuery({ enabled: isTechnician }).data
  const installations = useMyInstallationsQuery({ enabled: isTechnician }).data
  const waiting = open?.filter((job) => job.canAccept).length
  const assigned = installations?.filter(awaitsMyAnswer).length
  const hint = waiting
    ? { to: ROUTES.tech.jobs, value: waiting, text: 'lịch chờ bạn nhận' }
    : assigned
      ? { to: ROUTES.tech.installations, value: assigned, text: 'công trình chờ bạn nhận' }
      : null
  return (
    <AppShell
      portal={PORTALS.tech}
      badges={{
        [ROUTES.tech.jobs]: { value: waiting || undefined, attention: true },
        [ROUTES.tech.installations]: { value: assigned || undefined, attention: true },
      }}
      collapsedHint={
        hint ? (
          <Link to={hint.to} className="tap gap-2 underline-offset-4 hover:text-fg hover:underline">
            <Count value={hint.value} attention />
            <span className="sr-only sm:not-sr-only">{hint.text}</span>
          </Link>
        ) : undefined
      }
    >
      {children ?? <Outlet />}
    </AppShell>
  )
}
