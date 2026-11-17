import { Link } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import { isTodo, requestKindLabel, requestStatusMeta, type ServiceViewer } from '@/features/after-sales/serviceDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { withId } from '@/routes/paths'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'

// Danh sách yêu cầu dạng cột của khách, quản lý, quản trị. `detailPattern` là đường dẫn chi tiết có ":id"

const COLUMNS = 'lg:grid-cols-[minmax(0,2.6fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_7rem]'
const LABELS = ['Yêu cầu', 'Loại', 'Ngày gửi', 'Tình hình', 'Thao tác']

export function ServiceRequestList({
  rows,
  viewer,
  detailPattern,
}: {
  rows: ServiceRequestSummary[]
  viewer: ServiceViewer
  detailPattern: string
}) {
  return (
    <div>
      <div className="bg-surface-2 px-4">
        <ListHead columns={COLUMNS} labels={LABELS} />
      </div>
      <ul className="divide-y divide-line border-t border-line px-4">
        {rows.map((r) => {
          const status = requestStatusMeta(r.status, viewer)
          const todo = isTodo(r.status, viewer)
          const to = withId(detailPattern, r.requestId)
          const when = formatMoment(r.createdAt)
          return (
            <ListRow key={r.requestId}>
              <ListCells columns={COLUMNS}>
                <ListCell wide>
                  <Link to={to} className="tnum font-semibold text-fg hover:underline">
                    {r.requestNumber}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-body text-fg-2">{r.description}</p>
                </ListCell>
                <ListCell label="Loại">{requestKindLabel(r.kind)}</ListCell>
                <ListCell label="Ngày gửi" className="tnum">
                  {when.slice(0, 10)} <span className="text-fg-2">{when.slice(11)}</span>
                </ListCell>
                <ListCell label="Tình hình">
                  <Badge tone={status.tone}>{status.label}</Badge>
                </ListCell>
                <ListCell wide className="lg:justify-self-end">
                  <ButtonLink icon="visibility" variant="info" to={to} size="sm">
                    {todo ? 'Xử lý' : 'Xem'}
                    <span className="sr-only"> {r.requestNumber}</span>
                  </ButtonLink>
                </ListCell>
              </ListCells>
            </ListRow>
          )
        })}
      </ul>
    </div>
  )
}
