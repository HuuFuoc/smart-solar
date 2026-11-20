import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, UnavailableState } from '@/components/common/ui/states'
import { ContractKpiTile } from '@/features/contracts/ContractKpiTile'
import { CustomerContractTables } from '@/features/contracts/CustomerContractTables'
import { compactVnd } from '@/features/contracts/contractDisplay'
import { isCustomerTodo, latestPerContract } from '@/features/contracts/customerContractRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import type { ContractView } from '@/types/res/customerContractsRes'

// Hợp đồng lắp đặt của khách: mọi công trình, mọi phiên bản backend trả (kể cả bản nháp 30/70 để đọc trước khi trả 30%). Việc
// của khách (trả 30% / 70%, ký và thanh toán hợp đồng cũ) lên đầu; bản đã huỷ / đã có bản mới để nhóm riêng ở cuối.
// Ô số liệu và trạng thái dạng viên theo thiết kế danh sách hợp đồng ngày 19/11/2026 (.ct-page, chung với trang của nhân viên)

const isClosed = (c: ContractView) =>
  c.status === 'SUPERSEDED' || c.status === 'DISCARDED' || c.paymentPlan?.stage === 'DISCARDED'

const isFullyPaid = (c: ContractView) => (c.paymentPlan ? c.paymentPlan.fullyPaid : c.paymentCompleted)

const paidOf = (c: ContractView) => (c.paymentPlan ? c.paymentPlan.paid : c.paymentCompleted ? c.totalAmount : 0)

function CustomerKpis({ list }: { list: ContractView[] }) {
  // Mỗi hợp đồng một dòng (bản mới nhất), bỏ bản đã huỷ để không cộng trùng giá trị
  const live = latestPerContract(list).filter((c) => !isClosed(c))
  const todo = live.filter(isCustomerTodo).length
  const done = live.filter(isFullyPaid).length
  const value = live.reduce((sum, c) => sum + c.totalAmount, 0)
  const paid = live.reduce((sum, c) => sum + paidOf(c), 0)
  const [valueText, valueUnit] = compactVnd(value)
  const [paidText, paidUnit] = compactVnd(paid)

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <ContractKpiTile
        label="Hợp đồng của bạn"
        value={live.length}
        unit="hồ sơ"
        icon="description"
        tone="accent"
        note="Còn hiệu lực, mỗi hợp đồng tính bản mới nhất"
      />
      <ContractKpiTile
        label="Chờ bạn ký / thanh toán"
        value={todo}
        unit="hồ sơ"
        icon="error"
        tone="warn"
        valueTone={todo > 0 ? 'warn' : undefined}
        note={todo > 0 ? 'Mở hợp đồng để ký hoặc trả đợt tiếp theo' : 'Không có việc nào chờ bạn'}
      />
      <ContractKpiTile
        label="Đã trả đủ"
        value={done}
        unit="hồ sơ"
        icon="check"
        tone="ok"
        valueTone="ok"
        note={done > 0 ? 'Đã thanh toán toàn bộ giá trị' : 'Chưa có hợp đồng trả đủ'}
      />
      <ContractKpiTile
        label="Tổng giá trị hợp đồng"
        value={valueText}
        unit={valueUnit}
        icon="payments"
        tone="info"
        noteTone="neutral"
        note={`Bạn đã trả ${paidText} ${paidUnit}`}
      />
    </div>
  )
}

export function CustomerContractsPage() {
  const query = useMyContractsQuery()
  // Hợp đồng không kèm tên công trình, lấy từ yêu cầu khảo sát
  const requests = useMyRequestsQuery()
  const names = new Map(requests.data?.map((r) => [r.surveyRequestId, r.propertyName]))
  const todo = query.data ? latestPerContract(query.data).filter(isCustomerTodo).length : 0
  const syncedAt = query.dataUpdatedAt > 0 ? formatMoment(new Date(query.dataUpdatedAt).toISOString()) : null

  if (query.data === undefined && isFeatureUnavailable(query.error))
    return (
      <>
        <PageHeader title="Hợp đồng" />
        <UnavailableState
          title="Chức năng hợp đồng chưa sẵn sàng."
          message="Hợp đồng chưa mở được trên web. Thử lại sau."
          pendingMigrations={pendingMigrationsOf(query.error)}
        />
      </>
    )

  return (
    <div className="ct-page space-y-6">
      <div data-page-header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-figure font-bold">Hợp đồng</h1>
          <p className="mt-1 text-body text-fg-2">
            Theo dõi hợp đồng lắp đặt, các đợt thanh toán và tiến độ ký của bạn.
          </p>
          {todo > 0 && (
            <p className="mt-2">
              <Badge tone="danger">{todo} hợp đồng chờ bạn ký hoặc thanh toán</Badge>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            icon="refresh"
            disabled={query.isFetching}
            onClick={() => {
              void query.refetch()
              void requests.refetch()
            }}
          >
            {query.isFetching ? 'Đang tải…' : 'Làm mới'}
          </Button>
          {syncedAt && (
            <p className="flex items-center gap-1.5 text-meta text-fg-2">
              <Icon name="check_circle" className="text-[16px] text-ok" />
              <span className="tnum">Dữ liệu đồng bộ lúc: {syncedAt}</span>
            </p>
          )}
        </div>
      </div>
      <QueryBoundary query={query}>
        {(list) => {
          const rows = [...list].sort((a, b) => Number(isCustomerTodo(b)) - Number(isCustomerTodo(a)))
          return rows.length === 0 ? (
            <EmptyState
              title="Chưa có hợp đồng"
              description="Khi bạn đồng ý báo giá với kỹ thuật viên tại công trình, hợp đồng hiện ở đây để bạn đọc trước khi trả 30%."
            />
          ) : (
            <>
              <CustomerKpis list={rows} />
              <CustomerContractTables contracts={rows} propertyNames={names} />
            </>
          )
        }}
      </QueryBoundary>
    </div>
  )
}
