import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { useAdminPackagesQuery } from '@/hooks/useAdminAfterSales'
import { useAdminUsersQuery } from '@/hooks/useAdminUsers'
import { useManagerNavAlerts } from '@/hooks/useManagerNavAlerts'
import { useProductsQuery } from '@/hooks/useProducts'
import { ROUTES } from '@/routes/paths'

// Layout cho /admin/*. Số xám cạnh menu: tổng tài khoản, tổng sản phẩm, số gói dịch vụ đang bán.
// Số đỏ (thi công, bảo hành, kỹ thuật viên) giống quản lý, xem useManagerNavAlerts
export function AdminLayout({ children }: { children?: ReactNode }) {
  // Layout còn là khung chờ trước RequireRole: chỉ gọi khi phiên admin đã khôi phục xong.
  const isAdmin = useAuth().user?.role === 'admin'
  const productTotal = useProductsQuery({ PageSize: 1 }, { enabled: isAdmin }).data?.totalItems
  const userTotal = useAdminUsersQuery({ page: 1, pageSize: 1 }, { enabled: isAdmin }).data?.totalItems
  const alerts = useManagerNavAlerts(isAdmin, ROUTES.admin)
  const packagesOnSale = useAdminPackagesQuery({ enabled: isAdmin }).data?.filter((p) => p.isActive).length
  return (
    <AppShell
      portal={PORTALS.admin}
      badges={{
        [ROUTES.admin.users]: { value: userTotal },
        [ROUTES.admin.technicians]: { value: alerts.technicians, attention: true },
        [ROUTES.admin.installations]: { value: alerts.installations, attention: true },
        [ROUTES.admin.afterSales]: { value: alerts.afterSales, attention: true },
        [ROUTES.admin.products]: { value: productTotal },
        [ROUTES.admin.packages]: { value: packagesOnSale },
      }}
    >
      {children ?? <Outlet />}
    </AppShell>
  )
}
