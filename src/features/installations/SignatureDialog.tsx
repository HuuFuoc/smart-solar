import { useRef, useState } from 'react'
import { SignaturePad, type SignaturePadHandle } from '@/components/common/tech/SignaturePad'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
} from '@/components/common/stitch-ui'

/*
 * "Customer Handover & Signature" của installation_task_checklist: tóm tắt hạng mục bàn giao,
 * ô ký (SignaturePad dùng chung với warranty_request) và hai nút Cancel / Sign & Complete Job.
 */
export type SignatureSummaryRow = { label: string; value: string; highlight?: boolean }

export type SignatureDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle: string
  rows: SignatureSummaryRow[]
  consent: string
  canvasLabel: string
  hint: string
  clearLabel: string
  cancelLabel: string
  submitLabel: string
  /** Submit giả lập: đóng hộp thoại rồi báo lên trang cha */
  onSubmit: () => void
}

export function SignatureDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  rows,
  consent,
  canvasLabel,
  hint,
  clearLabel,
  cancelLabel,
  submitLabel,
  onSubmit,
}: SignatureDialogProps) {
  const padRef = useRef<SignaturePadHandle>(null)
  const [hasSignature, setHasSignature] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (!next) padRef.current?.clear()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg">
        <DialogHeader className="flex-row items-center gap-space-xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
            <Icon name="verified_user" className="text-[24px]" />
          </div>
          <div>
            <DialogTitle className="text-on-surface">{title}</DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-space-sm text-body-sm text-on-surface">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-space-sm">
              <span className="text-on-surface-variant">{row.label}</span>
              <span className={row.highlight ? 'font-bold text-primary' : 'font-bold'}>{row.value}</span>
            </div>
          ))}
        </div>

        <p className="text-body-sm text-on-surface-variant">{consent}</p>

        <div className="flex flex-col gap-1">
          <span className="text-label-sm font-bold text-on-surface-variant">{canvasLabel}</span>
          <SignaturePad ref={padRef} label={canvasLabel} hint={hint} onSignedChange={setHasSignature} />
          <button
            type="button"
            onClick={() => padRef.current?.clear()}
            className="self-end text-label-sm text-primary hover:underline"
          >
            {clearLabel}
          </button>
        </div>

        <DialogFooter className="justify-end">
          <Button variant="ghost" size="md" onClick={() => handleOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            size="md"
            iconLeft="done_all"
            disabled={!hasSignature}
            onClick={() => {
              onSubmit()
              handleOpenChange(false)
            }}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
