import { useMemo, useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { SearchInput, Select } from '@/components/common/ui/field'
import { PageHeader } from '@/components/common/ui/page-header'
import { PagedList } from '@/components/common/ui/pagination'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import {
  filterCustomerServiceRequests,
  type ServiceRequestFilterStatus,
  type ServiceRequestTimeSort,
} from '@/features/after-sales/customerAfterSalesDisplay'
import { ServiceRequestList } from '@/features/after-sales/ServiceRequestList'
import { byRequestRank, isTodo } from '@/features/after-sales/serviceDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { useMyInstallationsQuery } from '@/hooks/useCustomerInstallations'
import { useMyServiceRequestsQuery } from '@/hooks/useCustomerServiceRequests'
import { ROUTES } from '@/routes/paths'

// Mọi yêu cầu bảo hành, sửa chữa, bảo trì lẻ của khách. Gửi yêu cầu mới từ trang công trình đã bàn giao
export function CustomerAfterSalesPage() {
  const query = useMyServiceRequestsQuery()
  const installations = useMyInstallationsQuery()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ServiceRequestFilterStatus>('ALL')
  const [sort, setSort] = useState<ServiceRequestTimeSort>('ALL')

  // Tìm theo mã hợp đồng của công trình
  const projectContracts = useMemo(
    () => new Map((installations.data ?? []).map((p) => [p.projectId, shortCode(p.contractId)])),
    [installations.data],
  )
  const rows = useMemo(() => [...(query.data ?? [])].sort(byRequestRank('customer')), [query.data])
  const todo = rows.filter((r) => isTodo(r.status, 'customer')).length
  const shown = filterCustomerServiceRequests(rows, search, status, sort, projectContracts)

  return (
    <>
      <PageHeader
        title="Bảo hành, sửa chữa"
        description={
          todo > 0 ? <Badge tone="danger">{todo} yêu cầu chờ bạn duyệt báo giá hoặc nghiệm thu</Badge> : undefined
        }
        actions={
          <ButtonLink icon="construction" to={ROUTES.customer.projects} variant="info">
            Công trình của tôi
          </ButtonLink>
        }
      />
      <QueryBoundary query={query}>
        {() =>
          rows.length === 0 ? (
            <EmptyState
              title="Chưa có yêu cầu nào"
              description="Mở công trình đã bàn giao rồi bấm Báo lỗi hoặc Đặt bảo trì lẻ."
            />
          ) : (
            <>
              <div role="search" className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <label className="min-w-0 flex-1 sm:min-w-64 lg:max-w-md">
                  <span className="sr-only">Tìm theo mã yêu cầu, nội dung, hợp đồng</span>
                  <SearchInput
                    name="request-search"
                    placeholder="Tìm theo mã yêu cầu, nội dung, hợp đồng..."
                    maxLength={100}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onClear={() => setSearch('')}
                  />
                </label>
                <Select
                  aria-label="Lọc theo tình hình"
                  className="sm:w-48"
                  active={status !== 'ALL'}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ServiceRequestFilterStatus)}
                >
                  <option value="ALL">Mọi tình hình</option>
                  <option value="TODO">Chờ bạn xử lý</option>
                  <option value="IN_PROGRESS">Đang xử lý</option>
                  <option value="COMPLETED">Hoàn thành</option>
                  <option value="CANCELLED">Đã huỷ</option>
                </Select>
                <Select
                  aria-label="Sắp xếp"
                  className="sm:w-56"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as ServiceRequestTimeSort)}
                >
                  <option value="ALL">Việc chờ bạn lên đầu</option>
                  <option value="NEWEST">Gửi mới nhất trước</option>
                  <option value="OLDEST">Gửi cũ nhất trước</option>
                </Select>
              </div>
              {shown.length === 0 ? (
                <EmptyState title="Không tìm thấy yêu cầu phù hợp" />
              ) : (
                <PagedList items={shown} noun="yêu cầu">
                  {(page) => (
                    <ServiceRequestList
                      rows={page}
                      viewer="customer"
                      detailPattern={ROUTES.customer.afterSalesRequest}
                    />
                  )}
                </PagedList>
              )}
            </>
          )
        }
      </QueryBoundary>
    </>
  )
}
