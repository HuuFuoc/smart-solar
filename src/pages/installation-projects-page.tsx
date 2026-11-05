import { useSearchParams } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { Select } from '@/components/common/ui/field'
import { FilterBar } from '@/components/common/ui/filter-bar'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { ProjectTable } from '@/features/installation-projects/ProjectTable'
import { ReadyContractList } from '@/features/installation-projects/ReadyContractList'
import {
  INSTALLATION_STATUS_ORDER,
  isInstallationStatus,
  projectStatusMeta,
} from '@/features/installation-projects/projectDisplay'
import { useInstallationProjectsQuery, useReadyContractsQuery } from '@/hooks/useManagerInstallations'
import { ROUTES } from '@/routes/paths'

// Dự án thi công (quản lý và quản trị dùng chung). Tab "Hợp đồng chờ tạo dự án" là hợp đồng đã thanh toán đủ mà chưa có dự án.
// Lọc trạng thái gửi thẳng lên backend (?status=), chỉ dùng các giá trị của InstallationStatuses

type Tab = 'du-an' | 'hop-dong'

const STATUS_LEGEND = [
  { label: 'Chờ xếp KTV', dot: 'bg-rose-500' },
  { label: 'Chờ KTV nhận', dot: 'bg-amber-500' },
  { label: 'Đã lên lịch', dot: 'bg-teal-500' },
  { label: 'Đang lắp đặt', dot: 'bg-blue-500' },
  { label: 'Chờ nghiệm thu', dot: 'bg-purple-500' },
  { label: 'Hoàn thành', dot: 'bg-emerald-500' },
]

function InstallationProjectsPage({
  detailPattern,
  contractPattern,
}: {
  detailPattern: string
  contractPattern: string
}) {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('muc') === 'hop-dong' ? 'hop-dong' : 'du-an'
  const rawStatus = params.get('trang-thai')
  const status = isInstallationStatus(rawStatus) ? rawStatus : undefined
  const projects = useInstallationProjectsQuery(status)
  const ready = useReadyContractsQuery()
  const waiting = useInstallationProjectsQuery('PENDING_ASSIGNMENT')
  const readyCount = ready.data?.length ?? 0
  const waitingCount = waiting.data?.length ?? 0

  const setTab = (next: Tab) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'hop-dong') p.set('muc', 'hop-dong')
        else p.delete('muc')
        return p
      },
      { replace: true },
    )
  const setStatus = (value: string) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (value) p.set('trang-thai', value)
        else p.delete('trang-thai')
        return p
      },
      { replace: true },
    )

  return (
    <>
      <PageHeader
        title="Thi công"
        description={
          readyCount || waitingCount ? (
            <span className="flex flex-wrap gap-2">
              {readyCount > 0 && <Badge tone="danger">{readyCount} hợp đồng đã thanh toán chưa có dự án</Badge>}
              {waitingCount > 0 && <Badge tone="danger">{waitingCount} dự án chờ xếp kỹ thuật viên</Badge>}
            </span>
          ) : undefined
        }
      />

      <FilterChips
        label="Danh sách thi công"
        className="mb-4"
        value={tab}
        onChange={setTab}
        chips={[
          { value: 'du-an', label: 'Dự án', count: status ? undefined : projects.data?.length },
          { value: 'hop-dong', label: 'Hợp đồng chờ tạo dự án', count: ready.data?.length },
        ]}
      />

      {tab === 'hop-dong' ? (
        <QueryBoundary query={ready}>
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState title="Không có hợp đồng nào chờ tạo dự án" />
            ) : (
              <ReadyContractList rows={rows} detailPattern={detailPattern} contractPattern={contractPattern} />
            )
          }
        </QueryBoundary>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <FilterBar className="mb-0 flex-1">
              <label className="w-full sm:w-72">
                <span className="sr-only">Lọc theo trạng thái</span>
                <Select active={status !== undefined} value={status ?? ''} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Tất cả trạng thái</option>
                  {INSTALLATION_STATUS_ORDER.map((value) => (
                    <option key={value} value={value}>
                      {projectStatusMeta(value).label}
                    </option>
                  ))}
                </Select>
              </label>
              {status && (
                <Button variant="ghost" bleed={false} icon="filter_alt_off" onClick={() => setStatus('')}>
                  Xoá bộ lọc
                </Button>
              )}
            </FilterBar>
          </div>

          {/* Thanh chú thích tiến trình */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-container border border-line bg-surface-1 px-4 py-2 text-meta shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium text-fg-2">Tiến trình thi công:</span>
              {STATUS_LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${item.dot}`} />
                  <span className="text-fg-2">{item.label}</span>
                </div>
              ))}
            </div>
            <span className="text-fg-3">
              Tổng số dự án: <strong className="text-fg-1">{projects.data?.length ?? 0}</strong>
            </span>
          </div>

          <QueryBoundary query={projects}>
            {(rows) =>
              rows.length > 0 ? (
                <ProjectTable rows={rows} detailPattern={detailPattern} />
              ) : status ? (
                <EmptyState
                  title={`Không có dự án nào ở trạng thái ${projectStatusMeta(status).label.toLocaleLowerCase('vi')}`}
                  description="Chọn trạng thái khác hoặc xoá bộ lọc."
                />
              ) : (
                <EmptyState
                  title="Chưa có dự án thi công nào"
                  action={
                    readyCount > 0 ? (
                      <Button icon="visibility" size="sm" variant="info" onClick={() => setTab('hop-dong')}>
                        Xem hợp đồng chờ tạo dự án
                      </Button>
                    ) : undefined
                  }
                />
              )
            }
          </QueryBoundary>
        </>
      )}
    </>
  )
}

export function ManageInstallationProjectsPage() {
  return (
    <InstallationProjectsPage detailPattern={ROUTES.manage.installation} contractPattern={ROUTES.manage.contract} />
  )
}

export function AdminInstallationProjectsPage() {
  return <InstallationProjectsPage detailPattern={ROUTES.admin.installation} contractPattern={ROUTES.admin.contract} />
}
