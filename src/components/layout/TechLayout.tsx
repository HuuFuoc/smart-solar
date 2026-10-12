import { useState, type ReactNode } from 'react'
import { Link, Outlet } from 'react-router'
import { Count } from '@/components/common/ui/badge'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { useMyAppointmentsQuery } from '@/features/scheduling/hooks/useTechnicianJobs'
import { ROUTES } from '@/routes/paths'

/*
  Bọc mọi route /tech/*. Số đỏ cạnh "Việc của tôi": lịch sắp tới đang chờ kỹ thuật viên xác nhận nhận việc (cùng cache
  với trang, tự làm mới mỗi phút).
*/
export function TechLayout({ children }: { children?: ReactNode }) {
  // Layout còn là khung chờ trước RequireRole: chỉ gọi khi phiên kỹ thuật viên đã khôi phục xong.
  const isTechnician = useAuth().user?.role === 'technician'
  const jobs = useMyAppointmentsQuery({ enabled: isTechnician }).data
  // Mốc "đã qua" lấy lúc mở portal: lịch qua giờ trong lúc đang mở chỉ rời số đếm ở lần tải trang sau, đủ cho một số đếm.
  const [now] = useState(() => Date.now())
  const waiting = jobs?.filter((j) => j.status === 'ASSIGNED' && new Date(j.endsAt).getTime() >= now).length
  return (
    <AppShell
      portal={PORTALS.tech}
      badges={{ [ROUTES.TECH.JOBS]: { value: waiting || undefined, attention: true } }}
      collapsedHint={
        waiting ? (
          <Link to={ROUTES.TECH.JOBS} className="tap gap-2 underline-offset-4 hover:text-fg hover:underline">
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
