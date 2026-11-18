import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { SearchInput, Select } from '@/components/common/ui/field'
import { PageHeader } from '@/components/common/ui/page-header'
import { PagedList } from '@/components/common/ui/pagination'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { Segmented } from '@/components/common/ui/segmented'
import { EmptyState } from '@/components/common/ui/states'
import {
  filterCustomerServiceRequests,
  type ServiceRequestFilterStatus,
  type ServiceRequestTimeSort,
} from '@/features/after-sales/customerAfterSalesDisplay'
import { CustomerServiceRequestGrid } from '@/features/after-sales/CustomerServiceRequestGrid'
import { CustomerServiceRequestTable } from '@/features/after-sales/CustomerServiceRequestTable'
import { FaultReportFlow } from '@/features/after-sales/FaultReportFlow'
import { handedOverProjects } from '@/features/after-sales/customerServiceRules'
import { Notice } from '@/components/common/ui/lists'
import { byRequestRank, isTodo } from '@/features/after-sales/serviceDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { useMyInstallationsQuery } from '@/hooks/useCustomerInstallations'
import { useMyServiceRequestsQuery } from '@/hooks/useCustomerServiceRequests'
import { ROUTES } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'

// Mọi yêu cầu bảo hành, sửa chữa, bảo trì lẻ của khách. "Báo lỗi" mở thẳng hộp báo lỗi cho công trình đã bàn giao (trang Tổng
// quan dẫn tới đây với ?bao-loi=1); đặt bảo trì lẻ vẫn ở trang công trình
export function CustomerAfterSalesPage() {
  const query = useMyServiceRequestsQuery()
  const installations = useMyInstallationsQuery()
  const [params, setParams] = useSearchParams()
  const [reporting, setReporting] = useState(false)
  const handed = handedOverProjects(installations.data ?? [])
  const askedToReport = params.get('bao-loi') === '1'
  // Tới từ nút "Báo lỗi" ở trang khác: mở hộp ngay khi đã biết công trình nào bàn giao
  if (askedToReport && installations.data && handed.length > 0 && !reporting) {
    setReporting(true)
    setParams({}, { replace: true })
  }
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ServiceRequestFilterStatus>('ALL')
  const [sort, setSort] = useState<ServiceRequestTimeSort>('ALL')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [syncing, setSyncing] = useState(false)

  async function sync() {
    setSyncing(true)
    try {
      await Promise.all([query.refetch({ throwOnError: true }), installations.refetch({ throwOnError: true })])
      toast.success('Đã cập nhật tiến độ các yêu cầu.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSyncing(false)
    }
  }

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
          <>
            {handed.length > 0 && (
              <Button variant="danger" icon="report" onClick={() => setReporting(true)}>
                Báo lỗi
              </Button>
            )}
            <Button variant="secondary" icon="sync" disabled={syncing} onClick={() => void sync()}>
              {syncing ? 'Đang đồng bộ…' : 'Đồng bộ tiến độ'}
            </Button>
            <ButtonLink icon="construction" to={ROUTES.customer.projects} variant="info">
              Công trình của tôi
            </ButtonLink>
          </>
        }
      />
      {askedToReport && installations.data && handed.length === 0 && (
        <Notice tone="warn" className="mb-4" title="Chưa có công trình đã bàn giao">
          Chỉ báo lỗi được cho công trình đã bàn giao. Công trình đang lắp mà có vấn đề thì ghi ở bước nghiệm thu, kỹ
          thuật viên sẽ làm lại.
        </Notice>
      )}
      {reporting && <FaultReportFlow projects={handed} onClose={() => setReporting(false)} />}
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
                <Segmented
                  label="Cách xem"
                  className="sm:ml-auto"
                  value={viewMode}
                  onChange={setViewMode}
                  options={[
                    { value: 'table', label: 'Bảng', icon: 'format_list_bulleted' },
                    { value: 'grid', label: 'Lưới', icon: 'grid_view' },
                  ]}
                />
              </div>
              {shown.length === 0 ? (
                <EmptyState
                  title="Không tìm thấy yêu cầu phù hợp"
                  description="Thử đổi bộ lọc hoặc từ khoá tìm kiếm khác."
                />
              ) : (
                <PagedList items={shown} noun="yêu cầu">
                  {(page) =>
                    viewMode === 'table' ? (
                      <CustomerServiceRequestTable
                        rows={page}
                        projectContracts={projectContracts}
                        detailPattern={ROUTES.customer.afterSalesRequest}
                      />
                    ) : (
                      <CustomerServiceRequestGrid
                        rows={page}
                        projectContracts={projectContracts}
                        detailPattern={ROUTES.customer.afterSalesRequest}
                      />
                    )
                  }
                </PagedList>
              )}
            </>
          )
        }
      </QueryBoundary>
    </>
  )
}
