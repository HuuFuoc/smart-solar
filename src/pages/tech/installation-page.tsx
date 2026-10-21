import { useState } from 'react'
import { useParams } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button, buttonClass } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelAside, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { PageHeader } from '@/components/common/ui/page-header'
import { ProgressTracker } from '@/components/common/ui/progress-tracker'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { AssetEntry } from '@/features/installations/AssetEntry'
import { AssignmentResponse } from '@/features/installations/AssignmentResponse'
import { CompletionReportForm } from '@/features/installations/CompletionReportForm'
import { EvidenceGallery } from '@/features/installations/EvidenceGallery'
import {
  acceptanceDecisionMeta,
  assetTypeLabel,
  deciderLabel,
  formatWarrantyMonths,
} from '@/features/installations/installationDisplay'
import { StartInstallation } from '@/features/installations/StartInstallation'
import {
  assignmentStatusLabel,
  awaitsStart,
  canAnswer,
  canWork,
  installationTracker,
  showsWork,
  technicianStatusMeta,
  windowText,
} from '@/features/installations/technicianInstallationDisplay'
import { Facts } from '@/features/pre-surveys/Facts'
import {
  formatAddress,
  formatCoordinates,
  formatDateTime,
  hasCoordinates,
  mapsUrl,
  shortCode,
} from '@/features/pre-surveys/preSurveyDisplay'
import { useInstallationEvidenceQuery, useMyInstallationQuery } from '@/hooks/useTechnicianInstallations'
import { getInstallationEvidenceUrl } from '@/services/technicianInstallationService'
import type { AcceptanceView, AssetView } from '@/types/res/customerInstallationsRes'
import type { InstallationTechnicianView } from '@/types/res/technicianInstallationsRes'

function AssetTable({ assets }: { assets: AssetView[] }) {
  return (
    <Table stack>
      <thead>
        <tr>
          <Th>Loại</Th>
          <Th>Hãng</Th>
          <Th>Model</Th>
          <Th>Số serial</Th>
          <Th>Vị trí</Th>
          <Th>Bảo hành</Th>
        </tr>
      </thead>
      <tbody>
        {assets.map((a) => (
          <Tr key={a.assetId}>
            <Td label="Loại">{assetTypeLabel(a.assetType)}</Td>
            <Td label="Hãng">{a.manufacturer}</Td>
            <Td label="Model">{a.model}</Td>
            <Td label="Số serial" className="tnum">
              {a.serialNumber}
            </Td>
            <Td label="Vị trí">{a.positionCode ?? '—'}</Td>
            <Td label="Bảo hành">{formatWarrantyMonths(a.warrantyMonths)}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  )
}

/** Các lần gửi báo cáo, lần mới nhất trước */
function ReportHistory({ items }: { items: AcceptanceView[] }) {
  return (
    <ol className="divide-y divide-line">
      {[...items]
        .sort((a, b) => b.round - a.round)
        .map((a) => {
          const decision = acceptanceDecisionMeta(a)
          const decider = deciderLabel(a.decidedBy)
          return (
            <li key={a.round} className="py-4 first:pt-0 last:pb-0">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold">Lượt {a.round}</span>
                <span className="tnum text-meta text-fg-2">gửi {formatDateTime(a.requestedAt)}</span>
                <Badge tone={decision.tone}>{decision.label}</Badge>
              </p>
              <p className="mt-2 max-w-prose text-body whitespace-pre-line text-fg">{a.completionReport}</p>
              {a.decidedAt && (
                <p className="mt-2 text-body text-fg-2">
                  {decider ?? 'Đã trả lời'} lúc <span className="tnum">{formatDateTime(a.decidedAt)}</span>
                  {a.reason ? `: ${a.reason}` : '.'}
                </p>
              )}
            </li>
          )
        })}
    </ol>
  )
}

function InstallationDetail({ view, now }: { view: InstallationTechnicianView; now: number }) {
  const [addingAssets, setAddingAssets] = useState(false)
  const work = canWork(view)
  const withWork = showsWork(view)
  const evidence = useInstallationEvidenceQuery(view.projectId, { enabled: withWork })
  const status = technicianStatusMeta(view)
  const site = view.site
  const located = site ? hasCoordinates(site.latitude, site.longitude) : false
  const map = located ? mapsUrl(site!.latitude!, site!.longitude!) : null

  return (
    <>
      <PageHeader
        meta={
          <>
            {/* Việc cần làm đã báo đỏ ở khối "Tình hình" ngay dưới */}
            <Badge tone={status.tone === 'danger' ? 'info' : status.tone}>{status.label}</Badge>
            <span className="tnum">Mã {shortCode(view.projectId)}</span>
          </>
        }
        title={site?.propertyName ?? 'Công trình lắp đặt'}
        description={windowText(view)}
        actions={
          <>
            {site?.customerPhone && (
              <a className={buttonClass('soft')} href={`tel:${site.customerPhone}`}>
                <Icon name="call" className="-ml-0.5 text-[20px]" />
                Gọi khách
              </a>
            )}
            {map && (
              <a className={buttonClass('secondary')} href={map} target="_blank" rel="noreferrer">
                <Icon name="map" className="-ml-0.5 text-[20px]" />
                Xem bản đồ
                <span className="sr-only"> (mở tab mới)</span>
              </a>
            )}
          </>
        }
      />

      <ProgressTracker {...installationTracker(view, now)} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {canAnswer(view) && (
            <Panel>
              <PanelHeader title="Trả lời quản lý" />
              <PanelBody>
                <AssignmentResponse view={view} />
              </PanelBody>
            </Panel>
          )}
          {awaitsStart(view) && (
            <Panel>
              <PanelHeader title="Bắt đầu lắp đặt" />
              <PanelBody>
                <StartInstallation view={view} />
              </PanelBody>
            </Panel>
          )}
          <Panel>
            <PanelHeader title="Công trình" />
            <PanelBody>
              <Facts
                items={[
                  { k: 'Địa chỉ', v: site ? formatAddress(site) : '—' },
                  { k: 'Khu vực', v: view.zoneName ?? '—' },
                  {
                    k: 'Toạ độ',
                    v: map ? (
                      <a className="tnum ui-link" href={map} target="_blank" rel="noreferrer">
                        {formatCoordinates(site!.latitude!, site!.longitude!)}
                      </a>
                    ) : (
                      '—'
                    ),
                  },
                  { k: 'Phân công của bạn', v: assignmentStatusLabel(view.myAssignmentStatus) },
                  { k: 'Lượt', v: view.currentRound },
                ]}
              />
            </PanelBody>
          </Panel>
        </div>

        <PanelAside aria-label="Khách hàng">
          <Panel>
            <PanelHeader title="Khách hàng" />
            <PanelBody>
              <Facts
                column
                items={[
                  { k: 'Họ tên', v: site?.customerName || '—' },
                  {
                    k: 'Điện thoại',
                    v: site?.customerPhone ? (
                      <a className="tnum ui-link" href={`tel:${site.customerPhone}`}>
                        {site.customerPhone}
                      </a>
                    ) : (
                      '—'
                    ),
                  },
                ]}
              />
            </PanelBody>
          </Panel>
        </PanelAside>
      </div>

      {/* Ảnh, thiết bị và báo cáo trải hết chiều ngang để lưới ảnh và bảng thiết bị đủ rộng */}
      {(withWork || view.acceptances.length > 0) && (
        <div className="mt-6 space-y-4">
          {withWork && (
            <Panel>
              <PanelHeader
                title="Ảnh lắp đặt"
                description={work ? `Báo cáo cần ít nhất một ảnh của lượt ${view.currentRound}.` : undefined}
              />
              <PanelBody className="space-y-4">
                {work && (
                  <Notice tone="warn">
                    Chưa thêm ảnh được từ trang này: hệ thống chưa có chức năng cấp link tải ảnh lên kho lưu trữ.
                  </Notice>
                )}
                {evidence.isPending ? (
                  <Skeleton className="h-40" />
                ) : evidence.data === undefined ? (
                  <ErrorState
                    title="Không tải được ảnh lắp đặt."
                    message={evidence.error?.message}
                    onRetry={() => void evidence.refetch()}
                  />
                ) : (
                  <EvidenceGallery
                    items={evidence.data}
                    getUrl={(evidenceId, disposition) =>
                      getInstallationEvidenceUrl(view.projectId, evidenceId, disposition)
                    }
                    emptyText="Chưa có ảnh lắp đặt nào."
                  />
                )}
              </PanelBody>
            </Panel>
          )}

          {withWork && (
            <Panel>
              <PanelHeader
                title="Thiết bị đã lắp"
                description={view.assets.length > 0 ? `${view.assets.length} thiết bị` : undefined}
                action={
                  work &&
                  !addingAssets && (
                    <Button size="sm" icon="add" onClick={() => setAddingAssets(true)}>
                      Ghi thiết bị
                    </Button>
                  )
                }
              />
              <PanelBody className="space-y-6">
                {addingAssets && work && (
                  <AssetEntry projectId={view.projectId} saved={view.assets} onClose={() => setAddingAssets(false)} />
                )}
                {view.assets.length > 0 ? (
                  <AssetTable assets={view.assets} />
                ) : (
                  !addingAssets && <p className="text-body text-fg-2">Chưa ghi thiết bị nào.</p>
                )}
              </PanelBody>
            </Panel>
          )}

          <Panel>
            <PanelHeader
              title="Báo cáo hoàn thành"
              description={work ? 'Khách đọc báo cáo này khi nghiệm thu.' : undefined}
            />
            <PanelBody className="space-y-6">
              {work && <CompletionReportForm view={view} />}
              {view.acceptances.length > 0 ? (
                <ReportHistory items={view.acceptances} />
              ) : (
                !work && <p className="text-body text-fg-2">Chưa gửi báo cáo nào.</p>
              )}
            </PanelBody>
          </Panel>
        </div>
      )}
    </>
  )
}

// Chi tiết một công trình lắp đặt được giao: trả lời quản lý, bắt đầu, ghi thiết bị, gửi báo cáo cho khách nghiệm thu
export function TechInstallationPage() {
  const { id } = useParams()
  const query = useMyInstallationQuery(id)
  const [now] = useState(() => Date.now())
  usePageCrumb(query.data?.site?.propertyName ?? null)

  return <QueryBoundary query={query}>{(view) => <InstallationDetail view={view} now={now} />}</QueryBoundary>
}
