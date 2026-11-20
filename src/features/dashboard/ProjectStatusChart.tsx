import { ChartPanel } from '@/components/common/charts/ChartPanel'
import { ORDINAL, STATUS_COLOR, formatCount } from '@/components/common/charts/chartTheme'
import { DonutChart } from '@/components/common/charts/DonutChart'
import { INSTALLATION_STATUS_LABELS } from '@/common/installation'
import { countProjectGroups, type ProjectGroupKey } from '@/features/dashboard/projectGroups'

// Dự án thi công theo nhóm trạng thái (hiện tại). Màu xanh đậm dần theo tiến độ, "Cần sửa lại" màu cảnh báo.
// Bấm một nhóm một trạng thái thì mở danh sách dự án lọc đúng trạng thái đó

const GROUP_COLORS: Record<ProjectGroupKey, string> = {
  WAITING: ORDINAL[0],
  SCHEDULED: ORDINAL[1],
  IN_PROGRESS: ORDINAL[2],
  ACCEPTANCE: ORDINAL[3],
  REWORK: STATUS_COLOR.danger,
  COMPLETED: ORDINAL[4],
}

export function ProjectStatusChart({
  projects,
  listRoute,
  state,
  onRetry,
  title = 'Dự án thi công theo trạng thái',
  hrefFor,
  description,
}: {
  projects: readonly { status: string }[]
  /** Trang danh sách dự án (nhận ?trang-thai=) */
  listRoute: string
  state: 'loading' | 'error' | 'ready'
  onRetry?: () => void
  title?: string
  /** Link của một nhóm; mặc định là danh sách lọc ?trang-thai= khi nhóm chỉ có một trạng thái */
  hrefFor?: (statuses: string[]) => string | undefined
  description?: string
}) {
  const groups = countProjectGroups(projects)
  const total = groups.reduce((s, g) => s + g.value, 0)
  const cancelled = projects.filter((p) => p.status === 'CANCELLED').length
  return (
    <ChartPanel
      title={title}
      scope="Hiện tại"
      description={
        description ??
        (cancelled > 0 ? `Không tính ${formatCount(cancelled)} dự án đã huỷ.` : 'Không tính dự án đã huỷ.')
      }
      state={state === 'ready' && total === 0 ? 'empty' : state}
      emptyText="Chưa có dự án thi công."
      onRetry={onRetry}
      table={{
        caption: title,
        columns: [{ label: 'Nhóm' }, { label: 'Gồm trạng thái' }, { label: 'Dự án', numeric: true }],
        rows: groups.map((g) => ({
          key: g.key,
          cells: [g.label, g.statuses.map((s) => INSTALLATION_STATUS_LABELS[s] ?? s).join(', '), formatCount(g.value)],
        })),
      }}
    >
      <DonutChart
        centerValue={formatCount(total)}
        centerLabel="dự án"
        ariaLabel={`Biểu đồ tròn ${total} dự án thi công theo nhóm trạng thái`}
        slices={groups.map((g) => ({
          key: g.key,
          label: g.label,
          value: g.value,
          color: GROUP_COLORS[g.key],
          href: hrefFor
            ? hrefFor(g.statuses)
            : g.statuses.length === 1
              ? `${listRoute}?trang-thai=${g.statuses[0]}`
              : listRoute,
        }))}
      />
    </ChartPanel>
  )
}
