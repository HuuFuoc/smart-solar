import { Link } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatInterval, projectStatusMeta } from '@/features/installation-projects/projectDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { withId } from '@/routes/paths'
import type { InstallationProjectSummary } from '@/types/res/managerInstallationsRes'

// Danh sách dự án thi công. Bản tóm tắt của backend không có tên công trình, khách hay số hợp đồng,
// nên dòng chỉ ghi mã; mở chi tiết để xem công trình

const TAG_TONES = ['ok', 'info', 'warn', 'danger'] as const

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

/** Số ngày thi công ước tính theo khung giờ đã xếp, làm tròn lên */
const estimatedDays = (startsAt: string, endsAt: string | null) => {
  if (!endsAt) return null
  const days = Math.ceil((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 86_400_000)
  return days > 0 ? days : null
}

function Technician({ row }: { row: InstallationProjectSummary }) {
  if (!row.responsibleTechnicianUserId) return <span className="text-fg-3">Chưa có</span>
  const name = row.responsibleTechnicianName || 'Kỹ thuật viên'
  return (
    <span className="flex items-center gap-3">
      <span className="sv-avatar-sm" aria-hidden>
        {initials(name)}
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-fg">{name}</span>
        <span className="sv-tag mt-0.5" data-tone={row.technicianAccepted ? 'ok' : 'neutral'}>
          {row.technicianAccepted ? 'Đã nhận việc' : 'Chưa nhận việc'}
        </span>
      </span>
    </span>
  )
}

export function ProjectTable({ rows, detailPattern }: { rows: InstallationProjectSummary[]; detailPattern: string }) {
  return (
    <Table stack>
      <thead>
        <tr>
          <Th>Dự án</Th>
          <Th>Trạng thái</Th>
          <Th>Kỹ thuật viên phụ trách</Th>
          <Th>Lịch thi công</Th>
          <Th>Hợp đồng</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => {
          const status = projectStatusMeta(p.status)
          const live = p.status === 'IN_PROGRESS'
          const days = p.scheduledStartsAt ? estimatedDays(p.scheduledStartsAt, p.scheduledEndsAt) : null
          return (
            <Tr key={p.projectId} className="group relative cursor-pointer" data-live={live}>
              <Td label="Dự án">
                <span className="flex items-center gap-3">
                  <span className="sv-stat-icon size-10! shrink-0" data-tone={live ? 'ok' : 'neutral'} aria-hidden>
                    <Icon name={live ? 'bolt' : 'apartment'} className="text-[20px]" />
                  </span>
                  <span className="min-w-0">
                    <Link
                      to={withId(detailPattern, p.projectId)}
                      className="tnum font-semibold text-fg underline-offset-4 after:absolute after:inset-0 group-hover:text-accent-fg group-hover:underline"
                    >
                      Dự án {shortCode(p.projectId)}
                    </Link>
                    <span className="tnum mt-0.5 block text-meta text-fg-2">Tạo lúc {formatMoment(p.createdAt)}</span>
                  </span>
                </span>
              </Td>
              <Td label="Trạng thái" className="whitespace-nowrap">
                <span
                  className="sv-tag"
                  data-tone={TAG_TONES.find((t) => t === status.tone) ?? 'neutral'}
                  data-shape="pill"
                >
                  {status.label}
                </span>
              </Td>
              <Td label="Kỹ thuật viên">
                <Technician row={p} />
              </Td>
              <Td label="Lịch thi công" className="tnum">
                {p.scheduledStartsAt ? (
                  <>
                    <span className="font-medium text-fg">
                      {formatInterval(p.scheduledStartsAt, p.scheduledEndsAt)}
                    </span>
                    {days !== null && (
                      <span className={live ? 'mt-0.5 block text-meta text-ok' : 'mt-0.5 block text-meta text-fg-3'}>
                        Thời lượng ước tính: {days} ngày{live ? ' (Đang tiến hành)' : ''}
                      </span>
                    )}
                  </>
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
