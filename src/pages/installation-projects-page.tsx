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

function InstallationProjectsPage({ detailPattern }: { detailPattern: string }) {
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
              {readyCount > 0 && (
                <Badge tone="danger" icon="contract">
                  {readyCount} hợp đồng đã thanh toán chưa có dự án
                </Badge>
              )}
              {waitingCount > 0 && (
                <Badge tone="danger" icon="person_add">
                  {waitingCount} dự án chờ xếp kỹ thuật viên
                </Badge>
              )}
            </span>
          ) : (
            'Dự án lắp đặt từ hợp đồng đã thanh toán đủ: phân công kỹ thuật viên, checklist, nghiệm thu và bàn giao.'
          )
        }
      />

      <FilterChips
        label="Danh sách thi công"
        className="mb-4"
        value={tab}
        onChange={setTab}
        // Số trên tab để xám vì số đỏ đã có ở menu và đầu trang
        chips={[
          { value: 'du-an', label: 'Dự án', count: status ? undefined : projects.data?.length },
          { value: 'hop-dong', label: 'Hợp đồng chờ tạo dự án', count: ready.data?.length },
        ]}
      />

      {tab === 'hop-dong' ? (
        <QueryBoundary query={ready}>
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState
                title="Không có hợp đồng nào chờ tạo dự án"
                description="Hợp đồng hiện ở đây khi khách đã thanh toán đủ và hợp đồng chưa có dự án thi công."
              />
            ) : (
              <ReadyContractList rows={rows} detailPattern={detailPattern} />
            )
          }
        </QueryBoundary>
      ) : (
        <>
          <FilterBar>
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
                  description="Dự án được tạo từ hợp đồng đã thanh toán đủ."
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
  return <InstallationProjectsPage detailPattern={ROUTES.manage.installation} />
}

export function AdminInstallationProjectsPage() {
  return <InstallationProjectsPage detailPattern={ROUTES.admin.installation} />
}
