import { Link } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { isTodo, requestKindLabel, requestStatusMeta, type ServiceViewer } from '@/features/after-sales/serviceDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { withId } from '@/routes/paths'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'

// Yêu cầu bảo hành, sửa chữa, bảo trì: mỗi yêu cầu một dòng. Trạng thái là chữ có màu theo vai trò (đỏ = việc của
// người đang xem); nút trên dòng không đặc
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
    <Table stack>
      <thead>
        <tr>
          <Th>Yêu cầu</Th>
          <Th>Loại</Th>
          <Th>Ngày gửi</Th>
          <Th>Tình hình</Th>
          <Th>
            <span className="sr-only">Thao tác</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const status = requestStatusMeta(r.status, viewer)
          const todo = isTodo(r.status, viewer)
          return (
            <Tr key={r.requestId}>
              <Td label="Yêu cầu">
                <Link to={withId(detailPattern, r.requestId)} className="tnum font-semibold text-fg hover:underline">
                  {r.requestNumber}
                </Link>
                {r.description && <p className="mt-0.5 line-clamp-2 text-meta text-fg-2">{r.description}</p>}
              </Td>
              <Td label="Loại">{requestKindLabel(r.kind)}</Td>
              <Td label="Ngày gửi" className="tnum whitespace-nowrap text-fg-2">
                {formatMoment(r.createdAt)}
              </Td>
              <Td label="Tình hình">
                <Badge tone={status.tone}>{status.label}</Badge>
              </Td>
              <Td className="lg:text-right">
                <ButtonLink
                  icon={todo ? 'arrow_forward' : 'visibility'}
                  variant="info"
                  to={withId(detailPattern, r.requestId)}
                  size="sm"
                >
                  {todo ? 'Xử lý' : 'Xem'}
                </ButtonLink>
              </Td>
            </Tr>
          )
        })}
      </tbody>
    </Table>
  )
}
