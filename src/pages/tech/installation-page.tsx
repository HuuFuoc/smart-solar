import { useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button, buttonClass } from '@/components/common/ui/button'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { PageHeader } from '@/components/common/ui/page-header'
import { ProgressTracker } from '@/components/common/ui/progress-tracker'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { AssetEntry } from '@/features/installations/AssetEntry'
import { AssignmentResponse } from '@/features/installations/AssignmentResponse'
import { CompletionReportForm } from '@/features/installations/CompletionReportForm'
import { EvidenceGallery } from '@/features/installations/EvidenceGallery'
import { EquipmentDifferences } from '@/features/installations/EquipmentDifferences'
import { EvidenceUpload } from '@/features/installations/EvidenceUpload'
import {
  acceptanceDecisionMeta,
  assetTypeLabel,
  assetUnits,
  deciderLabel,
  formatWarrantyMonths,
  serialText,
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
import { cx } from '@/utils/cx'
import type { AcceptanceView, AssetView, EquipmentComparisonView } from '@/types/res/customerInstallationsRes'
import type { InstallationTechnicianView } from '@/types/res/technicianInstallationsRes'

const ASSET_ICONS: Record<string, string> = { INVERTER: 'bolt', SOLAR_PANEL: 'grid_view' }

/** Đúng / khác hợp đồng chỉ khi backend đã so sánh được */
function contractTag(asset: AssetView, equipment?: EquipmentComparisonView | null) {
  if (!equipment) return null
  if (equipment.status === 'MATCHES') return { label: 'Đúng hợp đồng', tone: 'ok' as const }
  const differs = asset.productId != null && equipment.differences.some((d) => d.productId === asset.productId)
  return differs ? { label: 'Khác hợp đồng', tone: 'warn' as const } : null
}

function AssetField({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-meta text-fg-3">{label}</dt>
      <dd className={cx('text-body font-medium wrap-break-word text-fg', mono && 'tnum')}>{children}</dd>
    </div>
  )
}

function AssetCards({ assets, equipment }: { assets: AssetView[]; equipment?: EquipmentComparisonView | null }) {
  return (
    <ul className="space-y-4">
      {assets.map((a) => {
        const tag = contractTag(a, equipment)
        return (
          <li key={a.assetId} className="rounded-container border border-line bg-surface-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="sv-chip sv-chip-plain gap-1.5">
                <Icon name={ASSET_ICONS[a.assetType] ?? 'inventory_2'} className="text-[16px]" />
                {assetTypeLabel(a.assetType)}
              </span>
              {tag && (
                <span className="sv-pill" data-tone={tag.tone}>
                  <Badge tone={tag.tone}>{tag.label}</Badge>
                </span>
              )}
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3">
              <AssetField label="Hãng">{a.manufacturer}</AssetField>
              <AssetField label="Model">{a.model}</AssetField>
              <AssetField label="Số lượng" mono>
                {a.quantity.toLocaleString('vi-VN')}
              </AssetField>
              <AssetField label="Số serial" mono>
                {serialText(a)}
              </AssetField>
              <AssetField label="Vị trí">{a.positionCode ?? '—'}</AssetField>
              <AssetField label="Bảo hành">{formatWarrantyMonths(a.warrantyMonths)}</AssetField>
            </dl>
          </li>
        )
      })}
    </ul>
  )
}

/** Tiêu đề khối có icon thương hiệu đứng trước */
function BlockTitle({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <span className="sv-title">
      <Icon name={icon} className="text-[20px]" />
      {children}
    </span>
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
    <div className="sv-detail">
      <div className="sv-card mb-6">
        <PageHeader
          meta={
            <>
              {/* Việc cần làm đã báo đỏ ở khối "Tình hình" ngay dưới */}
              <span className="sv-pill" data-tone={status.tone === 'danger' ? 'info' : status.tone}>
                <Badge tone={status.tone === 'danger' ? 'info' : status.tone}>{status.label}</Badge>
              </span>
              <span className="sv-chip tnum">Mã {shortCode(view.projectId)}</span>
            </>
          }
          title={site?.propertyName ?? 'Công trình lắp đặt'}
          description={
            <span className="inline-flex items-center gap-1.5">
              <Icon name="calendar_month" className="text-[20px]" />
              {windowText(view)}
            </span>
          }
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
      </div>

      <div className="sv-card">
        <ProgressTracker {...installationTracker(view, now)} title="Tình hình tiến độ" />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {canAnswer(view) && (
            <div className="sv-card">
              <Panel id="installation-answer" className="scroll-mt-6">
                <PanelHeader title="Trả lời quản lý" />
                <PanelBody>
                  <AssignmentResponse view={view} />
                </PanelBody>
              </Panel>
            </div>
          )}
          {awaitsStart(view) && (
            <div className="sv-card">
              <Panel id="installation-start" className="scroll-mt-6">
                <PanelHeader title="Bắt đầu lắp đặt" />
                <PanelBody>
                  <StartInstallation view={view} />
                </PanelBody>
              </Panel>
            </div>
          )}

          {withWork && (
            <div className="sv-card">
              <Panel id="installation-photos" className="scroll-mt-6">
                <PanelHeader
                  title={<BlockTitle icon="photo_camera">Ảnh lắp đặt</BlockTitle>}
                  description={work ? `Báo cáo cần ít nhất một ảnh của lượt ${view.currentRound}.` : undefined}
                />
                <PanelBody className="space-y-6 border-t border-line pt-4">
                  {work && <EvidenceUpload projectId={view.projectId} round={view.currentRound} />}
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
            </div>
          )}

          {withWork && (
            <div className="sv-card">
              <Panel>
                <PanelHeader
                  title={<BlockTitle icon="settings">Thiết bị đã lắp</BlockTitle>}
                  description={
                    view.assets.length > 0
                      ? `Hiện có ${assetUnits(view.assets).toLocaleString('vi-VN')} thiết bị trong hệ thống`
                      : undefined
                  }
                  action={
                    work &&
                    !addingAssets && (
                      <Button variant="soft" size="sm" icon="add" onClick={() => setAddingAssets(true)}>
                        Ghi thiết bị
                      </Button>
                    )
                  }
                />
                <PanelBody className="space-y-6 border-t border-line pt-4">
                  {addingAssets && work && (
                    <AssetEntry
                      projectId={view.projectId}
                      saved={view.assets}
                      equipment={view.equipment}
                      onClose={() => setAddingAssets(false)}
                    />
                  )}
                  {view.assets.length > 0 ? (
                    <AssetCards assets={view.assets} equipment={view.equipment} />
                  ) : (
                    !addingAssets && <p className="text-body text-fg-2">Chưa ghi thiết bị nào.</p>
                  )}
                  {view.equipment && view.equipment.differences.length > 0 && (
                    <section aria-labelledby="equipment-differences" className="space-y-2">
                      <h3 id="equipment-differences" className="text-body font-medium text-fg">
                        Chưa khớp hợp đồng
                      </h3>
                      <EquipmentDifferences items={view.equipment.differences} />
                    </section>
                  )}
                </PanelBody>
              </Panel>
            </div>
          )}

          {(withWork || view.acceptances.length > 0) && (
            <div className="sv-card">
              <Panel id="installation-report" className="scroll-mt-6">
                <PanelHeader title={<BlockTitle icon="description">Báo cáo hoàn thành</BlockTitle>} />
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
        </div>

        <div className="min-w-0 space-y-6">
          <aside aria-label="Thông tin công trình" className="sv-card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="sv-title sv-heading text-body font-semibold">
                <Icon name="apartment" className="text-[20px]" />
                Thông tin công trình
              </h2>
              <span className="sv-chip sv-chip-plain">Lượt {view.currentRound}</span>
            </div>
            <dl className="space-y-4 border-t border-line pt-4 text-body">
              <div>
                <dt className="text-meta text-fg-3">Địa chỉ</dt>
                <dd className="text-fg">{site ? formatAddress(site) : '—'}</dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <dt className="text-meta text-fg-3">Khu vực</dt>
                  <dd className="font-medium text-fg">{view.zoneName ?? '—'}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-meta text-fg-3">Toạ độ</dt>
                  <dd>
                    {map ? (
                      <a className="tnum ui-link" href={map} target="_blank" rel="noreferrer">
                        {formatCoordinates(site!.latitude!, site!.longitude!)}
                        <span className="sr-only"> (mở tab mới)</span>
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-meta text-fg-3">Phân công của bạn</dt>
                <dd className="mt-1">
                  <span className="sv-pill" data-tone={view.myAssignmentStatus === 'ACCEPTED' ? 'ok' : undefined}>
                    <Badge tone={view.myAssignmentStatus === 'ACCEPTED' ? 'ok' : 'neutral'}>
                      {assignmentStatusLabel(view.myAssignmentStatus)}
                    </Badge>
                  </span>
                </dd>
              </div>
            </dl>
          </aside>

          <aside aria-label="Khách hàng" className="sv-card space-y-4">
            <h2 className="sv-title sv-heading text-body font-semibold">
              <Icon name="person" className="text-[20px]" />
              Khách hàng
            </h2>
            <div className="flex items-center gap-3 border-t border-line pt-4">
              <span className="sv-avatar text-title" aria-hidden>
                {(site?.customerName || '?').trim().charAt(0).toUpperCase()}
              </span>
              <p className="min-w-0 text-title font-semibold wrap-break-word">
                {site?.customerName || 'Chưa có họ tên'}
              </p>
            </div>
            {site?.customerPhone && (
              <div className="sv-field">
                <div className="min-w-0 flex-1">
                  <p className="text-meta text-fg-3">Số điện thoại</p>
                  <a className="tnum ui-link text-title font-semibold" href={`tel:${site.customerPhone}`}>
                    {site.customerPhone}
                  </a>
                </div>
                <a className={buttonClass('primary')} href={`tel:${site.customerPhone}`} aria-label="Gọi khách">
                  <Icon name="call" className="text-[20px]" />
                </a>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
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
