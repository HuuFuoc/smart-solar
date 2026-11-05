import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, fieldMessageId, Input, Radio, Textarea, WithUnit } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import {
  canContinueRepair,
  continueRepairBody,
  continueRepairErrors,
  ESTIMATE_MAX,
  finishBody,
  FINISH_NOTE_MAX,
  minutesLeft,
  onSiteBlock,
  parseMinutes,
  readiness,
  repairTimeWarning,
  type ContinueErrors,
  type Readiness,
} from '@/features/after-sales/technicianVisitRules'
import { formatTime } from '@/features/scheduling/schedulingDisplay'
import { useContinueRepairMutation, useFinishOnSiteMutation } from '@/hooks/useTechnicianAfterSales'
import { isApiError, rateLimitedMessage } from '@/services/api/errors'
import type { TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'

// Buổi kiểm tra đã gửi kết quả kèm "ở lại công trình": chờ quản lý duyệt hạng mục và khách trả phần phải trả, rồi sửa luôn
// trong khung giờ còn lại của buổi. Backend quyết định có sửa luôn được không; không được thì kỹ thuật viên tự bấm kết thúc
// buổi chờ (FE không tự gọi), quản lý xếp buổi sửa riêng. Hết khung giờ thì backend tự kết thúc buổi chờ

const READINESS_TEXT: Record<Readiness, (count: number) => string> = {
  decision: (n) => `Còn ${n} hạng mục chờ quản lý quyết định chi phí.`,
  quotation: (n) => `Còn ${n} hạng mục khách phải trả tiền đang chờ kinh doanh lập báo giá.`,
  payment: (n) => `Còn ${n} hạng mục đã báo giá, chờ khách đồng ý và thanh toán.`,
  ready: (n) => `${n} hạng mục đã được phép làm. Ước tính thời gian rồi bấm Sửa luôn.`,
  none: () => 'Không còn hạng mục nào được làm. Kết thúc buổi chờ.',
}

/**
 * Buổi chờ đã đóng ở nơi khác (hết khung giờ thì backend tự kết thúc, hoặc gửi từ máy khác): trang tải lại và khối này biến
 * mất cùng hộp thoại, nên báo bằng toast
 */
function noLongerWaiting(error: unknown) {
  if (!isApiError(error) || error.code !== 'AFTER_SALES_INVALID_STATE') return false
  toast.error('Buổi chờ đã kết thúc (hết khung giờ hoặc đã gửi từ máy khác). Trang đã tải lại trạng thái mới.')
  return true
}

export function OnSiteWaitPanel({ visit }: { visit: TechnicianVisitView }) {
  const proceed = useContinueRepairMutation()
  const finish = useFinishOnSiteMutation()
  const [minutes, setMinutes] = useState('')
  const [partsAvailable, setPartsAvailable] = useState<boolean | null>(null)
  const [errors, setErrors] = useState<ContinueErrors>({})
  const [blocked, setBlocked] = useState<{ title: string; body: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [now] = useState(() => Date.now())
  const busy = proceed.isPending || finish.isPending
  const left = minutesLeft(visit, now)
  const status = readiness(visit.items)
  const warning = repairTimeWarning(visit, parseMinutes(minutes), now)

  async function continueRepair() {
    setError(null)
    setBlocked(null)
    const draft = { minutes, partsAvailable }
    const found = continueRepairErrors(draft)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    try {
      await proceed.mutateAsync({ visitId: visit.visitId, body: continueRepairBody(draft) })
      toast.success('Đã chuyển sang sửa luôn trong buổi này. Sửa xong thì chụp ảnh và gửi báo cáo.')
    } catch (e) {
      if (noLongerWaiting(e)) return
      const block = isApiError(e) ? onSiteBlock(e.code) : null
      if (block) setBlocked(block)
      else setError(rateLimitedMessage(e))
    }
  }

  return (
    <Panel id="visit-onsite" className="scroll-mt-6">
      <PanelHeader
        title="Chờ tại công trình để sửa luôn"
        description={`Khung giờ giữ tới ${formatTime(visit.endsAt)}${left > 0 ? `, còn khoảng ${left} phút` : ', đã hết'}`}
      />
      <PanelBody className="space-y-4">
        <Notice tone={status.state === 'ready' ? 'ok' : status.state === 'none' ? 'warn' : 'info'}>
          {READINESS_TEXT[status.state](status.count)} Trang tự cập nhật khi có thay đổi.
        </Notice>

        {canContinueRepair(visit) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Thời gian sửa ước tính"
              htmlFor="repair-minutes"
              required
              error={errors.minutes}
              hint={warning ?? `Từ 1 đến ${ESTIMATE_MAX} phút.`}
            >
              <WithUnit unit="phút">
                <Input
                  id="repair-minutes"
                  inputMode="numeric"
                  className="w-28"
                  aria-invalid={errors.minutes ? true : undefined}
                  aria-describedby={fieldMessageId('repair-minutes')}
                  value={minutes}
                  disabled={busy}
                  onChange={(e) => {
                    setMinutes(e.target.value)
                    setErrors((current) => ({ ...current, minutes: undefined }))
                  }}
                />
              </WithUnit>
            </Field>
            <fieldset aria-describedby={errors.parts ? 'parts-error' : undefined}>
              <legend className="mb-2 text-body font-medium text-fg">
                Linh kiện
                <span aria-hidden className="text-danger">
                  {' '}
                  *
                </span>
              </legend>
              <div className="space-y-2">
                <Radio
                  name="parts-available"
                  label="Có đủ linh kiện"
                  checked={partsAvailable === true}
                  disabled={busy}
                  onChange={() => {
                    setPartsAvailable(true)
                    setErrors((current) => ({ ...current, parts: undefined }))
                  }}
                />
                <Radio
                  name="parts-available"
                  label="Chưa đủ linh kiện"
                  checked={partsAvailable === false}
                  disabled={busy}
                  onChange={() => {
                    setPartsAvailable(false)
                    setErrors((current) => ({ ...current, parts: undefined }))
                  }}
                />
              </div>
              {errors.parts && (
                <p id="parts-error" className="mt-2 text-meta text-danger" role="alert">
                  {errors.parts}
                </p>
              )}
            </fieldset>
          </div>
        )}

        {blocked && (
          <div role="alert">
            <Notice tone="warn" title={blocked.title}>
              {blocked.body}
            </Notice>
          </div>
        )}
        {error && (
          <div role="alert">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {canContinueRepair(visit) && (
            <Button icon="build" variant="primary" disabled={busy} onClick={() => void continueRepair()}>
              {proceed.isPending ? 'Đang gửi…' : 'Sửa luôn'}
            </Button>
          )}
          <Button icon="stop_circle" variant="warn" disabled={busy} onClick={() => setFinishing(true)}>
            Kết thúc buổi chờ
          </Button>
        </div>
      </PanelBody>

      <FinishDialog
        open={finishing}
        pending={finish.isPending}
        onClose={() => setFinishing(false)}
        onSubmit={async (note) => {
          try {
            await finish.mutateAsync({ visitId: visit.visitId, body: finishBody(note) })
            toast.success('Đã kết thúc buổi chờ. Quản lý sẽ xếp buổi sửa riêng.')
          } catch (e) {
            if (!noLongerWaiting(e)) throw e
          }
        }}
      />
    </Panel>
  )
}

/** Ghi chú không bắt buộc; lỗi thì giữ hộp thoại và hiện lỗi */
function FinishDialog({
  open,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean
  pending: boolean
  onClose: () => void
  onSubmit: (note: string) => Promise<unknown>
}) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    try {
      await onSubmit(note)
      setNote('')
      onClose()
    } catch (e) {
      setError(rateLimitedMessage(e))
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => !next && !pending && onClose()}
      dismissible={!pending}
      aria-label="Kết thúc buổi chờ?"
    >
      <DialogTitle>Kết thúc buổi chờ?</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Kết quả kiểm tra đã gửi được giữ nguyên. Bạn không sửa trong buổi này; quản lý sẽ xếp một buổi sửa riêng.
      </p>
      <Field
        label="Ghi chú"
        htmlFor="finish-note"
        hint="Không bắt buộc. Vd: Khách chưa thanh toán, thiếu quạt tản nhiệt."
        className="mt-4"
      >
        <Textarea
          id="finish-note"
          rows={2}
          maxLength={FINISH_NOTE_MAX}
          aria-describedby={fieldMessageId('finish-note')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={pending} onClick={onClose}>
          Đóng
        </Button>
        <Button icon="stop_circle" variant="warn" disabled={pending} onClick={() => void submit()}>
          {pending ? 'Đang gửi…' : 'Kết thúc buổi chờ'}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
