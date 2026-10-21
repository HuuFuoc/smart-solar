import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import { isTodo, requestKindLabel, requestStatusMeta, type ServiceViewer } from '@/features/after-sales/serviceDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { withId } from '@/routes/paths'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'

// Danh sách yêu cầu dạng cột, khách và quản lý dùng chung. `detailPattern` là đường dẫn chi tiết có ":id"

const COLUMNS = 'lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_8rem]'
const LABELS = ['Yêu cầu', 'Loại', 'Ngày gửi', 'Tình hình', '']

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
      <ListHead columns={COLUMNS} labels={LABELS} />
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const status = requestStatusMeta(r.status, viewer)
          return (
            <ListRow key={r.requestId}>
              <ListCells columns={COLUMNS}>
                <ListCell wide>
                  <p className="tnum font-semibold">{r.requestNumber}</p>
                  <p className="mt-0.5 line-clamp-2 text-meta text-fg-2">{r.description}</p>
                </ListCell>
                <ListCell label="Loại">{requestKindLabel(r.kind)}</ListCell>
                <ListCell label="Ngày gửi" className="tnum">
                  {formatMoment(r.createdAt)}
                </ListCell>
                <ListCell label="Tình hình">
                  <Badge tone={status.tone}>{status.label}</Badge>
                </ListCell>
                <ListCell wide className="lg:justify-self-end">
                  <ButtonLink
                    icon={isTodo(r.status, viewer) ? 'arrow_forward' : 'visibility'}
                    variant="info"
                    to={withId(detailPattern, r.requestId)}
                    size="sm"
                  >
                    {isTodo(r.status, viewer) ? 'Xử lý' : 'Xem'}
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
