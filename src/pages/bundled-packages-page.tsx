import { useState } from 'react'
import { Link } from 'react-router'
import { BUNDLED_PACKAGE_STATUS_ORDER } from '@/common/servicePackages'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { PageHeader } from '@/components/common/ui/page-header'
import { Pagination } from '@/components/common/ui/pagination'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { subscriptionStatusMeta } from '@/features/after-sales/afterSalesDisplay'
import { BundledPackageDialog } from '@/features/after-sales/BundledPackageDialog'
import { bundledKindLabel, bundledStatusMeta } from '@/features/after-sales/servicePackageDisplay'
import { formatVnd } from '@/features/payment-plan/paymentPlanDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useCachedContractNumbers } from '@/hooks/useContracts'
import { useBundledPackagesQuery } from '@/hooks/useManagerAfterSales'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { BundledPackageView } from '@/types/res/managerAfterSalesRes'

// Gói dịch vụ đi kèm hợp đồng lắp đặt (backend 763cb0b, quản lý và quản trị): mỗi gói là cam kết trong hợp đồng, được trả trong hai
// khoản 30/70 và chỉ thành kỳ gói khi hợp đồng đã trả đủ, đã bàn giao và số tấm pin đã lắp khớp hợp đồng. Lọc và phân trang ở server.
// Chờ đối soát là việc của quản lý: sửa sổ thiết bị đã lắp rồi đối soát lại trong hộp chi tiết

const PAGE_SIZE = 20

type Filter = (typeof BUNDLED_PACKAGE_STATUS_ORDER)[number] | 'ALL'

const CHIPS: { value: Filter; label: string }[] = [
  ...BUNDLED_PACKAGE_STATUS_ORDER.map((status) => ({ value: status, label: bundledStatusMeta(status, 'staff').label })),
  { value: 'ALL', label: 'Tất cả' },
]

const EMPTY: Record<Filter, string> = {
  RECONCILIATION_REQUIRED: 'Không có gói nào chờ đối soát',
  COMMITTED: 'Không có gói nào đang chờ hợp đồng trả đủ và bàn giao',
  PROVISIONED: 'Chưa có gói đi kèm nào được tạo',
  DISCARDED: 'Không có gói nào bị huỷ',
  ALL: 'Chưa có hợp đồng nào có gói dịch vụ đi kèm',
}

function BundledPackagesPage({ contractPattern }: { contractPattern: string }) {
  const [filter, setFilter] = useState<Filter>('RECONCILIATION_REQUIRED')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<BundledPackageView | null>(null)
  const query = useBundledPackagesQuery({ status: filter === 'ALL' ? '' : filter, page, pageSize: PAGE_SIZE })
  const data = query.data
  const contractHref = (contractId: string) => withId(contractPattern, contractId)
  // Số hợp đồng thật khi hợp đồng đã được mở (cache); còn lại là mã rút gọn, không gọi API cho từng dòng
  const numbers = useCachedContractNumbers(data?.items.map((p) => p.contractId) ?? [])

  return (
    <>
      <PageHeader title="Gói dịch vụ đi kèm hợp đồng" />
      <div className="space-y-4">
        <FilterChips
          label="Lọc theo trạng thái"
          chips={CHIPS}
          value={filter}
          onChange={(next) => {
            setFilter(next)
            setPage(1)
          }}
        />
        {query.isPending ? (
          <Skeleton className="h-64" />
        ) : !data ? (
          <ErrorState
            title="Không tải được gói đi kèm hợp đồng."
            message={errorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : data.items.length === 0 ? (
          <EmptyState title={EMPTY[filter]} />
        ) : (
          <>
            <Table stack aria-busy={query.isFetching || undefined}>
              <thead>
                <tr>
                  <Th>Hợp đồng</Th>
                  <Th>Gói</Th>
                  <Th className="text-right">Số tấm pin</Th>
                  <Th className="text-right">Thành tiền</Th>
                  <Th>Trạng thái</Th>
                  <Th>Gói đã tạo</Th>
                  <Th>
                    <span className="sr-only">Thao tác</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => {
                  const status = bundledStatusMeta(p.status, 'staff')
                  return (
                    <Tr key={p.commitmentId}>
                      <Td label="Hợp đồng" className="tnum">
                        <Link to={contractHref(p.contractId)} className="ui-link">
                          {numbers.get(p.contractId) ?? shortCode(p.contractId)}
                        </Link>
                      </Td>
                      <Td label="Gói">
                        <p className="font-medium text-fg">{p.packageName}</p>
                        <p className="text-meta text-fg-2">
                          {bundledKindLabel(p.kind)}, {formatVnd(p.unitPrice)}/tấm pin
                        </p>
                      </Td>
                      <Td label="Số tấm pin" className="tnum lg:text-right">
                        {p.quantity.toLocaleString('vi-VN')}
                      </Td>
                      <Td label="Thành tiền" className="tnum lg:text-right">
                        <span className="font-medium text-fg">{formatVnd(p.totalAmount)}</span>
                        <p className="text-meta text-fg-2">
                          Đợt 1 {formatVnd(p.depositAllocation)}, đợt 2 {formatVnd(p.balanceAllocation)}
                        </p>
                      </Td>
                      <Td label="Trạng thái">
                        <Badge tone={status.tone}>{status.label}</Badge>
                        {p.statusChangedAt && (
                          <p className="tnum text-meta text-fg-2">{formatMoment(p.statusChangedAt)}</p>
                        )}
                      </Td>
                      <Td label="Gói đã tạo">
                        {p.subscriptionStatus ? (
                          <>
                            <span className="text-fg">{subscriptionStatusMeta(p.subscriptionStatus).label}</span>
                            {p.startsAt && (
                              <p className="tnum text-meta text-fg-2">
                                {formatMoment(p.startsAt)} đến {formatMoment(p.endsAt)}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-fg-2">Chưa tạo</span>
                        )}
                      </Td>
                      <Td>
                        <div className="flex lg:justify-end">
                          <Button
                            icon={p.status === 'RECONCILIATION_REQUIRED' ? 'fact_check' : 'visibility'}
                            size="sm"
                            variant="info"
                            onClick={() => setOpen(p)}
                          >
                            {p.status === 'RECONCILIATION_REQUIRED' ? 'Đối soát' : 'Xem'}
                            <span className="sr-only"> {p.packageName}</span>
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="tnum text-meta text-fg-2">{data.totalItems.toLocaleString('vi-VN')} gói</p>
              {data.totalPages > 1 && <Pagination page={data.page} pages={data.totalPages} onChange={setPage} />}
            </div>
          </>
        )}
      </div>
      <BundledPackageDialog item={open} contractHref={contractHref} onClose={() => setOpen(null)} />
    </>
  )
}

export function ManageBundledPackagesPage() {
  return <BundledPackagesPage contractPattern={ROUTES.manage.contract} />
}

export function AdminBundledPackagesPage() {
  return <BundledPackagesPage contractPattern={ROUTES.admin.contract} />
}
