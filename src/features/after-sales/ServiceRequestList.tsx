import { Link } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ButtonLink } from '@/components/common/ui/button'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { isTodo, requestKindLabel, requestStatusMeta, type ServiceViewer } from '@/features/after-sales/serviceDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { withId } from '@/routes/paths'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'

// Danh sách yêu cầu dạng bảng có cột dọc chia ngăn cách và bo viền đồng bộ
const KIND_ICONS: Record<string, string> = {
  FAULT: 'build',
  MAINTENANCE: 'verified_user',
  ONE_TIME_MAINTENANCE: 'cleaning_services',
}

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
    <div className="overflow-hidden rounded-container border border-line bg-surface-1 shadow-sm">
      <Table stack>
        <thead>
          <tr>
            <Th className="border-r border-line">Mã yêu cầu & Nội dung sự cố</Th>
            <Th className="border-r border-line">Phân loại dịch vụ</Th>
            <Th className="border-r border-line">Thời điểm tiếp nhận</Th>
            <Th className="border-r border-line">Tình hình xử lý</Th>
            <Th className="text-right">
              <span>Thao tác</span>
            </Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {rows.map((r) => {
            const status = requestStatusMeta(r.status, viewer)
            const todo = isTodo(r.status, viewer)
            const icon = KIND_ICONS[r.kind] ?? 'assignment'
            return (
              <Tr key={r.requestId} className="hover:bg-surface-2/60 transition-colors">
                <Td label="Yêu cầu" className="border-r border-line">
                  <Link
                    to={withId(detailPattern, r.requestId)}
                    className="tnum font-semibold text-fg hover:text-accent-fg hover:underline"
                  >
                    {r.requestNumber}
                  </Link>
                  <p className="mt-0.5 line-clamp-2 text-meta text-fg-3">{r.description}</p>
                </Td>
                <Td label="Loại" className="border-r border-line whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 font-medium text-fg">
                    <Icon name={icon} className="text-accent text-[16px]" aria-hidden />
                    {requestKindLabel(r.kind)}
                  </span>
                </Td>
                <Td label="Ngày gửi" className="border-r border-line tnum text-meta text-fg-2 whitespace-nowrap">
                  {formatMoment(r.createdAt)}
                </Td>
                <Td label="Tình hình" className="border-r border-line whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-meta font-medium border ${
                      todo
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        : r.status === 'COMPLETED'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                    }`}
                  >
                    <Icon
                      name={todo ? 'priority_high' : r.status === 'COMPLETED' ? 'check_circle' : 'hourglass_top'}
                      className="text-[16px]"
                      aria-hidden
                    />
                    <span>{status.label}</span>
                  </span>
                </Td>
                <Td label="Thao tác" className="text-right whitespace-nowrap">
                  <ButtonLink
                    icon={todo ? 'arrow_forward' : 'visibility'}
                    variant={todo ? 'primary' : 'info'}
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
      <div className="border-t border-line bg-surface-2/40 px-4 py-2.5 text-meta text-fg-3 flex items-center justify-between">
        <span>
          Tổng cộng <strong>{rows.length}</strong> yêu cầu dịch vụ
        </span>
        <span className="tnum">Hệ thống bảo hành SmartSolar</span>
      </div>
    </div>
  )
}
