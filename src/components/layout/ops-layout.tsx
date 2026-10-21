import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router'
import { Count } from '@/components/common/ui/badge'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import {
  useEscalatedAppointmentsQuery,
  useMySurveyRequestsQuery,
  usePendingSurveyRequestsQuery,
} from '@/hooks/useSurveyRequests'
import { ROUTES } from '@/routes/paths'

// Số đếm trên menu lấy từ API hàng chờ, tô đỏ khi còn yêu cầu chưa nhận hoặc có lịch cần phân công
export function OpsLayout({ children }: { children?: ReactNode }) {
  // Chỉ gọi khi phiên sales đã khôi phục xong
  const isSales = useAuth().user?.role === 'sales'
  const pending = usePendingSurveyRequestsQuery({ enabled: isSales }).data?.length
  const mine = useMySurveyRequestsQuery({ enabled: isSales }).data
  const escalated = useEscalatedAppointmentsQuery({ enabled: isSales }).data
  return (
    <AppShell
      portal={PORTALS.ops}
      badges={{
        [ROUTES.ops.surveys]: { value: pending, attention: true },
        [ROUTES.ops.surveysMine]: { value: mine?.length, attention: escalated?.some((item) => item.ownedByMe) },
      }}
      collapsedHint={
        pending ? (
          <Link to={ROUTES.ops.surveys} className="tap gap-2 underline-offset-4 hover:text-fg hover:underline">
            <Count value={pending} attention />
            {/* Điện thoại chỉ còn số đếm để vừa thanh trên cùng; trình đọc màn hình vẫn đọc đủ câu. */}
            <span className="sr-only sm:not-sr-only">yêu cầu chờ nhận</span>
          </Link>
        ) : undefined
      }
    >
      {children ?? <Outlet />}
    </AppShell>
  )
}
