import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router'
import { Count } from '@/components/common/ui/badge'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { awaitsAnswer } from '@/features/after-sales/technicianVisitDisplay'
import { awaitsMyAnswer } from '@/features/installations/technicianInstallationDisplay'
import { useNavAlert } from '@/hooks/useNavAlert'
import { useMyVisitsQuery } from '@/hooks/useTechnicianAfterSales'
import { useMyInstallationsQuery } from '@/hooks/useTechnicianInstallations'
import { useMyAppointmentsQuery, useOpenAppointmentsQuery } from '@/hooks/useTechnicianJobs'
import { ROUTES } from '@/routes/paths'
import type { TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'
import type { TechnicianAppointmentListItem } from '@/types/res/technicianAppointmentsRes'
import type { InstallationTechnicianView } from '@/types/res/technicianInstallationsRes'

// Layout cho /tech/*. Số đỏ trên menu: lịch trong khu vực chờ người nhận, công trình và buổi hẹn bảo hành giao cho mình
// đang chờ trả lời, cộng việc của mình vừa đổi (khách huỷ, đổi giờ, xác nhận giờ hẹn) mà chưa xem
const jobAlert = {
  key: (j: TechnicianAppointmentListItem) => j.appointmentId,
  sig: (j: TechnicianAppointmentListItem) => `${j.status}|${j.startsAt}`,
}
const installationAlert = {
  key: (v: InstallationTechnicianView) => v.projectId,
  sig: (v: InstallationTechnicianView) => [v.status, v.myAssignmentStatus, v.startsAt].join('|'),
  todo: awaitsMyAnswer,
}
const visitAlert = {
  key: (v: TechnicianVisitView) => v.visitId,
  sig: (v: TechnicianVisitView) => [v.status, v.assignmentStatus, v.startsAt, v.customerConfirmedAt].join('|'),
  todo: awaitsAnswer,
}

export function TechLayout({ children }: { children?: ReactNode }) {
  // Chỉ gọi khi phiên kỹ thuật viên đã khôi phục xong
  const enabled = useAuth().user?.role === 'technician'
  const open = useOpenAppointmentsQuery({ enabled }).data
  const waiting = open?.filter((job) => job.canAccept).length ?? 0
  const jobs = useNavAlert(ROUTES.tech.jobs, useMyAppointmentsQuery({ enabled }).data, jobAlert)
  const installations = useMyInstallationsQuery({ enabled }).data
  const assigned = installations?.filter(awaitsMyAnswer).length
  const installationsAlert = useNavAlert(ROUTES.tech.installations, installations, installationAlert)
  const visits = useMyVisitsQuery({ enabled }).data
  const visitsWaiting = visits?.filter(awaitsAnswer).length
  const visitsAlert = useNavAlert(ROUTES.tech.afterSales, visits, visitAlert)
  const hint = waiting
    ? { to: ROUTES.tech.jobs, value: waiting, text: 'lịch chờ bạn nhận' }
    : assigned
      ? { to: ROUTES.tech.installations, value: assigned, text: 'công trình chờ bạn nhận' }
      : visitsWaiting
        ? { to: ROUTES.tech.afterSales, value: visitsWaiting, text: 'buổi hẹn chờ bạn nhận' }
        : null
  return (
    <AppShell
      portal={PORTALS.tech}
      badges={{
        [ROUTES.tech.jobs]: { value: waiting + jobs, attention: true },
        [ROUTES.tech.installations]: { value: installationsAlert, attention: true },
        [ROUTES.tech.afterSales]: { value: visitsAlert, attention: true },
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
