import { useCallback, useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, buttonClass } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ProgressTracker, type TrackerNext, type TrackerStep } from '@/components/common/ui/progress-tracker'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { PhotoUpload } from '@/features/after-sales/PhotoUpload'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import { ServiceItemList } from '@/features/after-sales/ServiceRequestParts'
import { ServicePhotos } from '@/features/after-sales/ServicePhotos'
import { requestKindLabel, visitPurposeLabel } from '@/features/after-sales/serviceDisplay'
import { assetTypeLabel } from '@/features/installations/installationDisplay'
import {
  awaitsAnswer,
  isAccepted,
  isOpen,
  startBlocker,
  technicianVisitMeta,
} from '@/features/after-sales/technicianVisitDisplay'
import { canAddSupplementary, canReportInspection, canReportWork } from '@/features/after-sales/technicianVisitRules'
import { InspectionReportForm, WorkReportForm } from '@/features/after-sales/VisitReportForms'
import { OnSiteWaitPanel } from '@/features/after-sales/OnSiteWaitPanel'
import { SupplementaryItemDialog } from '@/features/after-sales/SupplementaryItemDialog'
import { addressMapUrl } from '@/features/pre-surveys/preSurveyDisplay'
import { formatAppointment } from '@/features/scheduling/schedulingDisplay'
import {
  useAbsenceMutation,
  useMyVisitQuery,
  useRespondVisitMutation,
  useStartVisitMutation,
} from '@/hooks/useTechnicianAfterSales'
import { errorMessage } from '@/services/api/errors'
import { getEvidenceUrl } from '@/services/technicianAfterSalesService'
import type { TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'

const minutesBetween = (startsAt: string, endsAt: string) =>
  Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000))

/** Tiêu đề khối có icon thương hiệu đứng trước */
function BlockTitle({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <span className="sv-title">
      <Icon name={icon} className="text-[20px]" />
      {children}
    </span>
  )
}

function trackerSteps(v: TechnicianVisitView): TrackerStep[] {
  const stage = awaitsAnswer(v) ? 0 : v.status === 'SCHEDULED' ? 1 : v.status === 'IN_PROGRESS' ? 2 : 3
  const state = (step: number): TrackerStep['state'] => (stage > step ? 'done' : stage === step ? 'current' : 'todo')
  return [
    { label: 'Nhận việc', state: state(0) },
    { label: 'Tới công trình', detail: formatAppointment(v.startsAt, v.endsAt), state: state(1) },
    { label: 'Làm và báo cáo', state: state(2) },
  ]
}

// Đỏ khi kỹ thuật viên phải làm ngay, xanh lá khi đã ổn
function nextStep(v: TechnicianVisitView): TrackerNext {
  if (awaitsAnswer(v))
    return {
      tone: 'danger',
      title: 'Bạn cần nhận hoặc từ chối buổi hẹn này',
      action: { label: 'Trả lời', icon: 'assignment_turned_in', target: 'visit-action' },
    }
  if (v.status === 'SCHEDULED') {
    const blocker = startBlocker(v)
    return blocker
      ? { tone: 'ok', title: 'Đã nhận việc', body: blocker }
      : {
          tone: 'danger',
          title: 'Tới giờ hẹn: bấm Bắt đầu khi đến công trình',
          action: { label: 'Bắt đầu', icon: 'play_arrow', target: 'visit-action' },
        }
  }
  if (v.waitingOnSite)
    return {
      tone: 'info',
      title: 'Đang chờ tại công trình để sửa luôn',
      body: 'Quản lý duyệt hết hạng mục và khách trả phần phải trả thì bấm Sửa luôn. Không chờ được nữa thì kết thúc buổi chờ.',
      action: { label: 'Xem điều kiện', icon: 'visibility', target: 'visit-onsite' },
    }
  if (v.status === 'IN_PROGRESS')
    return {
      tone: 'danger',
      title: v.purpose === 'INSPECTION' ? 'Chụp ảnh rồi gửi kết quả kiểm tra' : 'Chụp ảnh rồi gửi báo cáo',
      body: 'Cần ít nhất một ảnh của buổi này.',
      action: { label: 'Chụp ảnh', icon: 'add_a_photo', target: 'visit-photos' },
    }
  if (v.status === 'REPORTED') return { tone: 'ok', title: 'Đã gửi báo cáo' }
  if (v.status === 'CUSTOMER_ABSENT')
    return { tone: 'neutral', title: 'Đã báo khách vắng', body: 'Quản lý sẽ hẹn lại.' }
  if (v.status === 'DECLINED') return { tone: 'neutral', title: 'Bạn đã từ chối buổi hẹn này' }
  return { tone: 'neutral', title: technicianVisitMeta(v).label }
}

function ActionPanel({
  visit,
  onDecline,
  onAbsent,
}: {
  visit: TechnicianVisitView
  onDecline: () => void
  onAbsent: () => void
}) {
  const respond = useRespondVisitMutation()
  const start = useStartVisitMutation()
  const [error, setError] = useState<string | null>(null)
  const busy = respond.isPending || start.isPending

  async function run(action: () => Promise<unknown>, done: string) {
    setError(null)
    try {
      await action()
      toast.success(done)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  if (awaitsAnswer(visit))
    return (
      <Panel id="visit-action" className="scroll-mt-6">
        <PanelHeader title="Nhận việc" description={formatAppointment(visit.startsAt, visit.endsAt)} />
        <PanelBody className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              icon="assignment_turned_in"
              variant="primary"
              disabled={busy}
              onClick={() =>
                void run(
                  () => respond.mutateAsync({ visitId: visit.visitId, body: { accept: true } }),
                  'Đã nhận buổi hẹn.',
                )
              }
            >
              {respond.isPending ? 'Đang gửi…' : 'Nhận việc'}
            </Button>
            <Button icon="block" variant="danger" disabled={busy} onClick={onDecline}>
              Từ chối
            </Button>
          </div>
          {error && <Notice tone="danger">{error}</Notice>}
        </PanelBody>
      </Panel>
    )

  if (visit.status === 'SCHEDULED' && isAccepted(visit)) {
    const blocker = startBlocker(visit)
    return (
      <Panel id="visit-action" className="scroll-mt-6">
        <PanelHeader title="Bắt đầu" description={formatAppointment(visit.startsAt, visit.endsAt)} />
        <PanelBody className="space-y-4">
          {blocker && <p className="text-body text-fg-2">{blocker}</p>}
          <div className="flex flex-wrap gap-3">
            <Button
              icon="play_arrow"
              variant="primary"
              disabled={busy || blocker !== null}
              onClick={() =>
                void run(() => start.mutateAsync({ visitId: visit.visitId, body: undefined }), 'Đã bắt đầu.')
              }
            >
              {start.isPending ? 'Đang gửi…' : 'Bắt đầu'}
            </Button>
            <Button icon="person_off" variant="warn" disabled={busy || blocker !== null} onClick={onAbsent}>
              Khách vắng
            </Button>
          </div>
          {error && <Notice tone="danger">{error}</Notice>}
        </PanelBody>
      </Panel>
    )
  }
  return null
}

// Một buổi hẹn bảo hành, sửa chữa, bảo trì của kỹ thuật viên: nhận / từ chối, bắt đầu, chụp ảnh, báo cáo
export function TechAfterSalesVisitPage() {
  const { id } = useParams()
  const query = useMyVisitQuery(id)
  const respond = useRespondVisitMutation()
  const absence = useAbsenceMutation()
  const [dialog, setDialog] = useState<'decline' | 'absent' | 'supplementary' | null>(null)
  const getUrl = useCallback((evidenceId: string) => getEvidenceUrl(id ?? '', evidenceId), [id])
  usePageCrumb(query.data ? query.data.requestNumber : null)

  return (
    <QueryBoundary query={query}>
      {(v) => {
        const status = technicianVisitMeta(v)
        const next = nextStep(v)
        const map = v.siteAddress ? addressMapUrl(v.siteAddress) : null
        return (
          <>
            <div className="sv-detail">
              <PageHeader
                meta={
                  <>
                    <span className="sv-pill" data-tone={next.tone === 'danger' ? undefined : status.tone}>
                      <Badge tone={next.tone === 'danger' ? 'neutral' : status.tone}>{status.label}</Badge>
                    </span>
                    <span className="sv-chip tnum">Mã {v.requestNumber}</span>
                  </>
                }
                title={
                  <>
                    {visitPurposeLabel(v.purpose)} <span className="tnum">{v.requestNumber}</span>
                  </>
                }
                description={requestKindLabel(v.requestKind)}
                actions={
                  map && (
                    <a className={buttonClass('secondary')} href={map} target="_blank" rel="noreferrer">
                      <Icon name="map" className="-ml-0.5 text-[20px]" />
                      Xem bản đồ
                      <span className="sr-only"> (mở tab mới)</span>
                    </a>
                  )
                }
              />

              <div className="sv-card">
                <ProgressTracker steps={trackerSteps(v)} next={next} title="Tình hình tiến độ công việc" />
              </div>

              <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
                <div className="min-w-0 space-y-6 lg:col-span-2">
                  <div className="sv-card">
                    <ActionPanel
                      visit={v}
                      onDecline={() => setDialog('decline')}
                      onAbsent={() => setDialog('absent')}
                    />
                  </div>

                  {isOpen(v) && isAccepted(v) && (
                    <div className="sv-card">
                      <Panel id="visit-photos" className="scroll-mt-6">
                        <PanelHeader
                          title={<BlockTitle icon="photo_camera">Ảnh hiện trường</BlockTitle>}
                          description={
                            v.evidence.length > 0 ? `${v.evidence.length} ảnh` : 'Cần ít nhất 1 ảnh trước khi báo cáo'
                          }
                        />
                        <PanelBody className="space-y-4 border-t border-line pt-4">
                          <PhotoUpload visitId={v.visitId} />
                          <ServicePhotos photos={v.evidence} getUrl={getUrl} emptyText="Chưa có ảnh nào." />
                        </PanelBody>
                      </Panel>
                    </div>
                  )}

                  {v.waitingOnSite && (
                    <div className="sv-card">
                      <OnSiteWaitPanel visit={v} />
                    </div>
                  )}

                  {canReportInspection(v) && (
                    <div className="sv-card">
                      <Panel>
                        <PanelHeader title={<BlockTitle icon="fact_check">Kết quả kiểm tra</BlockTitle>} />
                        <PanelBody>
                          <InspectionReportForm visit={v} />
                        </PanelBody>
                      </Panel>
                    </div>
                  )}

                  {canReportWork(v) && (
                    <div className="sv-card">
                      <Panel>
                        <PanelHeader title={<BlockTitle icon="description">Báo cáo công việc</BlockTitle>} />
                        <PanelBody>
                          <WorkReportForm visit={v} />
                        </PanelBody>
                      </Panel>
                    </div>
                  )}

                  {canAddSupplementary(v) && (
                    <div className="sv-card">
                      <Panel>
                        <PanelHeader
                          title="Hạng mục phát sinh"
                          description="Lỗi khác thấy khi đang sửa: quản lý quyết định chi phí trước khi bạn làm"
                        />
                        <PanelBody>
                          <Button icon="add" variant="soft" onClick={() => setDialog('supplementary')}>
                            Báo hạng mục phát sinh
                          </Button>
                        </PanelBody>
                      </Panel>
                    </div>
                  )}

                  <section aria-label="Thông tin buổi hẹn" className="sv-card space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="sv-title text-title font-semibold">
                        <Icon name="event_note" className="text-[20px]" />
                        Thông tin buổi hẹn
                      </h2>
                      <span className="sv-chip tnum">Mã: {v.requestNumber}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 rounded-container border border-line bg-surface-2 p-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok">
                        <Icon name="schedule" className="text-[20px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-meta text-fg-3">Thời gian diễn ra</p>
                        <p className="tnum text-body font-bold text-fg">{formatAppointment(v.startsAt, v.endsAt)}</p>
                      </div>
                      <span className="sv-tag" data-tone="neutral">
                        Khung {minutesBetween(v.startsAt, v.endsAt)} phút
                      </span>
                    </div>

                    {v.siteAddress && (
                      <div className="flex items-start gap-3 rounded-container border border-line bg-surface-2 p-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-info-soft text-info">
                          <Icon name="location_on" className="text-[20px]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-meta text-fg-3">Địa chỉ chi tiết</p>
                          {map ? (
                            <a href={map} target="_blank" rel="noreferrer" className="ui-link font-bold">
                              {v.siteAddress}
                              <span className="sr-only"> (mở tab mới)</span>
                            </a>
                          ) : (
                            <p className="text-body font-bold text-fg">{v.siteAddress}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {v.description && (
                      <div className="rounded-container border border-line bg-surface-2 p-4">
                        <p className="sv-label text-meta font-semibold">Mô tả từ khách hàng</p>
                        <p className="mt-1 text-body whitespace-pre-line text-fg">{v.description}</p>
                      </div>
                    )}
                  </section>

                  {v.items.length > 0 && (
                    <div className="sv-card">
                      <Panel>
                        <PanelHeader title="Hạng mục" description={`${v.items.length} hạng mục`} />
                        <PanelBody>
                          <ServiceItemList items={v.items} />
                        </PanelBody>
                      </Panel>
                    </div>
                  )}

                  {!isOpen(v) && v.evidence.length > 0 && (
                    <div className="sv-card">
                      <Panel>
                        <PanelHeader
                          title={<BlockTitle icon="photo_camera">Ảnh hiện trường</BlockTitle>}
                          description={`${v.evidence.length} ảnh`}
                        />
                        <PanelBody>
                          <ServicePhotos photos={v.evidence} getUrl={getUrl} emptyText="Chưa có ảnh nào." />
                        </PanelBody>
                      </Panel>
                    </div>
                  )}
                </div>

                {v.assets.length > 0 && (
                  <aside aria-label="Thiết bị của công trình" className="sv-card min-w-0 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="sv-title text-title font-semibold">
                        <Icon name="memory" className="text-[20px]" />
                        Thiết bị của công trình
                      </h2>
                      <span className="sv-chip tnum">{v.assets.length}</span>
                    </div>
                    <ul className="space-y-3 border-t border-line pt-4">
                      {v.assets.map((asset) => (
                        <li key={asset.assetId} className="rounded-container border border-line p-3">
                          <p className="text-body font-bold text-fg">
                            {assetTypeLabel(asset.assetType)} {asset.manufacturer} {asset.model}
                          </p>
                          <p className="tnum mt-0.5 text-meta text-fg-2">Serial: {asset.serialNumber}</p>
                          {asset.positionCode && (
                            <span className="sv-tag mt-2" data-tone="neutral">
                              Vị trí: {asset.positionCode}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </aside>
                )}
              </div>
            </div>

            <ReasonDialog
              open={dialog === 'decline'}
              title="Từ chối buổi hẹn?"
              description="Quản lý sẽ xếp người khác."
              submitLabel="Từ chối"
              icon="block"
              variant="danger"
              onSubmit={async (reason) => {
                await respond.mutateAsync({ visitId: v.visitId, body: { accept: false, reason } })
                toast.success('Đã từ chối buổi hẹn.')
              }}
              onClose={() => setDialog(null)}
            />
            <SupplementaryItemDialog visit={v} open={dialog === 'supplementary'} onClose={() => setDialog(null)} />
            <ReasonDialog
              open={dialog === 'absent'}
              title="Báo khách vắng?"
              description="Không tính tiền buổi này. Quản lý sẽ hẹn lại với khách."
              label="Chuyện gì đã xảy ra"
              submitLabel="Gửi"
              icon="person_off"
              variant="warn"
              onSubmit={async (note) => {
                await absence.mutateAsync({ visitId: v.visitId, body: { note } })
                toast.success('Đã báo khách vắng.')
              }}
              onClose={() => setDialog(null)}
            />
          </>
        )
      }}
    </QueryBoundary>
  )
}
