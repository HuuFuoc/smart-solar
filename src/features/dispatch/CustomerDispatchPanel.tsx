import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Textarea } from '@/components/common/ui/field'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { formatWindow } from '@/features/dispatch/dispatchDisplay'
import {
  formatAppointment,
  formatDay,
  formatMoment,
  formatTimeRange,
  vnDate,
} from '@/features/scheduling/schedulingDisplay'
import { useAnswerProposalMutation, useCancelDispatchMutation } from '@/hooks/useDispatch'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { CustomerDispatchView, CustomerProposalView } from '@/types/res/dispatchRes'

const REASON_MAX = 500

/** Đề xuất trước đó ra sao, để khách biết vì sao lại đang chờ */
function previousProposalText(p: CustomerProposalView) {
  const when = formatAppointment(p.startsAt, p.endsAt)
  if (p.status === 'DECLINED') return `Bạn đã không đồng ý đề xuất ${when}. Smart Solar sẽ gửi giờ khác.`
  if (p.status === 'EXPIRED') return `Đề xuất ${when} đã hết hạn trả lời. Smart Solar sẽ gửi giờ khác.`
  if (p.status === 'FAILED') return `Giờ đề xuất ${when} không còn nhận được nữa. Smart Solar sẽ gửi giờ khác.`
  if (p.status === 'WITHDRAWN') return `Smart Solar đã rút đề xuất ${when} và sẽ gửi giờ khác.`
  return null
}

// Đồng ý mà giờ đó vừa bị lấy: đề xuất thành FAILED, yêu cầu quay về chờ nhân viên
function acceptErrorMessage(error: unknown) {
  const details = isApiError(error) ? (error.details as { proposalStatus?: unknown } | null) : null
  if (details?.proposalStatus === 'FAILED') return 'Giờ này không còn nhận được nữa. Smart Solar sẽ gửi đề xuất khác.'
  return errorMessage(error)
}

/** Hỏi lý do (không bắt buộc) trước khi từ chối đề xuất hoặc huỷ yêu cầu */
function ReasonDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  busy,
  error,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: string
  confirmLabel: string
  busy: boolean
  error: string | null
  onConfirm: (reason: string | null) => void
}) {
  const [reason, setReason] = useState('')
  return (
    <ModalDialog open={open} onOpenChange={onOpenChange} dismissible={!busy} aria-label={title}>
      <DialogTitle>{title}</DialogTitle>
      <p className="mt-2 text-body text-fg-2">{body}</p>
      <Field
        label="Lý do"
        htmlFor="dispatch-reason"
        hint={`Không bắt buộc, tối đa ${REASON_MAX} ký tự.`}
        error={error ?? undefined}
        className="mt-4"
      >
        <Textarea
          id="dispatch-reason"
          rows={3}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>
          Quay lại
        </Button>
        <Button icon="cancel" variant="danger" disabled={busy} onClick={() => onConfirm(reason.trim() || null)}>
          {busy ? 'Đang gửi…' : confirmLabel}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}

// Khách đã nhờ Smart Solar xếp kỹ thuật viên: chờ nhân viên, hoặc trả lời đề xuất giờ
export function CustomerDispatchPanel({ dispatch: d }: { dispatch: CustomerDispatchView }) {
  const answer = useAnswerProposalMutation()
  const cancel = useCancelDispatchMutation()
  const [dialog, setDialog] = useState<'decline' | 'cancel' | null>(null)
  // Lỗi gắn với đề xuất vừa bấm đồng ý, để đề xuất mới gửi tới không hiện lỗi cũ
  const [acceptError, setAcceptError] = useState<{ proposalId: string; text: string } | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const live = d.liveProposal
  const previous = !live && d.latestProposal ? previousProposalText(d.latestProposal) : null
  const error = live && acceptError?.proposalId === live.proposalId ? acceptError.text : null

  const openDialog = (which: 'decline' | 'cancel') => {
    setDialogError(null)
    setDialog(which)
  }

  async function accept(p: CustomerProposalView) {
    setAcceptError(null)
    try {
      await answer.mutateAsync({
        surveyRequestId: d.surveyRequestId,
        proposalId: p.proposalId,
        revision: p.revision,
        accept: true,
      })
      toast.success(`Đã đặt lịch khảo sát ${formatAppointment(p.startsAt, p.endsAt)}.`)
    } catch (e) {
      setAcceptError({ proposalId: p.proposalId, text: acceptErrorMessage(e) })
    }
  }

  async function decline(reason: string | null) {
    if (!live) return
    setDialogError(null)
    try {
      await answer.mutateAsync({
        surveyRequestId: d.surveyRequestId,
        proposalId: live.proposalId,
        revision: live.revision,
        accept: false,
        reason,
      })
      toast.success('Đã báo Smart Solar. Nhân viên sẽ gửi giờ khác.')
      setDialog(null)
    } catch (e) {
      setDialogError(errorMessage(e))
    }
  }

  async function cancelRequest(reason: string | null) {
    setDialogError(null)
    try {
      await cancel.mutateAsync({ surveyRequestId: d.surveyRequestId, reason })
      toast.success('Đã huỷ yêu cầu xếp kỹ thuật viên.')
      setDialog(null)
    } catch (e) {
      setDialogError(errorMessage(e))
    }
  }

  return (
    <Panel raised>
      <PanelHeader
        title={live ? 'Smart Solar đề xuất giờ khảo sát' : 'Đang xếp kỹ thuật viên'}
        description={
          live
            ? `Trả lời trước ${formatMoment(live.expiresAt)}.`
            : `Smart Solar sẽ phản hồi trước ${formatMoment(d.reviewDueAt)}.`
        }
        action={
          <Button size="sm" variant="danger" icon="event_busy" onClick={() => openDialog('cancel')}>
            Huỷ yêu cầu
          </Button>
        }
      />
      <PanelBody className="space-y-4">
        {live && (
          <div className="space-y-4">
            <div>
              <p className="text-title font-semibold text-fg">{formatDay(vnDate(live.startsAt), { year: true })}</p>
              <p className="tnum text-figure font-semibold text-fg">{formatTimeRange(live.startsAt, live.endsAt)}</p>
              <p className="mt-1 text-body text-fg-2">Kỹ thuật viên {live.technicianName}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                icon="event_available"
                variant="primary"
                disabled={answer.isPending}
                onClick={() => void accept(live)}
              >
                {answer.isPending ? 'Đang gửi…' : 'Đồng ý giờ này'}
              </Button>
              <Button
                icon="schedule"
                variant="secondary"
                disabled={answer.isPending}
                onClick={() => openDialog('decline')}
              >
                Không hợp, xin giờ khác
              </Button>
            </div>
            {error && (
              <p className="text-body font-medium text-danger" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
        {previous && <Notice tone="info">{previous}</Notice>}
        <KeyValueList
          items={[
            {
              k: 'Khung giờ bạn tiện',
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
            ...(d.customerNote?.trim() ? [{ k: 'Ghi chú của bạn', v: d.customerNote.trim() }] : []),
            { k: 'Gửi lúc', v: formatMoment(d.createdAt) },
          ]}
        />
      </PanelBody>
      <ReasonDialog
        key={dialog ?? 'closed'}
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        title={dialog === 'decline' ? 'Không hợp giờ đề xuất?' : 'Huỷ yêu cầu xếp kỹ thuật viên?'}
        body={
          dialog === 'decline'
            ? 'Smart Solar sẽ gửi giờ khác. Ghi giờ bạn tiện hơn để nhân viên xếp nhanh.'
            : 'Yêu cầu khảo sát vẫn giữ, bạn đặt giờ hoặc nhờ xếp kỹ thuật viên lại được.'
        }
        confirmLabel={dialog === 'decline' ? 'Xin giờ khác' : 'Huỷ yêu cầu'}
        busy={answer.isPending || cancel.isPending}
        error={dialogError}
        onConfirm={(reason) => void (dialog === 'decline' ? decline(reason) : cancelRequest(reason))}
      />
    </Panel>
  )
}

/** Yêu cầu xếp kỹ thuật viên trước đó đã kết thúc mà không có lịch: nói rõ cho khách trước khi đặt lại */
export function DispatchOutcomeNotice({ dispatch: d }: { dispatch: CustomerDispatchView }) {
  if (d.resolution === 'UNSERVICEABLE')
    return (
      <Notice tone="warn" title="Smart Solar chưa phục vụ được công trình này">
        {d.resolutionReason || 'Khu vực của công trình chưa có kỹ thuật viên.'} Bạn vẫn chọn giờ hoặc gửi lại yêu cầu
        được khi khu vực có người.
      </Notice>
    )
  if (d.resolution === 'CLOSED_BY_STAFF')
    return (
      <Notice tone="info" title="Smart Solar đã đóng yêu cầu xếp kỹ thuật viên">
        {d.resolutionReason ? `${d.resolutionReason}. ` : ''}Chọn giờ bên dưới hoặc gửi lại yêu cầu.
      </Notice>
    )
  return null
}
