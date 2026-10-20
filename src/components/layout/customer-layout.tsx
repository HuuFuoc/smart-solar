import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { CustomerShell } from '@/components/layout/customer-shell'

// Khách hàng dùng khung riêng (customer-shell), không dùng rail của nhân viên
export function CustomerLayout({ children }: { children?: ReactNode }) {
  return <CustomerShell>{children ?? <Outlet />}</CustomerShell>
}
