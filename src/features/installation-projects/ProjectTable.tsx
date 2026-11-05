import { Link } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatInterval, projectStatusMeta } from '@/features/installation-projects/projectDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { withId } from '@/routes/paths'
import type { InstallationProjectSummary } from '@/types/res/managerInstallationsRes'

// Danh sách dự án thi công kèm đường kẻ cột dọc và định dạng thẻ trực quan
const STATUS_BADGE_STYLE: Record<
  string,
  { bg: string; text: string; border: string; dot: string; icon: string }
> = {
  PENDING_ASSIGNMENT: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
    dot: 'bg-rose-500',
    icon: 'person_search',
  },
  PENDING_TECHNICIAN_ACCEPTANCE: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    icon: 'hourglass_top',
  },
  SCHEDULED: {
    bg: 'bg-teal-500/15',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-500/30',
    dot: 'bg-teal-500',
    icon: 'calendar_month',
  },
  IN_PROGRESS: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
    icon: 'engineering',
  },
  PENDING_CUSTOMER_ACCEPTANCE: {
    bg: 'bg-purple-500/15',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
    dot: 'bg-purple-500',
    icon: 'fact_check',
  },
  REWORK_REQUIRED: {
    bg: 'bg-orange-500/15',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/30',
    dot: 'bg-orange-500',
    icon: 'build_circle',
  },
  COMPLETED: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    icon: 'verified',
  },
  CANCELLED: {
    bg: 'bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
    icon: 'cancel',
  },
}

function Technician({ row }: { row: InstallationProjectSummary }) {
  if (!row.responsibleTechnicianUserId) return <span className="text-fg-3 italic">Chưa xếp</span>
  return (
    <>
      <p className="font-medium text-fg flex items-center gap-1.5">
        <Icon name="engineering" className="text-accent text-[16px]" aria-hidden />
        {row.responsibleTechnicianName || 'Kỹ thuật viên'}
      </p>
      <p className="text-meta text-fg-2">
        {row.technicianAccepted ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Đã nhận việc</span>
        ) : (
          <span className="text-amber-600 dark:text-amber-400">Chờ nhận việc</span>
        )}
      </p>
    </>
  )
}

export function ProjectTable({ rows, detailPattern }: { rows: InstallationProjectSummary[]; detailPattern: string }) {
  return (
    <div className="overflow-hidden rounded-container border border-line bg-surface-1 shadow-sm">
      <Table stack>
        <thead>
          <tr>
            <Th className="border-r border-line">Dự án</Th>
            <Th className="border-r border-line">Trạng thái thi công</Th>
            <Th className="border-r border-line">Kỹ thuật viên</Th>
            <Th className="border-r border-line">Lịch thi công</Th>
            <th>Hợp đồng gốc</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {rows.map((p) => {
            const status = projectStatusMeta(p.status)
            const style = STATUS_BADGE_STYLE[p.status] ?? {
              bg: 'bg-surface-2',
              text: 'text-fg-2',
              border: 'border-line',
              dot: 'bg-fg-3',
              icon: 'schedule',
            }
            return (
              <Tr key={p.projectId} className="group relative cursor-pointer hover:bg-surface-2/60 transition-colors">
                <Td label="Dự án" className="border-r border-line">
                  <Link
                    to={withId(detailPattern, p.projectId)}
                    className="tnum font-semibold text-fg underline-offset-4 after:absolute after:inset-0 group-hover:text-accent-fg group-hover:underline"
                  >
                    Dự án {shortCode(p.projectId)}
                  </Link>
                  <p className="tnum text-meta text-fg-2 mt-0.5">Tạo lúc {formatMoment(p.createdAt)}</p>
                </Td>
                <Td label="Trạng thái" className="border-r border-line whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-meta font-medium border ${style.bg} ${style.text} ${style.border}`}
                  >
                    <Icon name={style.icon} className="text-[16px]" aria-hidden />
                    <span>{status.label}</span>
                  </span>
                </Td>
                <Td label="Kỹ thuật viên" className="border-r border-line">
                  <Technician row={p} />
                </Td>
                <Td label="Lịch thi công" className="border-r border-line tnum">
                  {p.scheduledStartsAt ? (
                    <span className="font-medium text-fg">{formatInterval(p.scheduledStartsAt, p.scheduledEndsAt)}</span>
                  ) : (
                    <span className="text-fg-3 italic">Chưa xếp lịch</span>
                  )}
                </Td>
                <Td label="Hợp đồng" className="tnum font-mono text-meta text-fg-2">
                  {shortCode(p.contractId)}
                </Td>
              </Tr>
            )
          })}
        </tbody>
      </Table>
      <div className="border-t border-line bg-surface-2/40 px-4 py-2.5 text-meta text-fg-3 flex items-center justify-between">
        <span>Hiển thị <strong>{rows.length}</strong> dự án thi công</span>
        <span className="tnum">SmartSolar Field Operations</span>
      </div>
    </div>
  )
}
