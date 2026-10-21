import { Link } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatInterval, projectStatusMeta } from '@/features/installation-projects/projectDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { withId } from '@/routes/paths'
import type { InstallationProjectSummary } from '@/types/res/managerInstallationsRes'

// Danh sách dự án thi công. Bản tóm tắt của backend không có tên công trình, khách hay số hợp đồng,
// nên dòng chỉ ghi mã; mở chi tiết để xem công trình

function Technician({ row }: { row: InstallationProjectSummary }) {
  if (!row.responsibleTechnicianUserId) return <span className="text-fg-3">Chưa có</span>
  return (
    <>
      <p className="text-fg">{row.responsibleTechnicianName || 'Kỹ thuật viên'}</p>
      <p className="text-meta text-fg-2">{row.technicianAccepted ? 'Đã nhận việc' : 'Chưa nhận việc'}</p>
    </>
  )
}

export function ProjectTable({ rows, detailPattern }: { rows: InstallationProjectSummary[]; detailPattern: string }) {
  return (
    <Table stack>
      <thead>
        <tr>
          <Th>Dự án</Th>
          <Th>Trạng thái</Th>
          <Th>Kỹ thuật viên</Th>
          <Th>Lịch thi công</Th>
          <Th>Hợp đồng</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => {
          const status = projectStatusMeta(p.status)
          return (
            <Tr key={p.projectId} className="group relative cursor-pointer">
              <Td label="Dự án">
                <Link
                  to={withId(detailPattern, p.projectId)}
                  className="tnum font-medium text-fg underline-offset-4 after:absolute after:inset-0 group-hover:text-accent-fg group-hover:underline"
                >
                  Dự án {shortCode(p.projectId)}
                </Link>
                <p className="tnum text-meta text-fg-2">Tạo lúc {formatMoment(p.createdAt)}</p>
              </Td>
              <Td label="Trạng thái">
                <Badge tone={status.tone}>{status.label}</Badge>
              </Td>
              <Td label="Kỹ thuật viên">
                <Technician row={p} />
              </Td>
              <Td label="Lịch thi công" className="tnum">
                {p.scheduledStartsAt ? (
                  formatInterval(p.scheduledStartsAt, p.scheduledEndsAt)
                ) : (
                  <span className="text-fg-3">Chưa xếp lịch</span>
                )}
              </Td>
              <Td label="Hợp đồng" className="tnum">
                {shortCode(p.contractId)}
              </Td>
            </Tr>
          )
        })}
      </tbody>
    </Table>
  )
}
