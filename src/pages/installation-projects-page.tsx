import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { SearchInput, Select } from '@/components/common/ui/field'
import { PageHeader } from '@/components/common/ui/page-header'
import { PagedList } from '@/components/common/ui/pagination'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { SummaryTile } from '@/components/common/ui/summary-tile'
import { ProjectTable } from '@/features/installation-projects/ProjectTable'
import { ReadyContractList } from '@/features/installation-projects/ReadyContractList'
import {
  INSTALLATION_STATUS_ORDER,
  isInstallationStatus,
  projectStatusMeta,
} from '@/features/installation-projects/projectDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { useInstallationProjectsQuery, useReadyContractsQuery } from '@/hooks/useManagerInstallations'
import { ROUTES } from '@/routes/paths'
import { fold } from '@/utils/fold'

// Dự án thi công (quản lý và quản trị dùng chung). Tab "Hợp đồng chờ tạo dự án" là hợp đồng đã thanh toán đủ mà chưa có dự án.
// Lọc trạng thái gửi thẳng lên backend (?status=), chỉ dùng các giá trị của InstallationStatuses; tìm và sắp xếp ở máy

type Tab = 'du-an' | 'hop-dong'
type Sort = 'newest' | 'oldest'

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
  const [keyword, setKeyword] = useState('')
  const [sort, setSort] = useState<Sort>('newest')
  const projects = useInstallationProjectsQuery(status)
  // Ô tổng quan luôn đếm trên toàn bộ dự án, không theo bộ lọc đang chọn (không lọc thì dùng chung một truy vấn)
  const all = useInstallationProjectsQuery(undefined)
  const ready = useReadyContractsQuery()
  const readyCount = ready.data?.length ?? 0
  const allRows = all.data ?? []
  const waitingCount = allRows.filter((p) => p.status === 'PENDING_ASSIGNMENT').length
  const countOf = (value: string) => allRows.filter((p) => p.status === value).length

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
        p.delete('muc')
        return p
      },
      { replace: true },
    )

  const key = fold(keyword.trim())

  return (
    <div className="sv-list">
      <PageHeader
        title="Thi công"
        description="Theo dõi tiến độ triển khai dự án, phân công kỹ thuật viên và giám sát hợp đồng."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          upper
          label="Tổng dự án quản lý"
          count={allRows.length}
          note={waitingCount > 0 ? `${waitingCount} chờ xếp kỹ thuật viên` : 'Không có dự án chờ xếp'}
          icon="description"
          tone="neutral"
          active={tab === 'du-an' && !status}
          onClick={() => setStatus('')}
        />
        <SummaryTile
          upper
          label="Đang lắp đặt"
          count={countOf('IN_PROGRESS')}
          note="dự án đang thi công"
          icon="bolt"
          tone="ok"
          active={tab === 'du-an' && status === 'IN_PROGRESS'}
          onClick={() => setStatus('IN_PROGRESS')}
        />
        <SummaryTile
          upper
          label="Đã bàn giao"
          count={countOf('COMPLETED')}
          note="hoàn tất nghiệm thu"
          icon="task_alt"
          tone="neutral"
          active={tab === 'du-an' && status === 'COMPLETED'}
          onClick={() => setStatus('COMPLETED')}
        />
        <SummaryTile
          upper
          label="Hợp đồng chờ tạo"
          count={readyCount}
          note={readyCount > 0 ? 'đã thanh toán, chưa có dự án' : 'Không có tồn đọng'}
          icon="schedule"
          tone={readyCount > 0 ? 'danger' : 'neutral'}
          active={tab === 'hop-dong'}
          onClick={() => setTab('hop-dong')}
        />
      </div>

      <div className="sv-card sv-flush">
        <FilterChips
          label="Danh sách thi công"
          className="px-4"
          value={tab}
          onChange={setTab}
          // Số trên tab để xám vì số đỏ đã có ở menu và ô tổng quan
          chips={[
            { value: 'du-an', label: 'Dự án', count: status ? undefined : projects.data?.length },
            { value: 'hop-dong', label: 'Hợp đồng chờ tạo dự án', count: ready.data?.length },
          ]}
        />

        {tab === 'hop-dong' ? (
          <div className="p-4">
            <QueryBoundary query={ready}>
              {(rows) =>
                rows.length === 0 ? (
                  <EmptyState title="Không có hợp đồng nào chờ tạo dự án" />
                ) : (
                  <ReadyContractList rows={rows} detailPattern={detailPattern} contractPattern={contractPattern} />
                )
              }
            </QueryBoundary>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <label className="w-full sm:w-56">
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
              <div className="w-full min-w-48 flex-1 sm:w-auto">
                <SearchInput
                  name="project-search"
                  placeholder="Tìm theo mã dự án, kỹ thuật viên, hợp đồng"
                  maxLength={100}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onClear={() => setKeyword('')}
                />
              </div>
              <label className="flex items-center gap-2 text-meta text-fg-2">
                Sắp xếp:
                <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-40">
                  <option value="newest">Mới nhất trước</option>
                  <option value="oldest">Cũ nhất trước</option>
                </Select>
              </label>
              {status && (
                <Button variant="ghost" bleed={false} icon="filter_alt_off" onClick={() => setStatus('')}>
                  Xoá bộ lọc
                </Button>
              )}
            </div>
            <QueryBoundary query={projects}>
              {(rows) => {
                const shown = rows
                  .filter(
                    (p) =>
                      !key ||
                      fold(
                        `${shortCode(p.projectId)} ${p.responsibleTechnicianName ?? ''} ${shortCode(p.contractId)}`,
                      ).includes(key),
                  )
                  .sort((a, b) => {
                    const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    return sort === 'newest' ? diff : -diff
                  })
                return shown.length > 0 ? (
                  <PagedList
                    key={`${status}-${key}-${sort}`}
                    items={shown}
                    noun="dự án"
                    keepScroll
                    pagerClassName="px-4 pb-4"
                  >
                    {(pageRows) => (
                      <div className="border-t border-line px-4">
                        <ProjectTable rows={pageRows} detailPattern={detailPattern} />
                      </div>
                    )}
                  </PagedList>
                ) : (
                  <div className="px-4 pb-4">
                    {key ? (
                      <EmptyState title="Không tìm thấy dự án phù hợp" description="Thử đổi từ khoá tìm kiếm." />
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
                    )}
                  </div>
                )
              }}
            </QueryBoundary>
          </>
        )}
      </div>
    </div>
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
