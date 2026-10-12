import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router'
import { Count } from '@/components/common/ui/badge'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { needsScheduling } from '@/features/pre-surveys/components/preSurveyDisplay'
import { useMySurveyRequestsQuery, usePendingSurveyRequestsQuery } from '@/features/pre-surveys/hooks/useSurveyRequests'
import { ROUTES } from '@/routes/paths'

/*
  Children replace the Outlet while the first page module is still loading, so the rail never pops in late.
  Số đếm trên menu lấy từ chính API hàng chờ (cùng cache với trang, tự làm mới mỗi phút). Tô đỏ khi có việc
  đang chờ: còn yêu cầu chưa ai nhận, hoặc yêu cầu đã nhận mà chưa phân công kỹ thuật viên.
*/
export function OpsLayout({ children }: { children?: ReactNode }) {
  // Layout còn là khung chờ trước RequireRole: chỉ gọi hàng chờ khi phiên sales đã khôi phục xong.
  const isSales = useAuth().user?.role === 'sales'
  const pending = usePendingSurveyRequestsQuery({ enabled: isSales }).data?.length
  const mine = useMySurveyRequestsQuery({ enabled: isSales }).data
  return (
    <AppShell
      portal={PORTALS.ops}
      badges={{
        [ROUTES.ops.surveys]: { value: pending, attention: true },
        [ROUTES.ops.surveysMine]: { value: mine?.length, attention: mine?.some((r) => needsScheduling(r.status)) },
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
