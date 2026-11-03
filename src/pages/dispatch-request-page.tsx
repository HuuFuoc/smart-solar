import { useState } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { DateField, Field, Radio, Textarea, TimeSelect } from '@/components/common/ui/field'
import { ActivityList, KeyValueList, Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { ProgressTracker, type TrackerNext, type TrackerStep } from '@/components/common/ui/progress-tracker'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { useAuth } from '@/context/AuthProvider'
import {
  dispatchEventLabel,
  dispatchReasonLabel,
  dispatchResolutionLabel,
  dispatchStatusMeta,
  formatWindow,
  isActiveDispatch,
  proposalStatusMeta,
} from '@/features/dispatch/dispatchDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { SurveyStaffPanel } from '@/features/scheduling/SurveyStaffPanel'
import {
  BOOKING_HORIZON_DAYS,
  addDays,
  coverageText,
  formatAppointment,
  formatMoment,
  formatTime,
  ineligibleLabel,
  initialBookingDate,
  schedulingErrorMessage,
  todayVn,
  vnDate,
  vnTimestamp,
} from '@/features/scheduling/schedulingDisplay'
import {
  useDispatchCandidatesQuery,
  useDispatchRequestQuery,
  useDispatchTechnicianMutation,
  useResolveDispatchMutation,
  useWithdrawProposalMutation,
} from '@/hooks/useDispatch'
import type { DispatchCandidateView, DispatchStaffView, StaffProposalView } from '@/types/res/dispatchRes'

const REASON_MAX = 500

// Các bước theo góc nhìn nhân viên và việc tiếp theo. Đỏ khi tới lượt nhân viên xếp người
function tracker(d: DispatchStaffView): { steps: TrackerStep[]; next: TrackerNext } {
  const r = d.request
  const accepted = d.proposals.find((p) => p.status === 'ACCEPTED')
  const live = r.liveProposal
  const assigned = r.status === 'ASSIGNED'
  const steps: TrackerStep[] = [
    { label: 'Khách gửi yêu cầu', detail: formatMoment(r.createdAt), state: 'done' },
    {
      label: 'Xếp kỹ thuật viên',
      detail: live ? live.technicianName : (accepted?.technicianName ?? undefined),
      state: r.status === 'OPEN' ? 'current' : r.status === 'PROPOSAL_PENDING' || assigned ? 'done' : 'todo',
    },
    {
      label: 'Có lịch khảo sát',
      detail: accepted ? formatAppointment(accepted.startsAt, accepted.endsAt) : undefined,
      state: assigned ? 'done' : r.status === 'PROPOSAL_PENDING' ? 'current' : 'todo',
    },
  ]
  if (r.status === 'OPEN')
    return {
      steps,
      next: {
        tone: 'danger',
        title: r.sla.overdue
          ? `Quá hạn phản hồi từ ${formatMoment(r.sla.reviewDueAt)}`
          : `Xếp kỹ thuật viên trước ${formatMoment(r.sla.reviewDueAt)}`,
        body: 'Chọn giờ rồi phân công thẳng, hoặc gửi đề xuất để khách đồng ý.',
        action: { label: 'Xếp kỹ thuật viên', icon: 'person_search', target: 'dispatch-assign' },
      },
    }
  if (r.status === 'PROPOSAL_PENDING' && live)
    return {
      steps,
      next: {
        tone: 'info',
        title: `Chờ khách trả lời trước ${formatMoment(live.expiresAt)}`,
        body: `Đề xuất ${formatAppointment(live.startsAt, live.endsAt)}, ${live.technicianName}.`,
      },
    }
  if (assigned)
    return {
      steps,
      next: {
        tone: 'ok',
        title: 'Đã có lịch khảo sát',
        body: accepted
          ? `${formatAppointment(accepted.startsAt, accepted.endsAt)}, ${accepted.technicianName}.`
          : undefined,
      },
    }
  return {
    steps,
    next: {
      tone: 'neutral',
      title: dispatchResolutionLabel(d.resolution) ?? dispatchStatusMeta(r.status).label,
      body: d.resolutionReason ?? undefined,
    },
  }
}

/** Lý do trước khi rút đề xuất, đánh dấu không phục vụ được hoặc đóng yêu cầu */
function ReasonDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  required,
  busy,
  error,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: string
  confirmLabel: string
  required: boolean
  busy: boolean
  error: string | null
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const [missing, setMissing] = useState(false)
  return (
    <ModalDialog open={open} onOpenChange={onOpenChange} dismissible={!busy} aria-label={title}>
      <DialogTitle>{title}</DialogTitle>
      <p className="mt-2 text-body text-fg-2">{body}</p>
      <Field
        label="Lý do"
        htmlFor="dispatch-staff-reason"
        required={required}
        hint={`${required ? 'Bắt buộc' : 'Không bắt buộc'}, tối đa ${REASON_MAX} ký tự.`}
        error={(missing ? 'Ghi lý do.' : error) ?? undefined}
        className="mt-4"
      >
        <Textarea
          id="dispatch-staff-reason"
          rows={3}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value)
            setMissing(false)
          }}
        />
      </Field>
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>
          Quay lại
        </Button>
        <Button
          icon="check"
          variant="danger"
          disabled={busy}
          onClick={() => (required && !reason.trim() ? setMissing(true) : onConfirm(reason.trim()))}
        >
          {busy ? 'Đang lưu…' : confirmLabel}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

function CandidateOption({
  candidate: c,
  checked,
  onChange,
}: {
  candidate: DispatchCandidateView
  checked: boolean
  onChange: () => void
}) {
  const zones = c.zones.map((z) => z.name).join(', ') || 'Chưa thuộc khu vực nào'
  const load = `${c.commitmentsThatDay}/${c.maxAppointmentsPerDay} lịch trong ngày`
  return (
    <Radio
      name="dispatch-technician"
      value={c.technicianUserId}
      checked={checked}
      onChange={onChange}
      label={c.fullName}
      description={`${zones}, ${load}`}
    />
  )
}

// Chọn giờ rồi chọn người: thành viên khu vực trước, người khu khác sau (phải cho phép kèm lý do)
function AssignPanel({ dispatch: d }: { dispatch: DispatchStaffView }) {
  const id = d.request.dispatchRequestId
  const first = d.preferredWindows[0]
  const today = todayVn()
  const [date, setDate] = useState(() => (first ? vnDate(first.startsAt) : initialBookingDate()))
  const [time, setTime] = useState(() => (first ? formatTime(first.startsAt) : '08:00'))
  const startsAt = vnTimestamp(date, time)
  const candidates = useDispatchCandidatesQuery(id, startsAt)
  const [picked, setPicked] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const save = useDispatchTechnicianMutation()
  const list = candidates.data?.candidates ?? []
  const selected = list.find((c) => c.technicianUserId === picked && c.isEligible) ?? null
  const crossZone = selected?.crossZone ?? false
  // Chỉ người nhận được giờ này mới chọn được; người còn lại gom lại kèm lý do
  const inZone = list.filter((c) => c.isEligible && !c.crossZone)
  const outZone = list.filter((c) => c.isEligible && c.crossZone)
  const blocked = list.filter((c) => !c.isEligible)

  async function submit(propose: boolean) {
    if (!selected || !candidates.data) return setError('Chọn kỹ thuật viên.')
    if (!reason.trim() && (!propose || crossZone))
      return setError(crossZone ? 'Ghi lý do cho phép kỹ thuật viên ngoài khu vực.' : 'Ghi lý do phân công.')
    setError(null)
    try {
      await save.mutateAsync({
        id,
        propose,
        body: {
          technicianUserId: selected.technicianUserId,
          startsAt: candidates.data.startsAt,
          crossZoneAuthorized: crossZone,
          reason: reason.trim() || null,
          expectedRevision: d.request.revision,
        },
      })
      const when = formatAppointment(candidates.data.startsAt, candidates.data.endsAt)
      toast.success(propose ? `Đã gửi đề xuất ${when} cho khách.` : `Đã phân công ${selected.fullName}, ${when}.`)
    } catch (e) {
      setPicked(null)
      setError(schedulingErrorMessage(e))
    }
  }

  const pick = (technicianUserId: string) => {
    setPicked(technicianUserId)
    setError(null)
  }

  return (
    <Panel id="dispatch-assign" className="scroll-mt-6" raised>
      <PanelHeader title="Xếp kỹ thuật viên" />
      <PanelBody className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Ngày" htmlFor="dispatch-assign-date" className="w-full sm:w-48">
            <DateField
              id="dispatch-assign-date"
              min={today}
              max={addDays(today, BOOKING_HORIZON_DAYS - 1)}
              value={date}
              onChange={(value) => {
                if (!value) return
                setDate(value)
                setPicked(null)
              }}
            />
          </Field>
          <Field label="Giờ bắt đầu" htmlFor="dispatch-assign-time" className="w-full sm:w-36">
            <TimeSelect
              id="dispatch-assign-time"
              from="07:00"
              to="17:00"
              value={time}
              onChange={(value) => {
                setTime(value)
                setPicked(null)
              }}
            />
          </Field>
        </div>
        {candidates.isPending ? (
          <div aria-label="Đang tìm kỹ thuật viên" className="space-y-2">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : candidates.isError ? (
          <ErrorState
            title="Không tìm được kỹ thuật viên cho giờ này."
            message={schedulingErrorMessage(candidates.error)}
            onRetry={() => void candidates.refetch()}
          />
        ) : list.length === 0 ? (
          <Notice tone="warn">Chưa có kỹ thuật viên nào. Thêm kỹ thuật viên ở mục Kỹ thuật viên.</Notice>
        ) : (
          <div className="space-y-4">
            {inZone.length + outZone.length === 0 && (
              <Notice tone="warn">Không kỹ thuật viên nào nhận được giờ này. Thử giờ hoặc ngày khác.</Notice>
            )}
            {inZone.length > 0 && (
              <fieldset className="space-y-3">
                <legend className="mb-2 text-body font-medium text-fg">Trong khu vực của công trình</legend>
                {inZone.map((c) => (
                  <CandidateOption
                    key={c.technicianUserId}
                    candidate={c}
                    checked={picked === c.technicianUserId}
                    onChange={() => pick(c.technicianUserId)}
                  />
                ))}
              </fieldset>
            )}
            {outZone.length > 0 && (
              <fieldset className="space-y-3">
                <legend className="mb-2 text-body font-medium text-fg">Ngoài khu vực</legend>
                {outZone.map((c) => (
                  <CandidateOption
                    key={c.technicianUserId}
                    candidate={c}
                    checked={picked === c.technicianUserId}
                    onChange={() => pick(c.technicianUserId)}
                  />
                ))}
              </fieldset>
            )}
            {blocked.length > 0 && (
              <details className="border-t border-line pt-3">
                <summary className="tap w-fit cursor-pointer text-body font-medium text-accent-fg underline-offset-4 hover:underline">
                  Không nhận được giờ này ({blocked.length})
                </summary>
                <ul className="mt-2 space-y-1 text-meta text-fg-2">
                  {blocked.map((c) => (
                    <li key={c.technicianUserId}>
                      {c.fullName}: {ineligibleLabel(c.reason) ?? 'bận'}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        {crossZone && (
          <Notice tone="warn">
            {selected?.fullName} không thuộc khu vực của công trình. Ghi lý do cho phép; lý do được lưu vào lịch sử.
          </Notice>
        )}
        <Field
          label="Lý do"
          htmlFor="dispatch-assign-reason"
          hint={`Bắt buộc khi phân công thẳng hoặc chọn người ngoài khu vực, tối đa ${REASON_MAX} ký tự.`}
        >
          <Textarea
            id="dispatch-assign-reason"
            rows={2}
            maxLength={REASON_MAX}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setError(null)
            }}
          />
        </Field>
      </PanelBody>
      <PanelFooter className="justify-end">
        {error && (
          <p className="basis-full text-body font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <Button icon="send" variant="soft" disabled={!selected || save.isPending} onClick={() => void submit(true)}>
          Gửi đề xuất cho khách
        </Button>
        <Button
          icon="assignment_ind"
          variant="primary"
          disabled={!selected || save.isPending}
          onClick={() => void submit(false)}
        >
          {save.isPending ? 'Đang lưu…' : selected ? `Phân công ${selected.fullName}` : 'Phân công'}
        </Button>
      </PanelFooter>
    </Panel>
  )
}

/** Đề xuất đang chờ khách: nhân viên rút được nếu cần đổi giờ */
function LiveProposalPanel({ dispatch: d, proposal: p }: { dispatch: DispatchStaffView; proposal: StaffProposalView }) {
  const withdraw = useWithdrawProposalMutation()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm(reason: string) {
    setError(null)
    try {
      await withdraw.mutateAsync({ id: d.request.dispatchRequestId, proposalId: p.proposalId, reason: reason || null })
      toast.success('Đã rút đề xuất. Yêu cầu quay về chờ xếp kỹ thuật viên.')
      setOpen(false)
    } catch (e) {
      setError(schedulingErrorMessage(e))
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Đề xuất đang chờ khách"
        action={
          <Button
            size="sm"
            variant="danger"
            icon="undo"
            onClick={() => {
              setError(null)
              setOpen(true)
            }}
          >
            Rút đề xuất
          </Button>
        }
      />
      <PanelBody>
        <KeyValueList
          columns={2}
          items={[
            { k: 'Giờ đề xuất', v: formatAppointment(p.startsAt, p.endsAt) },
            { k: 'Kỹ thuật viên', v: p.crossZone ? `${p.technicianName} (ngoài khu vực)` : p.technicianName },
            { k: 'Khách trả lời trước', v: formatMoment(p.expiresAt) },
            { k: 'Gửi lúc', v: formatMoment(p.createdAt) },
          ]}
        />
      </PanelBody>
      <ReasonDialog
        key={String(open)}
        open={open}
        onOpenChange={setOpen}
        title="Rút đề xuất?"
        body="Khách không trả lời đề xuất này được nữa. Yêu cầu quay về chờ xếp kỹ thuật viên."
        confirmLabel="Rút đề xuất"
        required={false}
        busy={withdraw.isPending}
        error={error}
        onConfirm={(reason) => void confirm(reason)}
      />
    </Panel>
  )
}

function ProposalHistory({ proposals }: { proposals: StaffProposalView[] }) {
  return (
    <ul className="divide-y divide-line">
      {proposals.map((p) => {
        const status = proposalStatusMeta(p.status)
        return (
          <li key={p.proposalId} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium text-fg">{formatAppointment(p.startsAt, p.endsAt)}</p>
              <p className="text-meta text-fg-2">
                {p.technicianName}
                {p.crossZone ? ', ngoài khu vực' : ''}, gửi {formatMoment(p.createdAt)}
              </p>
            </div>
            <Badge tone={status.tone}>{status.label}</Badge>
          </li>
        )
      })}
    </ul>
  )
}

// Chi tiết một yêu cầu điều phối cho quản lý / quản trị
function DispatchRequestPage() {
  const { id } = useParams()
  const query = useDispatchRequestQuery(id)
  const resolve = useResolveDispatchMutation()
  const isAdmin = useAuth().user?.role === 'admin'
  const [resolving, setResolving] = useState<'unserviceable' | 'close' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const openResolve = (which: 'unserviceable' | 'close') => {
    setError(null)
    setResolving(which)
  }
  usePageCrumb(query.data ? query.data.request.propertyName || 'Công trình chưa đặt tên' : null)

  return (
    <QueryBoundary query={query}>
      {(d) => {
        const r = d.request
        const status = dispatchStatusMeta(r.status)
        const active = isActiveDispatch(r.status)
        const { steps, next } = tracker(d)

        async function confirmResolve(reason: string) {
          if (!resolving) return
          setError(null)
          try {
            await resolve.mutateAsync({
              id: r.dispatchRequestId,
              reason,
              revision: r.revision,
              unserviceable: resolving === 'unserviceable',
            })
            toast.success(resolving === 'unserviceable' ? 'Đã báo khách là chưa phục vụ được.' : 'Đã đóng yêu cầu.')
            setResolving(null)
          } catch (e) {
            setError(schedulingErrorMessage(e))
          }
        }

        return (
          <>
            <PageHeader
              meta={
                <>
                  <Badge tone={next.tone === 'danger' ? 'neutral' : status.tone}>{status.label}</Badge>
                  <span className="tnum">Mã {shortCode(r.dispatchRequestId)}</span>
                </>
              }
              title={r.propertyName || 'Công trình chưa đặt tên'}
              description={[r.customerName, r.zone?.name ?? 'Chưa thuộc khu vực nào', r.province]
                .filter(Boolean)
                .join(', ')}
              actions={
                active ? (
                  <>
                    <Button variant="warn" icon="block" onClick={() => openResolve('unserviceable')}>
                      Không phục vụ được
                    </Button>
                    <Button variant="danger" icon="close" onClick={() => openResolve('close')}>
                      Đóng yêu cầu
                    </Button>
                  </>
                ) : undefined
              }
            />

            <ProgressTracker steps={steps} next={next} />

            <div className="mt-6 space-y-4">
              <Panel>
                <PanelHeader title="Khách muốn" />
                <PanelBody className="space-y-4">
                  <KeyValueList
                    columns={2}
                    items={[
                      { k: 'Vì sao cần xếp', v: dispatchReasonLabel(r.reason) },
                      { k: 'Gửi lúc', v: formatMoment(r.createdAt) },
                      {
                        k: 'Khung giờ tiện',
                        v: d.preferredWindows.length ? (
                          <ul className="space-y-0.5">
                            {d.preferredWindows.map((w) => (
                              <li key={w.startsAt}>{formatWindow(w)}</li>
                            ))}
                          </ul>
                        ) : (
                          'Không chọn'
                        ),
                      },
                      { k: 'Ghi chú của khách', v: d.customerNote || '—' },
                    ]}
                  />
                  {active && d.currentCoverageStatus === 'COVERED' && (
                    <Notice tone="info">
                      Khu vực của công trình nay đã có kỹ thuật viên nhận lịch, khách cũng tự đặt giờ được.
                    </Notice>
                  )}
                  {active &&
                    d.currentCoverageStatus !== 'COVERED' &&
                    d.currentCoverageStatus !== r.reason &&
                    coverageText(d.currentCoverageStatus) && (
                      <p className="text-meta text-fg-2">Hiện tại: {coverageText(d.currentCoverageStatus)}</p>
                    )}
                </PanelBody>
              </Panel>

              {r.status === 'OPEN' && <AssignPanel key={r.dispatchRequestId} dispatch={d} />}
              {r.status === 'PROPOSAL_PENDING' && r.liveProposal && (
                <LiveProposalPanel dispatch={d} proposal={r.liveProposal} />
              )}

              <SurveyStaffPanel surveyRequestId={r.surveyRequestId} canChangeSales={isAdmin} />

              {d.proposals.length > 0 && (
                <Panel>
                  <PanelHeader title="Các đề xuất" />
                  <PanelBody>
                    <ProposalHistory proposals={d.proposals} />
                  </PanelBody>
                </Panel>
              )}

              {d.events.length > 0 && (
                <Panel>
                  <PanelHeader title="Lịch sử" />
                  <PanelBody>
                    <ActivityList
                      items={[...d.events].reverse().map((e) => ({
                        title: dispatchEventLabel(e.eventType),
                        time: formatMoment(e.createdAt),
                      }))}
                    />
                  </PanelBody>
                </Panel>
              )}
            </div>

            <ReasonDialog
              key={resolving ?? 'closed'}
              open={resolving !== null}
              onOpenChange={(open) => !open && setResolving(null)}
              title={resolving === 'unserviceable' ? 'Không phục vụ được công trình này?' : 'Đóng yêu cầu?'}
              body={
                resolving === 'unserviceable'
                  ? 'Khách được báo là Smart Solar chưa phục vụ được khu vực này, kèm lý do bạn ghi.'
                  : 'Yêu cầu kết thúc mà không có lịch. Khách vẫn đặt giờ hoặc gửi lại yêu cầu được.'
              }
              confirmLabel={resolving === 'unserviceable' ? 'Không phục vụ được' : 'Đóng yêu cầu'}
              required
              busy={resolve.isPending}
              error={error}
              onConfirm={(reason) => void confirmResolve(reason)}
            />
          </>
        )
      }}
    </QueryBoundary>
  )
}

export function ManageDispatchRequestPage() {
  return <DispatchRequestPage />
}

export function AdminDispatchRequestPage() {
  return <DispatchRequestPage />
}
