import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, UnavailableState } from '@/components/common/ui/states'
import {
  contractStatusMeta,
  formatContractMoney,
  versionLabel,
  warrantyText,
} from '@/features/contracts/contractDisplay'
import { customerContractNext } from '@/features/contracts/customerContractDisplay'
import { isCustomerTodo, latestPerContract } from '@/features/contracts/customerContractRules'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { ROUTES, withId } from '@/routes/paths'
import { isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'

// Hợp đồng lắp đặt của khách, mỗi số hợp đồng một dòng (phiên bản mới nhất). Việc của khách (ký, ký lại, thanh toán) lên đầu.
// Khách chỉ thấy hợp đồng từ lúc kinh doanh gửi ký
export function CustomerContractsPage() {
  const query = useMyContractsQuery()
  // Hợp đồng không kèm tên công trình, lấy từ yêu cầu khảo sát
  const requests = useMyRequestsQuery()
  const names = new Map(requests.data?.map((r) => [r.surveyRequestId, r.propertyName]))
  const todo = query.data ? latestPerContract(query.data).filter(isCustomerTodo).length : 0

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
    <>
      <PageHeader
        title="Hợp đồng"
        description={
          todo > 0 ? (
            <Badge tone="danger" icon="draw">
              {todo} hợp đồng chờ bạn ký hoặc thanh toán
            </Badge>
          ) : undefined
        }
      />
      <QueryBoundary query={query}>
        {(list) => {
          const rows = latestPerContract(list)
          return rows.length === 0 ? (
            <EmptyState
              title="Chưa có hợp đồng"
              description="Hợp đồng hiện ở đây khi bạn đồng ý báo giá và Smart Solar gửi hợp đồng để ký."
              action={
                <ButtonLink to={ROUTES.customer.quotations} variant="info" icon="visibility">
                  Xem báo giá
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((c) => {
                const status = contractStatusMeta(c.status, 'customer')
                const next = customerContractNext(c)
                return (
                  <ListRow key={c.contractId}>
                    <div className="grid gap-x-8 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0">
                        <h2 className="text-title font-semibold">
                          {names.get(c.surveyRequestId) || `Hợp đồng ${c.contractNumber}`}
                        </h2>
                        <p className="tnum mt-1 text-body text-fg-2">
                          Số {c.contractNumber}, {versionLabel(c).toLowerCase()}, gửi ký {formatMoment(c.publishedAt)}
                        </p>
                        <p className="tnum mt-2 text-body text-fg">
                          <span className="font-semibold">{formatContractMoney(c)}</span>
                          <span className="text-fg-2">, bảo hành lắp đặt {warrantyText(c.warrantyMonths)}</span>
                        </p>
                        {next.tone === 'danger' && <p className="mt-1 text-body text-fg">{next.title}.</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                        <Badge tone={next.tone === 'danger' ? 'danger' : status.tone}>{status.label}</Badge>
                        <ButtonLink
                          icon="visibility"
                          to={withId(ROUTES.customer.contract, c.contractId)}
                          size="sm"
                          variant="info"
                        >
                          Xem hợp đồng
                        </ButtonLink>
                      </div>
                    </div>
                  </ListRow>
                )
              })}
            </ul>
          )
        }}
      </QueryBoundary>
    </>
  )
}
