import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Select, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import { changedMeanwhile, managerActionError } from '@/features/after-sales/managerAfterSalesDisplay'
import {
  DUPLICATE_REASON_MAX,
  NOT_FULFILLED_REASON_MAX,
  STOP_REASON_MAX,
  canMarkNotFulfilled,
  canStopWork,
  duplicateBlocker,
  duplicateCandidates,
  duplicateErrors,
  stopBody,
} from '@/features/after-sales/managerAfterSalesRules'
import { isFinalRequest, requestKindLabel, requestStatusMeta } from '@/features/after-sales/serviceDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  useMarkDuplicateMutation,
  useMarkNotFulfilledMutation,
  useServiceRequestQuery,
  useServiceRequestsQuery,
  useStopWorkMutation,
} from '@/hooks/useManagerAfterSales'
import { withId } from '@/routes/paths'
import type { ServiceRequestView } from '@/types/res/customerAfterSalesRes'

// Kết thúc một yêu cầu còn mở theo quyết định của quản lý / quản trị: đóng vì trùng yêu cầu khác, dừng việc đã bắt đầu,
// bảo trì lẻ không thực hiện được. Cả ba không mở lại được. Nhóm không làm hoàn tiền nên giao diện không hỏi số tiền hoàn

function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="mt-4">
      <Notice tone="danger">{message}</Notice>
    </div>
  )
}

/** Thông tin yêu cầu gốc để quản lý xem lại trước khi đóng */
function OriginalPreview({ requestId, detailPattern }: { requestId: string; detailPattern: string }) {
  const query = useServiceRequestQuery(requestId)
  if (query.isPending) return <Skeleton className="h-20" />
  if (query.isError)
    return <ErrorState message={managerActionError(query.error)} onRetry={() => void query.refetch()} />
  const o = query.data
  const status = requestStatusMeta(o.status, 'manager')
  return (
    <div className="space-y-2 rounded-container bg-surface-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="tnum font-semibold text-fg">{o.requestNumber}</p>
        <Badge tone={status.tone === 'danger' ? 'neutral' : status.tone}>{status.label}</Badge>
      </div>
      <p className="line-clamp-3 max-w-[72ch] text-body whitespace-pre-line text-fg">{o.description}</p>
      <p className="tnum text-meta text-fg-2">
        {requestKindLabel(o.kind)}, gửi {formatMoment(o.createdAt)}
      </p>
      <Link to={withId(detailPattern, o.requestId)} target="_blank" rel="noopener" className="ui-link text-body">
        Mở yêu cầu gốc ở tab mới
      </Link>
    </div>
  )
}

function DuplicateDialog({
  request,
  detailPattern,
  onClose,
}: {
  request: ServiceRequestView
  detailPattern: string
  onClose: () => void
}) {
  const list = useServiceRequestsQuery()
  const mark = useMarkDuplicateMutation()
  const [originalId, setOriginalId] = useState('')
  const [reason, setReason] = useState('')
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const candidates = duplicateCandidates(request, list.data ?? [])
  const flagged = new Set(request.possibleDuplicates.map((d) => d.requestId))
  const errors = checked ? duplicateErrors(originalId, reason) : {}

  async function submit() {
    if (mark.isPending) return
    setChecked(true)
    setError(null)
    if (Object.keys(duplicateErrors(originalId, reason)).length > 0) return
    const original = candidates.find((c) => c.requestId === originalId)
    try {
      await mark.mutateAsync({
        requestId: request.requestId,
        body: { originalRequestId: originalId, reason: reason.trim() || null },
      })
      toast.success(`Đã đóng ${request.requestNumber} vì trùng ${original?.requestNumber ?? 'yêu cầu gốc'}.`)
      onClose()
    } catch (e) {
      // Yêu cầu vừa đóng ở nơi khác: trang tải lại và khối này biến mất, nên đóng hộp thoại và báo bằng toast
      if (changedMeanwhile(e)) {
        toast.error(managerActionError(e))
        onClose()
        return
      }
      setError(managerActionError(e))
    }
  }

  let body: ReactNode
  if (list.isPending) body = <Skeleton className="h-24" />
  else if (list.isError)
    body = <ErrorState message={managerActionError(list.error)} onRetry={() => void list.refetch()} />
  else if (candidates.length === 0)
    body = <Notice tone="neutral">Công trình này không có yêu cầu nào khác để làm yêu cầu gốc.</Notice>
  else
    body = (
      <div className="space-y-4">
        <Field label="Yêu cầu gốc" htmlFor="duplicate-original" required error={errors.original}>
          <Select
            id="duplicate-original"
            value={originalId}
            aria-required
            aria-invalid={errors.original ? true : undefined}
            disabled={mark.isPending}
            onChange={(e) => setOriginalId(e.target.value)}
          >
            <option value="">Chọn yêu cầu của cùng công trình</option>
            {candidates.map((c) => (
              <option key={c.requestId} value={c.requestId}>
                {c.requestNumber}: {requestKindLabel(c.kind)}, {requestStatusMeta(c.status, 'manager').label}
                {flagged.has(c.requestId) ? ' (có thể trùng)' : ''}
              </option>
            ))}
          </Select>
        </Field>
        {originalId && <OriginalPreview requestId={originalId} detailPattern={detailPattern} />}
        <Field
          label="Ghi chú"
          htmlFor="duplicate-reason"
          hint={`Không bắt buộc, tối đa ${DUPLICATE_REASON_MAX} ký tự. Lưu vào lịch sử của yêu cầu.`}
          error={errors.reason}
        >
          <Textarea
            id="duplicate-reason"
            rows={2}
            maxLength={DUPLICATE_REASON_MAX}
            value={reason}
            disabled={mark.isPending}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </div>
    )

  return (
    <>
      <DialogTitle>Đóng {request.requestNumber} vì trùng</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Không cử thêm kỹ thuật viên; buổi hẹn, báo giá chưa trả và việc của kinh doanh của yêu cầu này bị huỷ. Khách
        nhận thông báo đã gộp vào yêu cầu gốc. Không mở lại được.
      </p>
      <div className="mt-4">{body}</div>
      <ErrorNotice message={error} />
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={mark.isPending} onClick={onClose}>
          Đóng
        </Button>
        <Button
          icon="call_merge"
          variant="danger-solid"
          disabled={mark.isPending || candidates.length === 0}
          onClick={() => void submit()}
        >
          {mark.isPending ? 'Đang gửi…' : 'Đóng vì trùng'}
        </Button>
      </DialogFooter>
    </>
  )
}

type Action = 'duplicate' | 'stop' | 'not-fulfilled'

function ActionRow({ title, body, action }: { title: string; body: ReactNode; action: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 basis-80">
        <p className="text-body font-medium text-fg">{title}</p>
        <p className="max-w-[72ch] text-body text-fg-2">{body}</p>
      </div>
      {action}
    </li>
  )
}

export function RequestClosePanel({ request, detailPattern }: { request: ServiceRequestView; detailPattern: string }) {
  const [open, setOpen] = useState<Action | null>(null)
  const notFulfilled = useMarkNotFulfilledMutation()
  const stop = useStopWorkMutation()
  if (isFinalRequest(request.status)) return null
  const blocker = duplicateBlocker(request)
  const close = () => setOpen(null)

  return (
    <Panel id="close-request" className="scroll-mt-6">
      <PanelHeader title="Kết thúc yêu cầu" />
      <PanelBody>
        <ul className="divide-y divide-line">
          <ActionRow
            title="Đóng vì trùng yêu cầu khác"
            body={
              blocker ??
              (request.possibleDuplicates.length > 0
                ? 'Công trình còn yêu cầu báo lỗi khác đang mở. Chỉ đóng khi chắc là cùng một sự cố.'
                : 'Khách gửi lại cùng một sự cố của công trình.')
            }
            action={
              <Button
                icon="call_merge"
                size="sm"
                variant="danger"
                disabled={Boolean(blocker)}
                onClick={() => setOpen('duplicate')}
              >
                Đóng vì trùng
              </Button>
            }
          />
          {canStopWork(request) && (
            <ActionRow
              title="Dừng việc đã bắt đầu"
              body="Khách không tự huỷ được việc đã bắt đầu."
              action={
                <Button icon="stop_circle" size="sm" variant="danger" onClick={() => setOpen('stop')}>
                  Dừng việc
                </Button>
              }
            />
          )}
          {canMarkNotFulfilled(request) && (
            <ActionRow
              title="Không thực hiện được"
              body="Smart Solar không bố trí được kỹ thuật viên phù hợp, hoặc khách không nhận các giờ khác."
              action={
                <Button icon="event_busy" size="sm" variant="danger" onClick={() => setOpen('not-fulfilled')}>
                  Không thực hiện được
                </Button>
              }
            />
          )}
        </ul>

        <ModalDialog
          open={open === 'duplicate'}
          onOpenChange={(next) => !next && close()}
          className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto"
          aria-label="Đóng vì trùng"
        >
          <DuplicateDialog request={request} detailPattern={detailPattern} onClose={close} />
        </ModalDialog>
        <ReasonDialog
          open={open === 'stop'}
          title={`Dừng việc ${request.requestNumber}`}
          description="Yêu cầu bị huỷ, buổi hẹn đang mở, báo giá chưa trả và việc của kinh doanh cũng bị huỷ. Không mở lại được. Khách đọc được lý do."
          maxLength={STOP_REASON_MAX}
          submitLabel="Dừng việc"
          variant="danger-solid"
          icon="stop_circle"
          onSubmit={async (reason) => {
            try {
              await stop.mutateAsync({ requestId: request.requestId, body: stopBody(reason) })
            } catch (e) {
              if (!changedMeanwhile(e)) throw new Error(managerActionError(e))
              toast.error(managerActionError(e))
              return
            }
            toast.success('Đã dừng việc.')
          }}
          onClose={close}
        />
        <ReasonDialog
          open={open === 'not-fulfilled'}
          title={`Không thực hiện được ${request.requestNumber}`}
          description="Yêu cầu bị huỷ, buổi hẹn và báo giá còn mở cũng bị huỷ. Không mở lại được."
          maxLength={NOT_FULFILLED_REASON_MAX}
          submitLabel="Xác nhận không thực hiện được"
          variant="danger-solid"
          icon="event_busy"
          onSubmit={async (reason) => {
            try {
              await notFulfilled.mutateAsync({ requestId: request.requestId, body: { reason } })
            } catch (e) {
              if (!changedMeanwhile(e)) throw new Error(managerActionError(e))
              toast.error(managerActionError(e))
              return
            }
            toast.success('Đã huỷ yêu cầu.')
          }}
          onClose={close}
        />
      </PanelBody>
    </Panel>
  )
}

/** Yêu cầu đã đóng vì trùng: dẫn sang yêu cầu gốc */
export function DuplicateOfNotice({ requestId, detailPattern }: { requestId: string; detailPattern: string }) {
  const original = useServiceRequestQuery(requestId)
  return (
    <Notice tone="neutral">
      Yêu cầu này trùng với{' '}
      <Link to={withId(detailPattern, requestId)} className="ui-link tnum">
        {original.data?.requestNumber ?? 'yêu cầu gốc'}
      </Link>
      {original.data ? `, ${requestStatusMeta(original.data.status, 'manager').label.toLowerCase()}` : ''}.
    </Notice>
  )
}
