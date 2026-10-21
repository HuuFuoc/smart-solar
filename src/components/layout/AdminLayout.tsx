import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { useAdminPackagesQuery } from '@/hooks/useAdminAfterSales'
import { useProductsQuery } from '@/hooks/useProducts'
import { technicianReadiness } from '@/features/scheduling/schedulingDisplay'
import { useTechniciansQuery } from '@/hooks/useTechnicianAdmin'
import { useAdminUsersQuery } from '@/hooks/useAdminUsers'
import { useInstallationProjectsQuery, useReadyContractsQuery } from '@/hooks/useManagerInstallations'
import { ROUTES } from '@/routes/paths'

// Layout cho /admin/*. Số cạnh menu: tổng tài khoản, tổng sản phẩm, số gói dịch vụ đang bán, số kỹ thuật viên chưa thuộc
// khu vực nào (đỏ) và việc thi công đang chờ: hợp đồng chưa tạo dự án + dự án chờ phân công (đỏ)
export function AdminLayout({ children }: { children?: ReactNode }) {
  // Layout còn là khung chờ trước RequireRole: chỉ gọi khi phiên admin đã khôi phục xong.
  const isAdmin = useAuth().user?.role === 'admin'
  const productTotal = useProductsQuery({ PageSize: 1 }, { enabled: isAdmin }).data?.totalItems
  const userTotal = useAdminUsersQuery({ page: 1, pageSize: 1 }, { enabled: isAdmin }).data?.totalItems
  const missingBase = useTechniciansQuery({ enabled: isAdmin }).data?.filter(
    (t) => technicianReadiness(t).tone === 'danger',
  ).length
  const ready = useReadyContractsQuery({ enabled: isAdmin }).data?.length ?? 0
  const waiting = useInstallationProjectsQuery('PENDING_ASSIGNMENT', { enabled: isAdmin }).data?.length ?? 0
  const packagesOnSale = useAdminPackagesQuery({ enabled: isAdmin }).data?.filter((p) => p.isActive).length
  return (
    <AppShell
      portal={PORTALS.admin}
      badges={{
        [ROUTES.admin.users]: { value: userTotal },
        [ROUTES.admin.technicians]: { value: missingBase || undefined, attention: true },
        [ROUTES.admin.installations]: { value: ready + waiting || undefined, attention: true },
        [ROUTES.admin.products]: { value: productTotal },
        [ROUTES.admin.packages]: { value: packagesOnSale },
      }}
    >
      {children ?? <Outlet />}
    </AppShell>
  )
}
