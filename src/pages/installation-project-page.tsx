import { useState } from 'react'
import { useParams } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button, buttonClass } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelAside, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ProgressTracker, type TrackerNext, type TrackerStep } from '@/components/common/ui/progress-tracker'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { Facts } from '@/features/pre-surveys/Facts'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { AssignmentPanel } from '@/features/installation-projects/AssignmentPanel'
import { CancelProjectDialog } from '@/features/installation-projects/CancelProjectDialog'
import { ChecklistPanel } from '@/features/installation-projects/ChecklistPanel'
import { CompletionPanel } from '@/features/installation-projects/CompletionPanel'
import { EventLog } from '@/features/installation-projects/EventLog'
import { EvidencePanel } from '@/features/installation-projects/EvidencePanel'
import { AssetsPanel, HandoverPanel } from '@/features/installation-projects/HandoverPanel'
import {
  blockingChecklist,
  canCancel,
  formatInterval,
  formatSiteAddress,
  projectStatusMeta,
  scheduleExpired,
  siteMapUrl,
} from '@/features/installation-projects/projectDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useInstallationProjectQuery } from '@/hooks/useManagerInstallations'
import type { InstallationStaffView } from '@/types/res/managerInstallationsRes'

const projectTitle = (p: InstallationStaffView) => p.site?.propertyName || `Dự án ${shortCode(p.projectId)}`

/** Vị trí trên dải các bước: 0 phân công, 1 kỹ thuật viên nhận, 2 thi công, 3 khách nghiệm thu, 4 bàn giao */
function stepIndex(p: InstallationStaffView) {
  // Đổi người khi đã thi công thì người mới phải nhận việc trước
  const waitingAcceptance = p.responsibleTechnician?.assignmentStatus === 'PENDING'
  switch (p.status) {
    case 'PENDING_ASSIGNMENT':
      return 0
    case 'PENDING_TECHNICIAN_ACCEPTANCE':
      return 1
    case 'SCHEDULED':
      return 2
    case 'IN_PROGRESS':
    case 'REWORK_REQUIRED':
      return waitingAcceptance ? 1 : 2
    case 'PENDING_CUSTOMER_ACCEPTANCE':
      return 3
    case 'COMPLETED':
      return 5
    case 'CANCELLED':
      return p.assignments.length > 0 ? 1 : 0
  }
}

function trackerSteps(p: InstallationStaffView): TrackerStep[] {
  const at = stepIndex(p)
  const cancelled = p.status === 'CANCELLED'
  const state = (i: number): TrackerStep['state'] => (i < at ? 'done' : i === at && !cancelled ? 'current' : 'todo')
  const name = p.responsibleTechnician?.fullName
  return [
    { label: 'Phân công kỹ thuật viên', detail: name, state: state(0) },
    {
      label: 'Kỹ thuật viên nhận việc',
      detail: p.responsibleTechnician?.acceptedAt ? formatMoment(p.responsibleTechnician.acceptedAt) : undefined,
      state: state(1),
    },
    {
      label: 'Thi công',
      detail: p.startedAt
        ? `Bắt đầu ${formatMoment(p.startedAt)}`
        : p.scheduledStartsAt
          ? formatMoment(p.scheduledStartsAt)
          : undefined,
      state: state(2),
    },
    {
      label: 'Khách nghiệm thu',
      detail: p.acceptanceRequestedAt ? `Báo cáo ${formatMoment(p.acceptanceRequestedAt)}` : undefined,
      state: state(3),
    },
    { label: 'Bàn giao', detail: p.handoverAt ? formatMoment(p.handoverAt) : undefined, state: state(4) },
  ]
}

// Việc tiếp theo và ai làm. Đỏ chỉ khi quản lý phải làm
function nextStep(p: InstallationStaffView): TrackerNext {
  const name = p.responsibleTechnician?.fullName || 'Kỹ thuật viên'
  const when = formatInterval(p.scheduledStartsAt, p.scheduledEndsAt)
  const blocking = blockingChecklist(p.checklist)
  if (p.status === 'CANCELLED')
    return {
      tone: 'neutral',
      title: 'Dự án đã huỷ',
      body: [p.cancelledAt ? `Huỷ lúc ${formatMoment(p.cancelledAt)}.` : null, p.cancellationReason]
        .filter(Boolean)
        .join(' '),
    }
  if (p.status === 'COMPLETED')
    return { tone: 'neutral', title: 'Khách đã nghiệm thu, dự án đã bàn giao', body: formatMoment(p.handoverAt) }
  if (p.status === 'PENDING_ASSIGNMENT')
    return {
      tone: 'danger',
      title: 'Cần bạn phân công kỹ thuật viên',
      body: 'Chọn thời gian thi công rồi chọn kỹ thuật viên ở khối Kỹ thuật viên và lịch thi công.',
    }
  if (scheduleExpired(p.status, p.scheduledEndsAt))
    return {
      tone: 'danger',
      title: 'Đã hết khung thi công mà chưa bắt đầu',
      body: 'Kỹ thuật viên không bắt đầu được nữa. Đổi lịch ở khối Kỹ thuật viên và lịch thi công.',
    }
  if (p.status === 'SCHEDULED' && blocking.length > 0)
    return {
      tone: 'danger',
      title: `${blocking.length} hạng mục checklist bắt buộc chưa xong`,
      body: 'Kỹ thuật viên chưa bắt đầu thi công được cho tới khi các mục bắt buộc là Đã đạt hoặc Không áp dụng.',
    }
  if (p.responsibleTechnician?.assignmentStatus === 'PENDING')
    return {
      tone: 'info',
      title: `Chờ ${name} nhận việc`,
      body:
        blocking.length > 0
          ? `${when}. Còn ${blocking.length} hạng mục checklist bắt buộc chưa xong, cần xong trước ngày thi công.`
          : `${when}. Kỹ thuật viên từ chối thì dự án quay về chờ phân công.`,
    }
  if (p.status === 'SCHEDULED') return { tone: 'ok', title: `${name} sẽ thi công`, body: when }
  if (p.status === 'IN_PROGRESS')
    return { tone: 'info', title: `${name} đang thi công`, body: 'Kỹ thuật viên gửi báo cáo hoàn thành khi xong.' }
  if (p.status === 'REWORK_REQUIRED')
    return {
      tone: 'info',
      title: `${name} đang sửa lại`,
      body: 'Kỹ thuật viên thêm ảnh mới rồi gửi báo cáo lượt sau cho khách nghiệm thu.',
    }
  return {
    tone: 'info',
    title: 'Chờ khách nghiệm thu',
    body: 'Báo cáo sai hoặc thiếu thì trả về làm lại ở khối Báo cáo hoàn thành. Khách không phản hồi thì gọi khách.',
  }
}

function SiteAside({ project }: { project: InstallationStaffView }) {
  const site = project.site
  const map = siteMapUrl(site)
  return (
    <PanelAside aria-label="Khách hàng và công trình">
      <Panel>
        <PanelHeader title="Khách hàng và công trình" />
        <PanelBody>
          {site ? (
            <Facts
              column
              items={[
                { k: 'Khách hàng', v: site.customerName || '—' },
                {
                  k: 'Điện thoại',
                  v: site.customerPhone ? (
                    <a className="tnum ui-link" href={`tel:${site.customerPhone}`}>
                      {site.customerPhone}
                    </a>
                  ) : (
                    '—'
                  ),
                },
                { k: 'Công trình', v: site.propertyName || '—' },
                { k: 'Địa chỉ', v: formatSiteAddress(site) },
                {
                  k: 'Toạ độ',
                  v:
                    site.latitude != null && site.longitude != null && map ? (
                      <a className="tnum ui-link" href={map} target="_blank" rel="noreferrer">
                        {site.latitude}, {site.longitude}
                        <span className="sr-only"> (mở bản đồ ở tab mới)</span>
                      </a>
                    ) : (
                      'Chưa có'
                    ),
                },
                { k: 'Khu vực', v: project.zone?.name ?? 'Chưa thuộc khu vực nào' },
              ]}
            />
          ) : (
            <p className="text-body text-fg-2">Không đọc được thông tin công trình.</p>
          )}
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader title="Hồ sơ" />
        <PanelBody>
          <Facts
            column
            items={[
              { k: 'Mã dự án', v: shortCode(project.projectId) },
              { k: 'Hợp đồng', v: shortCode(project.contractId) },
              { k: 'Yêu cầu khảo sát', v: shortCode(project.surveyRequestId) },
            ]}
          />
        </PanelBody>
      </Panel>
    </PanelAside>
  )
}

// Chi tiết dự án thi công (quản lý và quản trị dùng chung): tình hình, phân công, checklist, nghiệm thu, ảnh, bàn giao
function InstallationProjectPage() {
  const { id } = useParams()
  const query = useInstallationProjectQuery(id)
  const [cancelling, setCancelling] = useState(false)
  usePageCrumb(query.data ? projectTitle(query.data) : null)

  return (
    <QueryBoundary query={query}>
      {(p) => {
        const status = projectStatusMeta(p.status)
        const map = siteMapUrl(p.site)
        const completed = p.status === 'COMPLETED'
        return (
          <>
            <PageHeader
              meta={
                <>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <span className="tnum">Mã {shortCode(p.projectId)}</span>
                </>
              }
              title={projectTitle(p)}
              description={formatSiteAddress(p.site)}
              actions={
                <>
                  {p.site?.customerPhone && (
                    <a className={buttonClass('secondary')} href={`tel:${p.site.customerPhone}`}>
                      <Icon name="call" className="-ml-0.5 text-[20px]" />
                      Gọi {p.site.customerPhone}
                    </a>
                  )}
                  {map && (
                    <a className={buttonClass('secondary')} href={map} target="_blank" rel="noreferrer">
                      <Icon name="map" className="-ml-0.5 text-[20px]" />
                      Xem bản đồ
                      <span className="sr-only"> (mở tab mới)</span>
                    </a>
                  )}
                  {canCancel(p.status) && (
                    <Button icon="cancel" variant="danger" onClick={() => setCancelling(true)}>
                      Huỷ dự án
                    </Button>
                  )}
                </>
              }
            />

            <ProgressTracker steps={trackerSteps(p)} next={nextStep(p)} />

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-4 lg:col-span-2">
                <AssignmentPanel project={p} />
                <ChecklistPanel project={p} />
                <CompletionPanel project={p} />
              </div>
              <SiteAside project={p} />
            </div>

            <div className="mt-6 space-y-4 border-t border-line pt-4">
              {completed ? <HandoverPanel projectId={p.projectId} /> : <AssetsPanel assets={p.assets} />}
              <EvidencePanel projectId={p.projectId} currentRound={p.currentRound} />
              <EventLog events={p.events} />
            </div>

            {cancelling && <CancelProjectDialog project={p} onClose={() => setCancelling(false)} />}
          </>
        )
      }}
    </QueryBoundary>
  )
}

export function ManageInstallationProjectPage() {
  return <InstallationProjectPage />
}

export function AdminInstallationProjectPage() {
  return <InstallationProjectPage />
}
