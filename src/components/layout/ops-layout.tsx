import { useMemo, type ReactNode } from 'react'
import { Link, Outlet } from 'react-router'
import { Count } from '@/components/common/ui/badge'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { isQuotationTask } from '@/features/after-sales/serviceDisplay'
import { useNavAlert } from '@/hooks/useNavAlert'
import { useMyTasksQuery, useOpenTasksQuery } from '@/hooks/useSalesAfterSales'
import {
  useEscalatedAppointmentsQuery,
  useMySurveyRequestsQuery,
  usePendingSurveyRequestsQuery,
} from '@/hooks/useSurveyRequests'
import { ROUTES } from '@/routes/paths'
import type { SalesTaskView } from '@/types/res/salesAfterSalesRes'
import type { MySurveyRequestItem } from '@/types/res/surveyRequestsRes'

// Số đỏ trên menu: yêu cầu chưa ai nhận, lịch của mình cần phân công, việc báo giá chờ nhận,
// và yêu cầu / việc của mình vừa đổi trạng thái mà chưa xem. Không có gì đỏ thì "Của tôi" hiện tổng số (xám)
const surveyAlert = {
  key: (r: MySurveyRequestItem) => r.surveyRequestId,
  sig: (r: MySurveyRequestItem) => `${r.status}|${r.scheduledAt}`,
}
const taskAlert = {
  key: (t: SalesTaskView) => t.taskId,
  sig: (t: SalesTaskView) => t.status,
}

export function OpsLayout({ children }: { children?: ReactNode }) {
  // Chỉ gọi khi phiên sales đã khôi phục xong
  const enabled = useAuth().user?.role === 'sales'
  const pending = usePendingSurveyRequestsQuery({ enabled }).data?.length
  const mine = useMySurveyRequestsQuery({ enabled }).data
  const escalated = useEscalatedAppointmentsQuery({ enabled }).data
  const openTasks = useOpenTasksQuery({ enabled }).data?.filter(isQuotationTask).length ?? 0
  const myTasksData = useMyTasksQuery({ enabled }).data
  const myTasks = useMemo(() => myTasksData?.filter(isQuotationTask), [myTasksData])
  const mineAlert = useNavAlert(ROUTES.ops.surveysMine, mine, {
    ...surveyAlert,
    todo: (r) => escalated?.some((item) => item.ownedByMe && item.surveyRequestId === r.surveyRequestId) ?? false,
  })
  const tasksAlert = useNavAlert(ROUTES.ops.afterSales, myTasks, taskAlert)
  return (
    <AppShell
      portal={PORTALS.ops}
      badges={{
        [ROUTES.ops.surveys]: { value: pending, attention: true },
        [ROUTES.ops.surveysMine]: { value: mineAlert || mine?.length, attention: mineAlert > 0 },
        [ROUTES.ops.afterSales]: { value: openTasks + tasksAlert, attention: true },
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
