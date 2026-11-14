import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { installationWarrantyGap } from '@/features/after-sales/adminAfterSalesRules'
import { useAdminPackagesQuery, useWarrantyOptionsQuery } from '@/hooks/useAdminAfterSales'
import { useAdminUsersQuery } from '@/hooks/useAdminUsers'
import { useManagerNavAlerts } from '@/hooks/useManagerNavAlerts'
import { useSalesTasksQuery } from '@/hooks/useManagerAfterSales'
import { useProductsQuery } from '@/hooks/useProducts'
import { ROUTES } from '@/routes/paths'

// Layout cho /admin/*. Số xám cạnh menu: tổng tài khoản, tổng sản phẩm, số gói dịch vụ đang bán. Không đếm khu vực ở đây:
// API khu vực chung giới hạn 20 lần đọc / phút với điều phối và kỹ thuật viên mà layout đã gọi mỗi lần tải trang.
// Số đỏ (điều phối, thi công, bảo hành, kỹ thuật viên) giống quản lý, xem useManagerNavAlerts; thêm thời hạn bảo hành lắp đặt
// còn thiếu (kinh doanh chưa phát hành được hợp đồng). Số xám cạnh "Việc của kinh doanh": việc chưa ai nhận (kinh doanh tự
// nhận, quản trị giao khi cần)
export function AdminLayout({ children }: { children?: ReactNode }) {
  // Layout còn là khung chờ trước RequireRole: chỉ gọi khi phiên admin đã khôi phục xong.
  const isAdmin = useAuth().user?.role === 'admin'
  const productTotal = useProductsQuery({ PageSize: 1 }, { enabled: isAdmin }).data?.totalItems
  const userTotal = useAdminUsersQuery({ page: 1, pageSize: 1 }, { enabled: isAdmin }).data?.totalItems
  const alerts = useManagerNavAlerts(isAdmin, ROUTES.admin)
  const packagesOnSale = useAdminPackagesQuery({ enabled: isAdmin }).data?.filter((p) => p.isActive).length
  const warranty = useWarrantyOptionsQuery({ enabled: isAdmin }).data
  const unclaimedTasks = useSalesTasksQuery(undefined, { enabled: isAdmin }).data?.filter(
    (t) => t.status === 'OPEN',
  ).length
  const warrantyGap = warranty ? (installationWarrantyGap(warranty) ? 1 : 0) : undefined
  return (
    <AppShell
      portal={PORTALS.admin}
      badges={{
        [ROUTES.admin.users]: { value: userTotal },
        [ROUTES.admin.technicians]: { value: alerts.technicians, attention: true },
        [ROUTES.admin.dispatch]: { value: alerts.dispatch, attention: true },
        [ROUTES.admin.installations]: { value: alerts.installations, attention: true },
        [ROUTES.admin.afterSales]: { value: alerts.afterSales, attention: true },
        [ROUTES.admin.products]: { value: productTotal },
        [ROUTES.admin.packages]: { value: packagesOnSale },
        [ROUTES.admin.warrantyOptions]: { value: warrantyGap, attention: true },
        [ROUTES.admin.salesTasks]: { value: unclaimedTasks },
      }}
    >
      {children ?? <Outlet />}
    </AppShell>
  )
}
