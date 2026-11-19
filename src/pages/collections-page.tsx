import { Link, useSearchParams } from 'react-router'
import { COLLECTION_STATUSES } from '@/common/paymentPlan'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { Select } from '@/components/common/ui/field'
import { PageHeader } from '@/components/common/ui/page-header'
import { ListPager } from '@/components/common/ui/pagination'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { collectionStatusMeta, formatVnd } from '@/features/payment-plan/paymentPlanDisplay'
import { formatDateVn, formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useCollectionsQuery } from '@/hooks/useCollections'
import { COLLECTION_ROUTES, type CollectionViewer } from '@/features/payment-plan/collectionRoutes'
import { withId } from '@/routes/paths'

// Hồ sơ thu hồi khoản quá hạn của hợp đồng 30/70 (kinh doanh, quản lý, quản trị). Backend tự mở hồ sơ khi khoản quá hạn (có thể
// chậm một lúc sau hạn), web không tự tạo. Đóng hồ sơ không có nghĩa khách đã trả; ngày hẹn trả không đổi hạn trong hợp đồng

const PAGE_SIZE = 20

type Scope = 'open' | 'all'

function CollectionsPage({ viewer }: { viewer: CollectionViewer }) {
  const [params, setParams] = useSearchParams()
  const scope: Scope = params.get('pham-vi') === 'tat-ca' ? 'all' : 'open'
  const status = params.get('trang-thai') || undefined
  const page = Math.max(1, Number(params.get('trang')) || 1)
  const query = useCollectionsQuery({ page, pageSize: PAGE_SIZE, openOnly: scope === 'open', status })
  const routes = COLLECTION_ROUTES[viewer]

  function update(change: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(change)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('trang' in change)) next.delete('trang')
    setParams(next, { replace: true })
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Thu hồi công nợ" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FilterChips<Scope>
          label="Phạm vi"
          chips={[
            { value: 'open', label: 'Đang mở' },
            { value: 'all', label: 'Tất cả' },
          ]}
          value={scope}
          onChange={(v) => update({ 'pham-vi': v === 'all' ? 'tat-ca' : null })}
        />
        <Select
          aria-label="Trạng thái hồ sơ"
          active={Boolean(status)}
          value={status ?? ''}
          onChange={(e) => update({ 'trang-thai': e.target.value || null })}
        >
          <option value="">Mọi trạng thái</option>
          {Object.entries(COLLECTION_STATUSES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
      </div>

      <QueryBoundary query={query}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState
              title={scope === 'open' ? 'Không có khoản quá hạn nào đang theo dõi' : 'Chưa có hồ sơ công nợ'}
              description="Hồ sơ được mở tự động khi khoản 70% quá hạn 72 giờ sau nghiệm thu."
            />
          ) : (
            <>
              <Table stack="xl">
                <thead>
                  <tr>
                    <Th>Hợp đồng</Th>
                    <Th>Khách</Th>
                    <Th>Khoản quá hạn</Th>
                    <Th>Trạng thái</Th>
                    <Th>
                      <span className="sr-only">Thao tác</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => {
                    const meta = collectionStatusMeta(c.status)
                    return (
                      <Tr key={c.caseId}>
                        <Td label="Hợp đồng">
                          <Link className="ui-link" to={withId(routes.contract, c.contractId)}>
                            {c.contractNumber}
                          </Link>
                          <p className="tnum text-meta text-fg-2">Mở hồ sơ {formatMoment(c.openedAt)}</p>
                        </Td>
                        <Td label="Khách">
                          {c.customerName}
                          {c.customerPhone && <p className="tnum text-meta text-fg-2">{c.customerPhone}</p>}
                        </Td>
                        <Td label="Khoản quá hạn" className="tnum">
                          {formatVnd(c.amountDue)}
                          <p className="text-meta text-fg-2">
                            Hạn {formatMoment(c.dueAt)}
                            {c.status !== 'RESOLVED' && `, quá ${c.daysOverdue} ngày`}
                          </p>
                        </Td>
                        <Td label="Trạng thái">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                          {c.promisedPaymentDate && (
                            <p className="tnum text-meta text-fg-2">Hẹn trả {formatDateVn(c.promisedPaymentDate)}</p>
                          )}
                        </Td>
                        <Td>
                          <ButtonLink size="sm" variant="info" icon="visibility" to={withId(routes.detail, c.caseId)}>
                            Xem hồ sơ
                          </ButtonLink>
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
                noun="hồ sơ"
                onChange={(p) => update({ trang: p > 1 ? String(p) : null })}
              />
            </>
          )
        }
      </QueryBoundary>
    </div>
  )
}

export function OpsCollectionsPage() {
  return <CollectionsPage viewer="sales" />
}

export function ManageCollectionsPage() {
  return <CollectionsPage viewer="manager" />
}

export function AdminCollectionsPage() {
  return <CollectionsPage viewer="admin" />
}
