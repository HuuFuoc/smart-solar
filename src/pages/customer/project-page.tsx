import { useState } from 'react'
import { useParams } from 'react-router'
import { ACCEPTANCE_CHOICES, type AcceptanceChoice } from '@/common/installation'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { KeyValueList } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelAside, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ProgressTracker, type TrackerNext, type TrackerStep } from '@/components/common/ui/progress-tracker'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { ProjectAfterSalesPanel } from '@/features/after-sales/ProjectAfterSalesPanel'
import { AcceptanceDialog } from '@/features/installations/AcceptanceDialog'
import { EvidenceGallery } from '@/features/installations/EvidenceGallery'
import {
  acceptanceDecisionMeta,
  assetTypeLabel,
  awaitsCustomerDecision,
  deciderLabel,
  formatDateOnly,
  formatInstallationWindow,
  formatWarrantyMonths,
  installationStatusMeta,
  pendingAcceptance,
} from '@/features/installations/installationDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  useEvidenceUrlFetcher,
  useHandoverQuery,
  useInstallationEvidenceQuery,
  useMyInstallationQuery,
} from '@/hooks/useCustomerInstallations'
import type {
  AcceptanceView,
  AssetView,
  HandoverAssetView,
  InstallationCustomerView,
} from '@/types/res/customerInstallationsRes'

// Bước khách thấy: xếp kỹ thuật viên → lắp đặt (kể cả sửa lại) → nghiệm thu → bàn giao
const STAGE: Record<string, number> = {
  PENDING_ASSIGNMENT: 0,
  PENDING_TECHNICIAN_ACCEPTANCE: 0,
  SCHEDULED: 1,
  IN_PROGRESS: 1,
  REWORK_REQUIRED: 1,
  PENDING_CUSTOMER_ACCEPTANCE: 2,
  COMPLETED: 3,
}

function stepState(stage: number, step: number): TrackerStep['state'] {
  if (stage > step) return 'done'
  return stage === step ? 'current' : 'todo'
}

function trackerSteps(p: InstallationCustomerView): TrackerStep[] {
  // Đã huỷ: không bước nào đang chạy
  const stage = STAGE[p.status] ?? -1
  const range = formatInstallationWindow(p.scheduledStartsAt, p.scheduledEndsAt)
  return [
    { label: 'Xếp kỹ thuật viên', detail: p.technicianName ?? undefined, state: stepState(stage, 0) },
    {
      label: p.status === 'REWORK_REQUIRED' ? 'Sửa lại' : 'Lắp đặt',
      detail: p.startedAt ? `Bắt đầu ${formatMoment(p.startedAt)}` : (range ?? undefined),
      state: stepState(stage, 1),
    },
    {
      label: 'Nghiệm thu',
      detail: p.acceptanceRequestedAt ? `Báo cáo ${formatMoment(p.acceptanceRequestedAt)}` : undefined,
      state: stepState(stage, 2),
    },
    {
      label: 'Bàn giao',
      detail: p.handoverAt ? formatMoment(p.handoverAt) : undefined,
      state: p.status === 'COMPLETED' ? 'done' : 'todo',
    },
  ]
}

/** Lần sửa lại gần nhất, để nói cho khách biết kỹ thuật viên đang sửa gì */
function lastRework(p: InstallationCustomerView) {
  return [...p.acceptances].reverse().find((a) => a.decision === 'REWORK_REQUESTED') ?? null
}

// Đỏ khi khách phải làm, xanh dương khi chờ người khác, xanh lá khi đã ổn
function nextStep(p: InstallationCustomerView): TrackerNext {
  const range = formatInstallationWindow(p.scheduledStartsAt, p.scheduledEndsAt)
  if (awaitsCustomerDecision(p))
    return {
      tone: 'danger',
      title: 'Bạn cần nghiệm thu công trình',
      body: 'Đọc báo cáo hoàn thành, xem ảnh thi công và thiết bị đã lắp, rồi chọn Nghiệm thu hoặc Yêu cầu sửa lại.',
    }
  switch (p.status) {
    case 'PENDING_ASSIGNMENT':
      return {
        tone: 'info',
        title: 'Smart Solar đang xếp kỹ thuật viên',
        body: 'Lịch lắp đặt và tên kỹ thuật viên hiện ở đây khi có người nhận việc.',
      }
    case 'PENDING_TECHNICIAN_ACCEPTANCE':
      return {
        tone: 'info',
        title: 'Chờ kỹ thuật viên nhận việc',
        body: range ? `Lịch dự kiến: ${range}.` : undefined,
      }
    case 'SCHEDULED':
      return {
        tone: 'ok',
        title: `${p.technicianName ?? 'Kỹ thuật viên'} sẽ lắp đặt tại công trình`,
        body: range ?? undefined,
      }
    case 'IN_PROGRESS':
      return {
        tone: 'info',
        title: 'Đang lắp đặt',
        body: 'Xong việc, kỹ thuật viên gửi báo cáo hoàn thành để bạn nghiệm thu.',
      }
    case 'REWORK_REQUIRED': {
      const rework = lastRework(p)
      return {
        tone: 'info',
        title: 'Kỹ thuật viên đang sửa lại',
        body:
          rework?.decidedBy === 'STAFF'
            ? 'Quản lý đã trả báo cáo về để kỹ thuật viên bổ sung. Sửa xong bạn sẽ nghiệm thu lại.'
            : 'Sửa xong, kỹ thuật viên gửi báo cáo mới để bạn nghiệm thu lại.',
      }
    }
    case 'COMPLETED':
      return {
        tone: 'ok',
        title: 'Công trình đã bàn giao',
        body: 'Thiết bị có vấn đề hoặc cần bảo trì thì gửi yêu cầu ở mục Bảo hành, sửa chữa.',
      }
    case 'CANCELLED':
      return {
        tone: 'neutral',
        title: 'Công trình đã huỷ',
        body: 'Liên hệ bộ phận kinh doanh nếu bạn cần biết thêm.',
      }
    default:
      return { tone: 'neutral', title: installationStatusMeta(p.status, 'customer').label }
  }
}

function AcceptancePanel({ pending, onDecide }: { pending: AcceptanceView; onDecide: (c: AcceptanceChoice) => void }) {
  return (
    <Panel>
      <PanelHeader
        title="Nghiệm thu lắp đặt"
        description={`Báo cáo hoàn thành lần ${pending.round}, gửi ${formatMoment(pending.requestedAt)}`}
      />
      <PanelBody className="space-y-4">
        <p className="max-w-[72ch] text-body whitespace-pre-line text-fg">{pending.completionReport}</p>
        <p className="text-body text-fg-2">Xem ảnh thi công và thiết bị đã lắp bên dưới trước khi quyết định.</p>
        <div className="flex flex-wrap gap-3">
          <Button icon="check_circle" variant="primary" onClick={() => onDecide(ACCEPTANCE_CHOICES.accept)}>
            Nghiệm thu
          </Button>
          <Button icon="replay" variant="secondary" onClick={() => onDecide(ACCEPTANCE_CHOICES.requestRework)}>
            Yêu cầu sửa lại
          </Button>
        </div>
      </PanelBody>
    </Panel>
  )
}

function EvidencePanel({ projectId }: { projectId: string }) {
  const evidence = useInstallationEvidenceQuery(projectId)
  const getUrl = useEvidenceUrlFetcher(projectId)
  return (
    <Panel>
      <PanelHeader
        title="Ảnh thi công"
        description={evidence.data && evidence.data.length > 0 ? `${evidence.data.length} ảnh` : undefined}
      />
      <PanelBody>
        {evidence.isPending ? (
          <Skeleton className="h-40" />
        ) : evidence.data === undefined ? (
          <ErrorState
            title="Không tải được ảnh thi công."
            message={evidence.error?.message}
            onRetry={() => void evidence.refetch()}
          />
        ) : (
          <EvidenceGallery items={evidence.data} getUrl={getUrl} emptyText="Kỹ thuật viên chưa gửi ảnh thi công." />
        )}
      </PanelBody>
    </Panel>
  )
}

/** Bảng thiết bị; khi đã bàn giao có thêm cột hạn bảo hành do backend tính từ ngày bàn giao */
function AssetTable({ assets }: { assets: (AssetView | HandoverAssetView)[] }) {
  const handedOver = assets.some((a) => 'warrantyEndsOn' in a)
  return (
    <Table stack>
      <thead>
        <tr>
          <Th>Thiết bị</Th>
          <Th>Hãng, model</Th>
          <Th>Số serial</Th>
          <Th>Vị trí</Th>
          <Th>Bảo hành</Th>
          {handedOver && <Th>Bảo hành đến</Th>}
        </tr>
      </thead>
      <tbody>
        {assets.map((a) => (
          <Tr key={'assetId' in a ? a.assetId : `${a.manufacturer}-${a.serialNumber}`}>
            <Td label="Thiết bị" className="font-medium text-fg">
              {assetTypeLabel(a.assetType)}
            </Td>
            <Td label="Hãng, model">
              {a.manufacturer} {a.model}
            </Td>
            <Td label="Số serial" className="tnum">
              {a.serialNumber}
            </Td>
            <Td label="Vị trí">{a.positionCode || '—'}</Td>
            <Td label="Bảo hành">{formatWarrantyMonths(a.warrantyMonths)}</Td>
            {handedOver && (
              <Td label="Bảo hành đến" className="tnum">
                {'warrantyEndsOn' in a ? formatDateOnly(a.warrantyEndsOn) : '—'}
              </Td>
            )}
          </Tr>
        ))}
      </tbody>
    </Table>
  )
}

function HandoverPanel({ projectId }: { projectId: string }) {
  const handover = useHandoverQuery(projectId, true)
  const h = handover.data
  return (
    <Panel>
      <PanelHeader
        title="Bàn giao"
        description={
          h
            ? `Bàn giao ${formatMoment(h.handoverAt)}${h.technicianName ? `, kỹ thuật viên ${h.technicianName}` : ''}`
            : undefined
        }
      />
      <PanelBody>
        {handover.isPending ? (
          <Skeleton className="h-32" />
        ) : !h ? (
          <ErrorState
            title="Không tải được thông tin bàn giao."
            message={handover.error?.message}
            onRetry={() => void handover.refetch()}
          />
        ) : h.assets.length === 0 ? (
          <p className="text-body text-fg-2">Biên bản bàn giao chưa ghi thiết bị nào.</p>
        ) : (
          <AssetTable assets={h.assets} />
        )}
      </PanelBody>
    </Panel>
  )
}

function SchedulePanel({ p }: { p: InstallationCustomerView }) {
  const items = [
    {
      k: 'Lịch lắp đặt',
      v: formatInstallationWindow(p.scheduledStartsAt, p.scheduledEndsAt) ?? 'Chưa có lịch',
    },
    { k: 'Kỹ thuật viên', v: p.technicianName ?? 'Chưa có người nhận việc' },
  ]
  if (p.startedAt) items.push({ k: 'Bắt đầu thi công', v: formatMoment(p.startedAt) })
  if (p.completedAt) items.push({ k: 'Nghiệm thu xong', v: formatMoment(p.completedAt) })
  if (p.cancelledAt) items.push({ k: 'Huỷ lúc', v: formatMoment(p.cancelledAt) })
  return (
    <Panel>
      <PanelHeader title="Lịch lắp đặt" />
      <PanelBody>
        <KeyValueList items={items} />
      </PanelBody>
    </Panel>
  )
}

function AcceptanceHistory({ acceptances }: { acceptances: AcceptanceView[] }) {
  return (
    <ul className="divide-y divide-line">
      {[...acceptances]
        .sort((a, b) => b.round - a.round)
        .map((a) => {
          const meta = acceptanceDecisionMeta(a)
          const by = deciderLabel(a.decidedBy)
          return (
            <li key={a.round} className="space-y-1 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-body font-medium text-fg">Lần {a.round}</p>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
              <p className="tnum text-meta text-fg-2">
                Báo cáo {formatMoment(a.requestedAt)}
                {a.decidedAt && `, quyết định ${formatMoment(a.decidedAt)}${by ? ` (${by})` : ''}`}
              </p>
              {a.reason && <p className="text-body whitespace-pre-line text-fg-2">{a.reason}</p>}
              {a.decision !== 'PENDING' && (
                <details className="text-body">
                  <summary className="tap cursor-pointer text-fg-2 hover:text-fg">Báo cáo hoàn thành</summary>
                  <p className="mt-1 whitespace-pre-line text-fg">{a.completionReport}</p>
                </details>
              )}
            </li>
          )
        })}
    </ul>
  )
}

// Chi tiết công trình lắp đặt của khách: tiến độ, ảnh thi công, thiết bị, nghiệm thu, bàn giao
// Chỉ hiện nút nghiệm thu khi backend cho phép (chờ khách nghiệm thu và còn báo cáo chưa quyết)
export function CustomerProjectPage() {
  const { id } = useParams()
  const query = useMyInstallationQuery(id)
  // Giữ cả số lần trong state: tải lại sau lỗi có thể làm mất lần đang chờ khi hộp thoại còn mở
  const [dialog, setDialog] = useState<{ choice: AcceptanceChoice; round: number } | null>(null)
  usePageCrumb(query.data ? `Công trình ${shortCode(query.data.projectId)}` : null)

  return (
    <QueryBoundary query={query}>
      {(p) => {
        const status = installationStatusMeta(p.status, 'customer')
        const next = nextStep(p)
        const pending = awaitsCustomerDecision(p) ? pendingAcceptance(p) : null
        const completed = p.status === 'COMPLETED'
        return (
          <>
            <PageHeader
              meta={
                <>
                  {/* Việc cần làm đã báo đỏ ở khối Tình hình, nhãn trạng thái không đỏ lần nữa */}
                  <Badge tone={next.tone === 'danger' ? 'neutral' : status.tone}>{status.label}</Badge>
                  <span className="tnum">Hợp đồng {shortCode(p.contractId)}</span>
                </>
              }
              title={
                <>
                  Công trình <span className="tnum">{shortCode(p.projectId)}</span>
                </>
              }
            />

            <div className="space-y-6">
              <ProgressTracker steps={trackerSteps(p)} next={next} />

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="min-w-0 space-y-4 lg:col-span-2">
                  {pending && (
                    <AcceptancePanel
                      pending={pending}
                      onDecide={(choice) => setDialog({ choice, round: pending.round })}
                    />
                  )}
                  {completed && <ProjectAfterSalesPanel projectId={p.projectId} />}
                  {completed && <HandoverPanel projectId={p.projectId} />}
                  <EvidencePanel projectId={p.projectId} />
                  {!completed && p.assets.length > 0 && (
                    <Panel>
                      <PanelHeader title="Thiết bị đã lắp" description={`${p.assets.length} thiết bị`} />
                      <PanelBody>
                        <AssetTable assets={p.assets} />
                      </PanelBody>
                    </Panel>
                  )}
                </div>

                <PanelAside aria-label="Lịch lắp đặt và các lần nghiệm thu">
                  <SchedulePanel p={p} />
                  {p.acceptances.length > 0 && (
                    <Panel>
                      <PanelHeader title="Các lần nghiệm thu" />
                      <PanelBody>
                        <AcceptanceHistory acceptances={p.acceptances} />
                      </PanelBody>
                    </Panel>
                  )}
                </PanelAside>
              </div>
            </div>

            <AcceptanceDialog
              projectId={p.projectId}
              round={dialog?.round ?? p.currentRound}
              decision={dialog?.choice ?? null}
              onClose={() => setDialog(null)}
            />
          </>
        )
      }}
    </QueryBoundary>
  )
}
