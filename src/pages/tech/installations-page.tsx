import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import {
  installationTab,
  technicianStatusMeta,
  windowText,
  type InstallationTab,
} from '@/features/installations/technicianInstallationDisplay'
import { useMyInstallationsQuery } from '@/hooks/useTechnicianInstallations'
import { ROUTES, withId } from '@/routes/paths'
import type { InstallationTechnicianView } from '@/types/res/technicianInstallationsRes'

/** Các tab dùng chung một bộ cột để chuyển tab không bị nhảy cột */
const COLUMNS = 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_9rem]'
const LABELS = ['Thời gian', 'Công trình', 'Khu vực', 'Tình hình', '']

const EMPTY: Record<InstallationTab, { title: string; description?: string }> = {
  pending: {
    title: 'Không có công trình nào chờ bạn nhận',
    description: 'Khi quản lý giao công trình lắp đặt cho bạn, công trình hiện ở đây để bạn nhận hoặc từ chối.',
  },
  active: { title: 'Chưa có công trình nào đang làm', description: 'Công trình bạn đã nhận hiện ở đây.' },
  done: { title: 'Chưa có công trình nào đã nghiệm thu' },
}

const byStart = (a: InstallationTechnicianView, b: InstallationTechnicianView) => a.startsAt.localeCompare(b.startsAt)
const byCompletedDesc = (a: InstallationTechnicianView, b: InstallationTechnicianView) =>
  (b.completedAt ?? b.endsAt).localeCompare(a.completedAt ?? a.endsAt)

function InstallationRow({ view, tab }: { view: InstallationTechnicianView; tab: InstallationTab }) {
  const status = technicianStatusMeta(view)
  const site = view.site
  // Việc chờ trả lời đã báo đỏ ở menu và đầu trang nên dòng chỉ ghi chữ
  const tone = tab === 'pending' ? 'info' : status.tone
  return (
    <ListRow>
      <ListCells columns={COLUMNS}>
        <ListCell label="Thời gian" wide>
          <span className="tnum font-semibold">{windowText(view)}</span>
        </ListCell>
        <ListCell wide>
          <h3 className="font-semibold">{site?.propertyName ?? 'Công trình lắp đặt'}</h3>
          <p className="mt-0.5 text-meta text-fg-2">
            {[site?.ward, site?.district, site?.province].filter(Boolean).join(', ') || '—'}
          </p>
        </ListCell>
        <ListCell label="Khu vực">{view.zoneName ?? '—'}</ListCell>
        <ListCell label="Tình hình">
          <Badge tone={tone}>{status.label}</Badge>
        </ListCell>
        <ListCell wide className="lg:justify-self-end">
          <ButtonLink to={withId(ROUTES.tech.installation, view.projectId)} size="sm" variant="info" icon="visibility">
            {tab === 'pending' ? 'Xem và trả lời' : 'Xem chi tiết'}
          </ButtonLink>
        </ListCell>
      </ListCells>
    </ListRow>
  )
}

// Công trình lắp đặt quản lý giao cho kỹ thuật viên: chờ trả lời, đang làm (đã nhận, chưa nghiệm thu) và đã nghiệm thu
export function TechInstallationsPage() {
  const query = useMyInstallationsQuery()
  const [picked, setPicked] = useState<InstallationTab | null>(null)
  const rows = query.data ?? []
  const groups: Record<InstallationTab, InstallationTechnicianView[]> = {
    pending: rows.filter((v) => installationTab(v) === 'pending').sort(byStart),
    active: rows.filter((v) => installationTab(v) === 'active').sort(byStart),
    done: rows.filter((v) => installationTab(v) === 'done').sort(byCompletedDesc),
  }
  const waiting = groups.pending.length
  // Mở sẵn tab "Chờ bạn nhận" khi có việc mới giao
  const tab: InstallationTab = picked ?? (waiting > 0 ? 'pending' : 'active')
  const shown = groups[tab]

  return (
    <>
      <PageHeader
        title="Lắp đặt"
        description={
          waiting > 0 ? (
            <Badge tone="danger" icon="assignment_late">
              {waiting} công trình chờ bạn nhận việc
            </Badge>
          ) : undefined
        }
      />
      <FilterChips
        label="Lọc công trình"
        className="mb-6"
        value={tab}
        onChange={setPicked}
        chips={[
          { value: 'pending', label: 'Chờ bạn nhận', count: waiting },
          { value: 'active', label: 'Đang làm', count: groups.active.length },
          { value: 'done', label: 'Đã nghiệm thu', count: groups.done.length },
        ]}
      />
      <QueryBoundary query={query}>
        {() =>
          shown.length === 0 ? (
            <EmptyState {...EMPTY[tab]} />
          ) : (
            <div>
              <ListHead columns={COLUMNS} labels={LABELS} />
              <ul className="divide-y divide-line">
                {shown.map((view) => (
                  <InstallationRow key={view.projectId} view={view} tab={tab} />
                ))}
              </ul>
            </div>
          )
        }
      </QueryBoundary>
    </>
  )
}
