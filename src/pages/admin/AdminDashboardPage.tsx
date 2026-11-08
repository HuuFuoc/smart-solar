import { useState } from 'react'
import { Link } from 'react-router'
import { ErrorState } from '@/components/common/ui/states'
import { AdminActionAlertsCard } from '@/features/admin-dashboard/components/AdminActionAlertsCard'
import { AdminDashboardHeader } from '@/features/admin-dashboard/components/AdminDashboardHeader'
import { AdminDashboardStats } from '@/features/admin-dashboard/components/AdminDashboardStats'
import { AdminRecentOperationsTable } from '@/features/admin-dashboard/components/AdminRecentOperationsTable'
import { AdminSystemPipelineCard } from '@/features/admin-dashboard/components/AdminSystemPipelineCard'
import { installationWarrantyGap } from '@/features/after-sales/adminAfterSalesRules'
import { useWarrantyOptionsQuery } from '@/hooks/useAdminAfterSales'
import { useAdminUsersQuery } from '@/hooks/useAdminUsers'
import { useDispatchQueueQuery } from '@/hooks/useDispatch'
import { useInstallationProjectsQuery, useReadyContractsQuery } from '@/hooks/useManagerInstallations'
import { useRefundsQuery, useServiceRequestsQuery } from '@/hooks/useManagerAfterSales'
import { useProductsQuery } from '@/hooks/useProducts'
import { useOperationalZonesQuery, useTechniciansQuery } from '@/hooks/useTechnicianAdmin'
import { ROUTES } from '@/routes/paths'

export function AdminDashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 1. Dữ liệu thực tế: Thi công lắp đặt & Hợp đồng sẵn sàng
  const readyContractsQuery = useReadyContractsQuery()
  const projectsQuery = useInstallationProjectsQuery()

  // 2. Dữ liệu thực tế: Hàng đợi điều phối KTV
  const dispatchQueueQuery = useDispatchQueueQuery()

  // 3. Dữ liệu thực tế: Bảo hành, sửa chữa & Hoàn tiền
  const serviceRequestsQuery = useServiceRequestsQuery()
  const refundsQuery = useRefundsQuery()

  // 4. Dữ liệu thực tế: Kỹ thuật viên & Khu vực phục vụ
  const techniciansQuery = useTechniciansQuery()
  const zonesQuery = useOperationalZonesQuery()

  // 5. Dữ liệu thực tế: Tài khoản người dùng hệ thống
  const adminUsersQuery = useAdminUsersQuery({ page: 1, pageSize: 1 })

  // 6. Dữ liệu thực tế: Danh mục sản phẩm & Thiết bị
  const productsQuery = useProductsQuery({ PageSize: 1 })

  // 7. Dữ liệu thực tế: Thời hạn bảo hành cấu hình
  const warrantyOptionsQuery = useWarrantyOptionsQuery()

  // Tổng hợp trạng thái tải & lỗi
  const isLoading =
    readyContractsQuery.isLoading ||
    projectsQuery.isLoading ||
    dispatchQueueQuery.isLoading ||
    serviceRequestsQuery.isLoading ||
    techniciansQuery.isLoading

  const isError =
    readyContractsQuery.isError && projectsQuery.isError && serviceRequestsQuery.isError && techniciansQuery.isError

  // Hàm làm mới toàn bộ dữ liệu thực tế từ server
  const handleRefreshAll = async () => {
    setIsRefreshing(true)
    try {
      await Promise.allSettled([
        readyContractsQuery.refetch(),
        projectsQuery.refetch(),
        dispatchQueueQuery.refetch(),
        serviceRequestsQuery.refetch(),
        refundsQuery.refetch(),
        techniciansQuery.refetch(),
        zonesQuery.refetch(),
        adminUsersQuery.refetch(),
        productsQuery.refetch(),
        warrantyOptionsQuery.refetch(),
      ])
    } finally {
      setIsRefreshing(false)
    }
  }

  // Trích xuất dữ liệu thực tế
  const readyContracts = readyContractsQuery.data ?? []
  const projects = projectsQuery.data ?? []
  const dispatchItems = dispatchQueueQuery.data?.items ?? []
  const serviceRequests = serviceRequestsQuery.data ?? []
  const refunds = refundsQuery.data ?? []
  const technicians = techniciansQuery.data ?? []
  const zones = zonesQuery.data ?? []
  const totalUsers = adminUsersQuery.data?.totalItems ?? 0
  const totalProducts = productsQuery.data?.totalItems ?? 0
  const warrantyOptions = warrantyOptionsQuery.data ?? []

  // Tính toán chỉ số nghiệp vụ chuẩn xác từ dữ liệu thực tế
  const inProgressProjects = projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'SCHEDULED').length
  const readyContractsCount = readyContracts.length
  const openDispatchCount = dispatchItems.filter((d) => d.status === 'OPEN' || d.status === 'PROPOSAL_PENDING').length
  const pendingServicesCount = serviceRequests.filter(
    (s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED',
  ).length
  const urgentServicesCount = serviceRequests.filter(
    (s) => s.status === 'AWAITING_DECISION' || s.status === 'DISPUTED',
  ).length

  const readyTechnicians = technicians.filter((t) => t.readyForScheduling).length
  const missingBaseTechCount = technicians.filter((t) => t.zones.length === 0).length
  const refundsToRecordCount = refunds.filter((r) => r.status === 'APPROVED' && !r.refundedAt).length
  const warrantyGap = Boolean(installationWarrantyGap(warrantyOptions))

  // Đếm tổng số vấn đề cần xử lý
  const criticalCount =
    (readyContractsCount > 0 ? 1 : 0) +
    (missingBaseTechCount > 0 ? 1 : 0) +
    (refundsToRecordCount > 0 ? 1 : 0) +
    (openDispatchCount > 3 ? 1 : 0) +
    (warrantyGap ? 1 : 0)

  if (isError) {
    return (
      <div>
        <ErrorState
          title="Không thể tải dữ liệu trung tâm quản trị"
          message="Đã có lỗi khi kết nối tới máy chủ backend. Vui lòng kiểm tra lại đường truyền mạng hoặc đăng nhập lại."
          onRetry={handleRefreshAll}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Actions trong khung container ngăn cách */}
      <AdminDashboardHeader onRefresh={handleRefreshAll} isRefreshing={isRefreshing} criticalCount={criticalCount} />

      {/* 2. Top KPI Cards: Trích xuất trực tiếp từ API thực */}
      <AdminDashboardStats
        isLoading={isLoading}
        inProgressProjects={inProgressProjects}
        readyContracts={readyContractsCount}
        openDispatchCount={openDispatchCount}
        pendingServicesCount={pendingServicesCount}
        urgentServicesCount={urgentServicesCount}
        totalTechnicians={technicians.length}
        readyTechnicians={readyTechnicians}
        missingBaseCount={missingBaseTechCount}
        totalUsers={totalUsers}
        zonesCount={zones.length}
      />

      {/* 3. Phân chia Grid 2 cột: Giám sát vận hành & Cảnh báo tác vụ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Cột chính (8/12 - ~67%): Pipeline giám sát + Bảng công việc gần nhất */}
        <div className="space-y-6 lg:col-span-8">
          <AdminSystemPipelineCard
            isLoading={isLoading}
            projects={projects}
            serviceRequests={serviceRequests}
            totalProducts={totalProducts}
            totalZones={zones.length}
          />

          <AdminRecentOperationsTable
            projects={projects}
            serviceRequests={serviceRequests}
            dispatchItems={dispatchItems}
          />
        </div>

        {/* Cột phụ (4/12 - ~33%): Cảnh báo khẩn cấp & Tiện ích cấu hình hệ thống */}
        <div className="space-y-6 lg:col-span-4">
          <AdminActionAlertsCard
            isLoading={isLoading}
            readyContractsCount={readyContractsCount}
            missingBaseTechCount={missingBaseTechCount}
            refundsToRecordCount={refundsToRecordCount}
            openDispatchCount={openDispatchCount}
            warrantyGap={warrantyGap}
          />

          <section aria-labelledby="admin-catalogs" className="rounded-container bg-surface-2 p-4">
            <h2 id="admin-catalogs" className="mb-3 text-title font-semibold">
              Danh mục quản trị
            </h2>
            <ul className="divide-y divide-line">
              <li className="py-2 first:pt-0 last:pb-0">
                <Link to={ROUTES.admin.packages} className="ui-link font-medium">
                  Gói dịch vụ
                </Link>
                <p className="text-meta text-fg-2">Gói bảo dưỡng, thiên tai</p>
              </li>
              <li className="py-2 first:pt-0 last:pb-0">
                <Link to={ROUTES.admin.warrantyOptions} className="ui-link font-medium">
                  Hạn bảo hành
                </Link>
                <p className="text-meta text-fg-2">Lắp đặt, Sửa chữa</p>
              </li>
              <li className="py-2 first:pt-0 last:pb-0">
                <Link to={ROUTES.admin.zones} className="ui-link font-medium">
                  Khu vực ({zones.length})
                </Link>
                <p className="text-meta text-fg-2">Địa bàn, Phường xã</p>
              </li>
              <li className="py-2 first:pt-0 last:pb-0">
                <Link to={ROUTES.admin.products} className="ui-link font-medium">
                  Sản phẩm ({totalProducts})
                </Link>
                <p className="text-meta text-fg-2">Pin, biến tần, vật tư</p>
              </li>
              <li className="py-2 first:pt-0 last:pb-0">
                <Link to={ROUTES.admin.refunds} className="ui-link font-medium">
                  Hoàn tiền
                </Link>
                <p className="text-meta text-fg-2">Ghi nhận thanh toán</p>
              </li>
              <li className="py-2 first:pt-0 last:pb-0">
                <Link to={ROUTES.admin.reports} className="ui-link font-medium">
                  Báo cáo
                </Link>
                <p className="text-meta text-fg-2">Doanh thu, Sản lượng</p>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardPage
