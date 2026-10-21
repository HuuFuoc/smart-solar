import type { ComponentType, ReactNode } from 'react'
import { Navigate, type RouteObject } from 'react-router'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { TechLayout } from '@/components/layout/TechLayout'
import { CustomerLayout } from '@/components/layout/customer-layout'
import { ManageLayout } from '@/components/layout/manage-layout'
import { OpsLayout } from '@/components/layout/ops-layout'
import { PageSkeleton } from '@/components/common/ui/states'
import type { UserRole } from '@/common/role'
import { page } from '@/routes/lazyPage'
import { ROUTES } from '@/routes/paths'
import { RequireRole } from '@/routes/RequireRole'

// Khách hàng
const AssessmentPage = page(() => import('@/pages/customer/assessment-page'), 'AssessmentPage')
const CustomerRequestsPage = page(() => import('@/pages/customer/requests-page'), 'CustomerRequestsPage')
const CustomerRequestPage = page(() => import('@/pages/customer/request-page'), 'CustomerRequestPage')
const CustomerProjectsPage = page(() => import('@/pages/customer/projects-page'), 'CustomerProjectsPage')
const CustomerProjectPage = page(() => import('@/pages/customer/project-page'), 'CustomerProjectPage')
const CustomerPackagesPage = page(() => import('@/pages/customer/packages-page'), 'CustomerPackagesPage')
const CustomerCatalogPage = page(() => import('@/pages/catalog-page'), 'CustomerCatalogPage')
const CustomerCatalogProductPage = page(() => import('@/pages/catalog-product-page'), 'CustomerCatalogProductPage')

// Kinh doanh
const OpsSurveysPage = page(() => import('@/pages/ops/surveys-page'), 'OpsSurveysPage')
const OpsSurveyRequestPage = page(() => import('@/pages/ops/survey-request-page'), 'OpsSurveyRequestPage')
const OpsCatalogPage = page(() => import('@/pages/catalog-page'), 'OpsCatalogPage')
const OpsCatalogProductPage = page(() => import('@/pages/catalog-product-page'), 'OpsCatalogProductPage')

// Kỹ thuật viên
const TechJobsPage = page(() => import('@/pages/tech/jobs-page'), 'TechJobsPage')
const TechJobPage = page(() => import('@/pages/tech/job-page'), 'TechJobPage')
const TechInstallationsPage = page(() => import('@/pages/tech/installations-page'), 'TechInstallationsPage')
const TechInstallationPage = page(() => import('@/pages/tech/installation-page'), 'TechInstallationPage')
const TechSchedulePage = page(() => import('@/pages/tech/schedule-page'), 'TechSchedulePage')
const TechCatalogPage = page(() => import('@/pages/catalog-page'), 'TechCatalogPage')
const TechCatalogProductPage = page(() => import('@/pages/catalog-product-page'), 'TechCatalogProductPage')

// Quản lý
const ManageTechniciansPage = page(() => import('@/pages/technicians-page'), 'ManageTechniciansPage')
const ManageTechnicianPage = page(() => import('@/pages/technician-page'), 'ManageTechnicianPage')
const ManageCatalogPage = page(() => import('@/pages/catalog-page'), 'ManageCatalogPage')
const ManageCatalogProductPage = page(() => import('@/pages/catalog-product-page'), 'ManageCatalogProductPage')
const ManageInstallationProjectsPage = page(
  () => import('@/pages/installation-projects-page'),
  'ManageInstallationProjectsPage',
)
const ManageInstallationProjectPage = page(
  () => import('@/pages/installation-project-page'),
  'ManageInstallationProjectPage',
)

// Quản trị
const AdminUsersPage = page(() => import('@/pages/admin/users-page'), 'AdminUsersPage')
const AdminUserPage = page(() => import('@/pages/admin/user-page'), 'AdminUserPage')
const AdminTechniciansPage = page(() => import('@/pages/technicians-page'), 'AdminTechniciansPage')
const AdminTechnicianPage = page(() => import('@/pages/technician-page'), 'AdminTechnicianPage')
const AdminProductsPage = page(() => import('@/pages/admin/products-page'), 'AdminProductsPage')
const AdminInstallationProjectsPage = page(
  () => import('@/pages/installation-projects-page'),
  'AdminInstallationProjectsPage',
)
const AdminInstallationProjectPage = page(
  () => import('@/pages/installation-project-page'),
  'AdminInstallationProjectPage',
)

type PortalConfig = {
  role: UserRole
  path: string
  Layout: ComponentType<{ children?: ReactNode }>
  /** Trang mở khi vào đường gốc. Đường lạ trong portal (màn mock đã ẩn, link cũ, gõ sai) cũng về đây */
  start: string
  pages: RouteObject[]
}

// Layout được vẽ làm khung chờ trước RequireRole, nên query trong layout phải chờ có user đúng vai trò
function portal({ role, path, Layout, start, pages }: PortalConfig): RouteObject {
  return {
    path,
    element: (
      <RequireRole role={role}>
        <Layout />
      </RequireRole>
    ),
    hydrateFallbackElement: (
      <Layout>
        <PageSkeleton />
      </Layout>
    ),
    children: [
      { index: true, element: <Navigate to={start} replace /> },
      ...pages,
      { path: '*', element: <Navigate to={start} replace /> },
    ],
  }
}

const { customer, ops, tech, manage, admin } = ROUTES

// Chỉ màn có dữ liệu thật mới có route. Màn mock nối API xong thì thêm route ở đây và mục menu trong config/portals.ts
export const protectedRoutes: RouteObject[] = [
  portal({
    role: 'customer',
    path: customer.home,
    Layout: CustomerLayout,
    start: customer.assessment,
    pages: [
      { path: customer.assessment, lazy: AssessmentPage },
      { path: customer.requests, lazy: CustomerRequestsPage },
      { path: customer.request, lazy: CustomerRequestPage },
      { path: customer.projects, lazy: CustomerProjectsPage },
      { path: customer.project, lazy: CustomerProjectPage },
      { path: customer.packages, lazy: CustomerPackagesPage },
      { path: customer.products, lazy: CustomerCatalogPage },
      { path: customer.product, lazy: CustomerCatalogProductPage },
    ],
  }),

  portal({
    role: 'sales',
    path: ops.home,
    Layout: OpsLayout,
    start: ops.surveys,
    pages: [
      { path: ops.surveys, lazy: OpsSurveysPage },
      { path: ops.surveysMine, lazy: OpsSurveysPage },
      { path: ops.survey, lazy: OpsSurveyRequestPage },
      { path: ops.products, lazy: OpsCatalogPage },
      { path: ops.product, lazy: OpsCatalogProductPage },
    ],
  }),

  portal({
    role: 'technician',
    path: tech.home,
    Layout: TechLayout,
    start: tech.jobs,
    pages: [
      { path: tech.jobs, lazy: TechJobsPage },
      { path: tech.job, lazy: TechJobPage },
      { path: tech.installations, lazy: TechInstallationsPage },
      { path: tech.installation, lazy: TechInstallationPage },
      { path: tech.schedule, lazy: TechSchedulePage },
      { path: tech.products, lazy: TechCatalogPage },
      { path: tech.product, lazy: TechCatalogProductPage },
    ],
  }),

  // Quản lý dùng chung trang kỹ thuật viên và trang thi công với quản trị
  portal({
    role: 'manager',
    path: manage.home,
    Layout: ManageLayout,
    start: manage.technicians,
    pages: [
      { path: manage.installations, lazy: ManageInstallationProjectsPage },
      { path: manage.installation, lazy: ManageInstallationProjectPage },
      { path: manage.technicians, lazy: ManageTechniciansPage },
      { path: manage.technician, lazy: ManageTechnicianPage },
      { path: manage.products, lazy: ManageCatalogPage },
      { path: manage.product, lazy: ManageCatalogProductPage },
    ],
  }),

  portal({
    role: 'admin',
    path: admin.home,
    Layout: AdminLayout,
    start: admin.users,
    pages: [
      { path: admin.users, lazy: AdminUsersPage },
      { path: admin.user, lazy: AdminUserPage },
      { path: admin.technicians, lazy: AdminTechniciansPage },
      { path: admin.technician, lazy: AdminTechnicianPage },
      { path: admin.products, lazy: AdminProductsPage },
      { path: admin.installations, lazy: AdminInstallationProjectsPage },
      { path: admin.installation, lazy: AdminInstallationProjectPage },
    ],
  }),

  // /field cũ chuyển về /tech
  { path: `${ROUTES.field.home}/*`, element: <Navigate to={tech.home} replace /> },
]
