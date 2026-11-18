import { Link } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { isTodo, requestKindLabel, requestStatusMeta } from '@/features/after-sales/serviceDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { withId } from '@/routes/paths'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'

// Yêu cầu bảo hành, sửa chữa của khách dạng lưới thẻ
export function CustomerServiceRequestGrid({
  rows,
  projectContracts,
  detailPattern,
}: {
  rows: ServiceRequestSummary[]
  projectContracts: Map<string, string>
  detailPattern: string
}) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => {
        const todo = isTodo(r.status, 'customer')
        const status = requestStatusMeta(r.status, 'customer')
        const to = withId(detailPattern, r.requestId)
        return (
          <li
            key={r.requestId}
            className="flex flex-col justify-between rounded-container border border-line bg-panel p-4"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={to} className="tnum block text-body font-semibold text-fg hover:underline">
                    {r.requestNumber}
                  </Link>
                  {r.description && <p className="mt-0.5 line-clamp-2 text-meta text-fg-2">{r.description}</p>}
                </div>
                <span className="shrink-0 text-meta text-fg-2">{requestKindLabel(r.kind)}</span>
              </div>
              <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t border-line pt-3 text-meta">
                <dt className="text-fg-2">Hợp đồng</dt>
                <dd className="tnum font-medium text-fg">{projectContracts.get(r.projectId) ?? '—'}</dd>
                <dt className="text-fg-2">Thời gian tạo</dt>
                <dd className="tnum text-fg">{formatMoment(r.createdAt)}</dd>
                <dt className="text-fg-2">Trạng thái</dt>
                <dd>
                  <Badge tone={todo ? 'info' : status.tone}>{status.label}</Badge>
                </dd>
              </dl>
            </div>
            <ButtonLink to={to} size="sm" variant="info" icon="visibility" className="mt-4 w-full justify-center">
              {todo ? 'Xử lý' : 'Xem'}
              <span className="sr-only"> {r.requestNumber}</span>
            </ButtonLink>
          </li>
        )
      })}
    </ul>
  )
}
