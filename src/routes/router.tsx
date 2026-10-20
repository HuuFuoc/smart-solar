import { createBrowserRouter } from 'react-router'
import { RootLayout } from '@/components/layout/RootLayout'
import { NotFoundPage } from '@/pages/not-found-page'
import { protectedRoutes } from '@/routes/protectedRoutes'
import { publicRoutes } from '@/routes/publicRoutes'

/*
  Điều hướng (đường dẫn ở paths.ts):
    /            trang chủ công khai, /products, /login … /verify-email, /403, /coming-soon   → publicRoutes.tsx
    /customer    khách hàng        (role customer)                                            → protectedRoutes.tsx
    /ops         kinh doanh        (role sales)
    /tech        kỹ thuật viên     (role technician; /field chuyển về đây)
    /manage      quản lý           (role manager)
    /admin       quản trị viên     (role admin)
  Khách hàng dùng customer-shell.tsx, các portal nhân viên dùng chung app-shell.tsx (components/layout).
  Sau đăng nhập, homePathForRole (src/config/roles.ts) đưa mỗi vai trò về portal của mình.
*/
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [...publicRoutes, ...protectedRoutes, { path: '*', element: <NotFoundPage /> }],
  },
])
