import { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ProgressTracker, type TrackerNext, type TrackerStep } from '@/components/common/ui/progress-tracker'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { PhotoUpload } from '@/features/after-sales/PhotoUpload'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import { ServiceItemList } from '@/features/after-sales/ServiceRequestParts'
import { ServicePhotos } from '@/features/after-sales/ServicePhotos'
import { assetName, requestKindLabel, visitPurposeLabel } from '@/features/after-sales/serviceDisplay'
import {
  awaitsAnswer,
  isAccepted,
  isOpen,
  startBlocker,
  technicianVisitMeta,
} from '@/features/after-sales/technicianVisitDisplay'
import { InspectionReportForm, WorkReportForm } from '@/features/after-sales/VisitReportForms'
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
  const [dialog, setDialog] = useState<'decline' | 'absent' | null>(null)
  const getUrl = useCallback((evidenceId: string) => getEvidenceUrl(id ?? '', evidenceId), [id])
  usePageCrumb(query.data ? query.data.requestNumber : null)

  return (
    <QueryBoundary query={query}>
      {(v) => {
        const status = technicianVisitMeta(v)
        const next = nextStep(v)
        const working = v.status === 'IN_PROGRESS'
        return (
          <>
            <PageHeader
              meta={
                <>
                  <Badge tone={next.tone === 'danger' ? 'neutral' : status.tone}>{status.label}</Badge>
                  <span>{requestKindLabel(v.requestKind)}</span>
                </>
              }
              title={
                <>
                  {visitPurposeLabel(v.purpose)} <span className="tnum">{v.requestNumber}</span>
                </>
              }
            />
            <div className="space-y-6">
              <ProgressTracker steps={trackerSteps(v)} next={next} />
              <ActionPanel visit={v} onDecline={() => setDialog('decline')} onAbsent={() => setDialog('absent')} />

              {isOpen(v) && isAccepted(v) && (
                <Panel id="visit-photos" className="scroll-mt-6">
                  <PanelHeader
                    title="Ảnh hiện trường"
                    description={
                      v.evidence.length > 0 ? `${v.evidence.length} ảnh` : 'Cần ít nhất 1 ảnh trước khi báo cáo'
                    }
                  />
                  <PanelBody className="space-y-4">
                    <PhotoUpload visitId={v.visitId} />
                    <ServicePhotos photos={v.evidence} getUrl={getUrl} emptyText="Chưa có ảnh nào." />
                  </PanelBody>
                </Panel>
              )}

              {working && (
                <Panel>
                  <PanelHeader title={v.purpose === 'INSPECTION' ? 'Kết quả kiểm tra' : 'Báo cáo công việc'} />
                  <PanelBody>
                    {v.purpose === 'INSPECTION' ? <InspectionReportForm visit={v} /> : <WorkReportForm visit={v} />}
                  </PanelBody>
                </Panel>
              )}

              <Panel>
                <PanelHeader title="Thông tin buổi hẹn" />
                <PanelBody className="space-y-4">
                  <KeyValueList
                    columns={2}
                    items={[
                      { k: 'Thời gian', v: formatAppointment(v.startsAt, v.endsAt) },
                      {
                        k: 'Địa chỉ',
                        v: v.siteAddress ? (
                          <a
                            href={addressMapUrl(v.siteAddress) ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="ui-link"
                          >
                            {v.siteAddress}
                          </a>
                        ) : (
                          '—'
                        ),
                      },
                    ]}
                  />
                  <div>
                    <p className="text-meta text-fg-2">Khách mô tả</p>
                    <p className="max-w-[72ch] text-body whitespace-pre-line text-fg">{v.description}</p>
                  </div>
                  {v.assets.length > 0 && (
                    <div>
                      <p className="text-meta text-fg-2">Thiết bị của công trình</p>
                      <ul className="mt-1 space-y-1 text-body text-fg">
                        {v.assets.map((asset) => (
                          <li key={asset.assetId}>
                            {assetName(asset)}
                            {asset.positionCode && `, ${asset.positionCode}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </PanelBody>
              </Panel>

              {v.items.length > 0 && (
                <Panel>
                  <PanelHeader title="Hạng mục" description={`${v.items.length} hạng mục`} />
                  <PanelBody>
                    <ServiceItemList items={v.items} />
                  </PanelBody>
                </Panel>
              )}

              {!isOpen(v) && v.evidence.length > 0 && (
                <Panel>
                  <PanelHeader title="Ảnh hiện trường" description={`${v.evidence.length} ảnh`} />
                  <PanelBody>
                    <ServicePhotos photos={v.evidence} getUrl={getUrl} emptyText="Chưa có ảnh nào." />
                  </PanelBody>
                </Panel>
              )}
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
