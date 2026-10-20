import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { PORTALS } from '@/config/portals'
import { useAuth } from '@/context/AuthProvider'
import { useProductsQuery } from '@/hooks/useProducts'
import { technicianReadiness } from '@/features/scheduling/components/schedulingDisplay'
import { useTechniciansQuery } from '@/hooks/useTechnicianAdmin'
import { useAdminUsersQuery } from '@/hooks/useAdminUsers'
import { ROUTES } from '@/routes/paths'

/*
  Bọc mọi route /admin/*. Dùng chung shell của portal kit với khách hàng và sales (08/10/2026) để cả web một kiểu.
  Số cạnh mục menu: tổng tài khoản và tổng sản phẩm (xám, PageSize 1 vì chỉ cần totalItems); số kỹ thuật viên chưa có nơi
  xuất phát (đỏ: việc quản trị phải làm, nếu không khách không đặt được giờ với người đó).
*/
export function AdminLayout({ children }: { children?: ReactNode }) {
  // Layout còn là khung chờ trước RequireRole: chỉ gọi khi phiên admin đã khôi phục xong.
  const isAdmin = useAuth().user?.role === 'admin'
  const productTotal = useProductsQuery({ PageSize: 1 }, { enabled: isAdmin }).data?.totalItems
  const userTotal = useAdminUsersQuery({ page: 1, pageSize: 1 }, { enabled: isAdmin }).data?.totalItems
  const missingBase = useTechniciansQuery({ enabled: isAdmin }).data?.filter((t) => technicianReadiness(t).tone === 'danger').length
  return (
    <AppShell
      portal={PORTALS.admin}
      badges={{
        [ROUTES.admin.users]: { value: userTotal },
        [ROUTES.admin.technicians]: { value: missingBase || undefined, attention: true },
        [ROUTES.admin.products]: { value: productTotal },
      }}
    >
      {children ?? <Outlet />}
    </AppShell>
  )
}
