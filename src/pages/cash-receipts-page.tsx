import { useEffect, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { PageHeader } from '@/components/common/ui/page-header'
import { ListPager } from '@/components/common/ui/pagination'
import { EmptyState, ErrorState, Skeleton, UnavailableState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { CashReceiptStatusBadge } from '@/features/cash-receipts/CashReceiptStatusBadge'
import { readErrorText } from '@/features/cash-receipts/cashReceiptDisplay'
import { receiptDetailPath, type ReceiptPortal } from '@/features/cash-receipts/cashReceiptRoutes'
import {
  readQueueFilter,
  RECEIPT_QUEUE_FILTERS,
  receiptContextLabel,
  type ReceiptQueueFilter,
} from '@/features/cash-receipts/cashReceiptRules'
import { formatVnd } from '@/features/payment-plan/paymentPlanDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useCashReceiptQueueQuery, usePendingCashReceiptCount } from '@/hooks/useCashReceipts'
import { isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'

// Phiếu thu tiền mặt kỹ thuật viên gửi (quản lý và quản trị dùng chung): mặc định là phiếu chờ xác nhận, mới nhất trước. Lọc và
// phân trang ở backend, giữ trên đường dẫn để quay lại từ trang chi tiết vẫn đúng bộ lọc, đúng trang. Hàng chờ tự tải lại khi trang
// đang mở; có phiếu mới thì báo một lần

const PAGE_SIZE = 20

const EMPTY: Record<ReceiptQueueFilter, string> = {
  SUBMITTED: 'Không có phiếu thu nào chờ xác nhận',
  ACCEPTED: 'Chưa có phiếu thu nào được xác nhận',
  REJECTED: 'Không có phiếu thu nào đang chờ bổ sung',
  ALL: 'Chưa có phiếu thu nào',
}

const pageOf = (raw: string | null) => Math.max(1, Number.parseInt(raw ?? '1', 10) || 1)

function CashReceiptsPage({ portal }: { portal: ReceiptPortal }) {
  const [params, setParams] = useSearchParams()
  const { search } = useLocation()
  const filter = readQueueFilter(params.get('trang-thai'))
  const page = pageOf(params.get('trang'))
  const query = useCashReceiptQueueQuery({ status: filter === 'ALL' ? null : filter, page, pageSize: PAGE_SIZE })
  const pending = usePendingCashReceiptCount().data
  const lastPending = useRef<number | undefined>(undefined)

  // Số phiếu chờ tăng trong lúc đang mở trang: báo một lần (lần đọc đầu không báo, lần hỏi lại không đổi số thì không báo)
  useEffect(() => {
    const before = lastPending.current
    lastPending.current = pending
    if (before !== undefined && pending !== undefined && pending > before)
      toast.info(
        pending - before > 1 ? `Có ${pending - before} phiếu thu mới chờ xác nhận.` : 'Có phiếu thu mới chờ xác nhận.',
      )
  }, [pending])

  const setFilter = (next: ReceiptQueueFilter) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('trang-thai', next)
        p.delete('trang')
        return p
      },
      { replace: true },
    )
  const goPage = (next: number) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      p.set('trang', String(next))
      return p
    })

  const chips = RECEIPT_QUEUE_FILTERS.map((f) =>
    f.value === 'SUBMITTED' ? { ...f, count: pending, attention: true } : { ...f },
  )
  const data = query.data

  return (
    <>
      <PageHeader title="Phiếu thu tiền mặt" />
      <div className="space-y-4">
        <FilterChips label="Lọc theo trạng thái phiếu thu" chips={chips} value={filter} onChange={setFilter} />
        {query.isPending ? (
          <Skeleton className="h-64" />
        ) : !data ? (
          isFeatureUnavailable(query.error) ? (
            <UnavailableState
              title="Phiếu thu tiền mặt tạm thời chưa dùng được."
              message={readErrorText(query.error)}
              pendingMigrations={pendingMigrationsOf(query.error)}
            />
          ) : (
            <ErrorState
              title="Không tải được phiếu thu tiền mặt."
              message={readErrorText(query.error)}
              onRetry={() => void query.refetch()}
            />
          )
        ) : data.items.length === 0 ? (
          <EmptyState title={EMPTY[filter]} />
        ) : (
          <>
            <Table stack="xl" aria-busy={query.isFetching || undefined}>
              <thead>
                <tr>
                  <Th>Số phiếu thu</Th>
                  <Th>Hợp đồng, khoản</Th>
                  <Th>Khách hàng</Th>
                  <Th className="text-right">Số tiền</Th>
                  <Th>Kỹ thuật viên</Th>
                  <Th>Thời gian</Th>
                  <Th>Trạng thái</Th>
                  <Th>
                    <span className="sr-only">Thao tác</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => {
                  const r = row.receipt
                  const reviewable = r.status === 'SUBMITTED'
                  return (
                    <Tr key={r.cashReceiptId}>
                      <Td label="Số phiếu thu" className="tnum font-medium whitespace-nowrap text-fg">
                        {r.receiptNumber}
                      </Td>
                      <Td label="Hợp đồng, khoản">
                        <p className="tnum text-fg">{row.contractNumber || '—'}</p>
                        <p className="text-meta text-fg-2">{receiptContextLabel(row)}</p>
                      </Td>
                      <Td label="Khách hàng">{row.customerName}</Td>
                      <Td label="Số tiền" className="tnum font-medium text-fg xl:text-right">
                        {formatVnd(r.amount)}
                      </Td>
                      <Td label="Kỹ thuật viên">{row.collectedByName}</Td>
                      <Td label="Thời gian" className="tnum text-meta whitespace-nowrap text-fg-2">
                        <p>Thu lúc {formatMoment(r.collectedAt)}</p>
                        <p>Gửi lúc {formatMoment(r.submittedAt)}</p>
                      </Td>
                      <Td label="Trạng thái">
                        <CashReceiptStatusBadge status={r.status} />
                        {r.reviewedAt && (
                          <p className="tnum text-meta text-fg-2">Xét lúc {formatMoment(r.reviewedAt)}</p>
                        )}
                      </Td>
                      <Td>
                        <div className="flex xl:justify-end">
                          <ButtonLink
                            size="sm"
                            icon={reviewable ? 'fact_check' : 'visibility'}
                            variant="info"
                            to={receiptDetailPath(portal, r.cashReceiptId)}
                            state={{ queueSearch: search }}
                          >
                            {reviewable ? 'Xét duyệt' : 'Xem'}
                            <span className="sr-only"> phiếu thu {r.receiptNumber}</span>
                          </ButtonLink>
                        </div>
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
            <ListPager
              page={data.page}
              pages={data.totalPages}
              from={(data.page - 1) * data.pageSize + 1}
              to={(data.page - 1) * data.pageSize + data.items.length}
              total={data.totalItems}
              noun="phiếu thu"
              onChange={goPage}
            />
          </>
        )}
      </div>
    </>
  )
}

export function ManageCashReceiptsPage() {
  return <CashReceiptsPage portal="manager" />
}

export function AdminCashReceiptsPage() {
  return <CashReceiptsPage portal="admin" />
}
