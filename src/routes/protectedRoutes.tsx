import { Navigate, type RouteObject } from 'react-router'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { TechLayout } from '@/components/layout/TechLayout'
import { CustomerLayout } from '@/components/layout/customer-layout'
import { ManageLayout } from '@/components/layout/manage-layout'
import { OpsLayout } from '@/components/layout/ops-layout'
import { PageSkeleton } from '@/components/common/ui/states'
import { ROUTES } from '@/routes/paths'
import { RequireRole } from '@/routes/RequireRole'

const customer = ROUTES.customer
const ops = ROUTES.ops
const manage = ROUTES.manage

/** Mọi đường dẫn còn lại trong portal (màn mock đã ẩn, link cũ, gõ sai) về trang có dữ liệu thật. */
const fallback = (to: string): RouteObject => ({ path: '*', element: <Navigate to={to} replace /> })

/*
  Route cần đăng nhập, mỗi portal bọc trong <RequireRole role="…">:
  chưa đăng nhập → /login (nhớ trang đích), sai vai trò → /403.

  Chỉ màn đã đổ dữ liệu thật từ backend mới có route (05/10/2026). Màn mock vẫn nằm trong
  pages/<portal>/ và data/*.ts; nối API xong thì thêm lại route ở đây và mục menu trong
  config/portals.ts (mọi portal, kể cả admin và kỹ thuật viên, dùng chung shell portal kit từ 08/10/2026).
*/
export const protectedRoutes: RouteObject[] = [
  /* ---- Portal khách hàng ---- */
  {
    path: customer.home,
    element: (
      <RequireRole role="customer">
        <CustomerLayout />
      </RequireRole>
    ),
    hydrateFallbackElement: (
      <CustomerLayout>
        <PageSkeleton />
      </CustomerLayout>
    ),
    children: [
      { index: true, element: <Navigate to={customer.assessment} replace /> },
      { path: customer.assessment, lazy: () => import('@/pages/customer/assessment-page').then((m) => ({ Component: m.AssessmentPage })) },
      { path: customer.requests, lazy: () => import('@/pages/customer/requests-page').then((m) => ({ Component: m.CustomerRequestsPage })) },
      { path: customer.request, lazy: () => import('@/pages/customer/request-page').then((m) => ({ Component: m.CustomerRequestPage })) },
      { path: customer.products, lazy: () => import('@/pages/catalog-page').then((m) => ({ Component: m.CustomerCatalogPage })) },
      { path: customer.product, lazy: () => import('@/pages/catalog-product-page').then((m) => ({ Component: m.CustomerCatalogProductPage })) },
      fallback(customer.assessment),
    ],
  },

  /* ---- Portal kinh doanh ---- */
  {
    path: ops.home,
    element: (
      <RequireRole role="sales">
        <OpsLayout />
      </RequireRole>
    ),
    hydrateFallbackElement: (
      <OpsLayout>
        <PageSkeleton />
      </OpsLayout>
    ),
    children: [
      { index: true, element: <Navigate to={ops.surveys} replace /> },
      { path: ops.surveys, lazy: () => import('@/pages/ops/surveys-page').then((m) => ({ Component: m.OpsSurveysPage })) },
      { path: ops.surveysMine, lazy: () => import('@/pages/ops/surveys-page').then((m) => ({ Component: m.OpsSurveysPage })) },
      { path: ops.survey, lazy: () => import('@/pages/ops/survey-request-page').then((m) => ({ Component: m.OpsSurveyRequestPage })) },
      { path: ops.products, lazy: () => import('@/pages/catalog-page').then((m) => ({ Component: m.OpsCatalogPage })) },
      { path: ops.product, lazy: () => import('@/pages/catalog-product-page').then((m) => ({ Component: m.OpsCatalogProductPage })) },
      fallback(ops.surveys),
    ],
  },

  /* ---- /field: bản portal kit cũ của kỹ thuật viên, gộp về /tech (08/10/2026) ---- */
  { path: `${ROUTES.field.home}/*`, element: <Navigate to={ROUTES.TECH.DASHBOARD} replace /> },

  /* ---- Portal quản lý: lịch + cấu hình kỹ thuật viên (dùng chung trang với quản trị), danh mục sản phẩm ---- */
  {
    path: manage.home,
    element: (
      <RequireRole role="manager">
        <ManageLayout />
      </RequireRole>
    ),
    hydrateFallbackElement: (
      <ManageLayout>
        <PageSkeleton />
      </ManageLayout>
    ),
    children: [
      { index: true, element: <Navigate to={manage.technicians} replace /> },
      { path: manage.technicians, lazy: () => import('@/pages/technicians-page').then((m) => ({ Component: m.ManageTechniciansPage })) },
      { path: manage.technician, lazy: () => import('@/pages/technician-page').then((m) => ({ Component: m.ManageTechnicianPage })) },
      { path: manage.products, lazy: () => import('@/pages/catalog-page').then((m) => ({ Component: m.ManageCatalogPage })) },
      { path: manage.product, lazy: () => import('@/pages/catalog-product-page').then((m) => ({ Component: m.ManageCatalogProductPage })) },
      fallback(manage.technicians),
    ],
  },

  /* ---- Portal quản trị viên ---- */
  {
    path: ROUTES.ADMIN.DASHBOARD,
    element: (
      <RequireRole role="admin">
        <AdminLayout />
      </RequireRole>
    ),
    hydrateFallbackElement: (
      <AdminLayout>
        <PageSkeleton />
      </AdminLayout>
    ),
    children: [
      { index: true, element: <Navigate to={ROUTES.ADMIN.USERS} replace /> },
      { path: ROUTES.ADMIN.USERS, lazy: () => import('@/pages/admin/users-page').then((m) => ({ Component: m.AdminUsersPage })) },
      { path: ROUTES.ADMIN.USER, lazy: () => import('@/pages/admin/user-page').then((m) => ({ Component: m.AdminUserPage })) },
      { path: ROUTES.ADMIN.TECHNICIANS, lazy: () => import('@/pages/technicians-page').then((m) => ({ Component: m.AdminTechniciansPage })) },
      { path: ROUTES.ADMIN.TECHNICIAN, lazy: () => import('@/pages/technician-page').then((m) => ({ Component: m.AdminTechnicianPage })) },
      { path: 'products', lazy: () => import('@/pages/admin/products-page').then((m) => ({ Component: m.AdminProductsPage })) },
      fallback(ROUTES.ADMIN.USERS),
    ],
  },

  /* ---- Portal kỹ thuật viên /tech: lịch khảo sát được giao (xác nhận nhận việc), lịch làm việc, danh mục sản phẩm ---- */
  {
    path: ROUTES.TECH.DASHBOARD,
    element: (
      <RequireRole role="technician">
        <TechLayout />
      </RequireRole>
    ),
    hydrateFallbackElement: (
      <TechLayout>
        <PageSkeleton />
      </TechLayout>
    ),
    children: [
      { index: true, element: <Navigate to={ROUTES.TECH.JOBS} replace /> },
      { path: ROUTES.TECH.JOBS, lazy: () => import('@/pages/tech/jobs-page').then((m) => ({ Component: m.TechJobsPage })) },
      { path: ROUTES.TECH.JOB, lazy: () => import('@/pages/tech/job-page').then((m) => ({ Component: m.TechJobPage })) },
      { path: ROUTES.TECH.SCHEDULE, lazy: () => import('@/pages/tech/schedule-page').then((m) => ({ Component: m.TechSchedulePage })) },
      { path: ROUTES.TECH.PRODUCTS, lazy: () => import('@/pages/catalog-page').then((m) => ({ Component: m.TechCatalogPage })) },
      { path: ROUTES.TECH.PRODUCT, lazy: () => import('@/pages/catalog-product-page').then((m) => ({ Component: m.TechCatalogProductPage })) },
      fallback(ROUTES.TECH.JOBS),
    ],
  },
]
