import { Link } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { isTodo, requestKindLabel, requestStatusMeta } from '@/features/after-sales/serviceDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { withId } from '@/routes/paths'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'

// Yêu cầu bảo hành, sửa chữa của khách dạng bảng. `projectContracts`: mã hợp đồng theo công trình
export function CustomerServiceRequestTable({
  rows,
  projectContracts,
  detailPattern,
}: {
  rows: ServiceRequestSummary[]
  projectContracts: Map<string, string>
  detailPattern: string
}) {
  return (
    <Table stack aria-label="Yêu cầu bảo hành, sửa chữa">
      <thead>
        <tr>
          <Th>Mã yêu cầu</Th>
          <Th>Loại</Th>
          <Th>Hợp đồng</Th>
          <Th>Thời gian tạo</Th>
          <Th>Trạng thái</Th>
          <Th>
            <span className="sr-only">Thao tác</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          // Việc chờ khách đã báo đỏ ở đầu trang nên dòng chỉ ghi chữ
          const todo = isTodo(r.status, 'customer')
          const status = requestStatusMeta(r.status, 'customer')
          const to = withId(detailPattern, r.requestId)
          return (
            <Tr key={r.requestId}>
              <Td>
                <Link to={to} className="tnum block font-semibold text-fg hover:underline">
                  {r.requestNumber}
                </Link>
                {r.description && <p className="mt-0.5 line-clamp-1 text-meta text-fg-2">{r.description}</p>}
              </Td>
              <Td label="Loại" className="whitespace-nowrap">
                {requestKindLabel(r.kind)}
              </Td>
              <Td label="Hợp đồng" className="tnum whitespace-nowrap">
                {projectContracts.get(r.projectId) ?? '—'}
              </Td>
              <Td label="Thời gian tạo" className="tnum whitespace-nowrap">
                {formatMoment(r.createdAt)}
              </Td>
              <Td label="Trạng thái" className="whitespace-nowrap">
                <Badge tone={todo ? 'info' : status.tone}>{status.label}</Badge>
              </Td>
              <Td className="text-right">
                <ButtonLink to={to} size="sm" variant="info" icon="visibility">
                  {todo ? 'Xử lý' : 'Xem'}
                  <span className="sr-only"> {r.requestNumber}</span>
                </ButtonLink>
              </Td>
            </Tr>
          )
        })}
      </tbody>
    </Table>
  )
}
