import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, fieldMessageId, Input, Select, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { assetName } from '@/features/after-sales/serviceDisplay'
import {
  emptyItemDraft,
  ITEM_DESCRIPTION_MAX,
  ITEM_DIAGNOSIS_MAX,
  ITEM_PARTS_MAX,
  supplementaryBody,
  supplementaryErrors,
  type ItemDraft,
  type SupplementaryErrors,
} from '@/features/after-sales/technicianVisitRules'
import { useSupplementaryItemMutation } from '@/hooks/useTechnicianAfterSales'
import { isApiError, rateLimitedMessage } from '@/services/api/errors'
import type { TechnicianVisitView } from '@/types/res/technicianAfterSalesRes'

// Lỗi khác phát hiện trong lúc sửa. Hạng mục mới chờ quản lý quyết định chi phí, khách phải trả thì kinh doanh lập báo giá
// bổ sung; việc đã được duyệt vẫn làm tiếp, báo giá đã trả không đổi. Hạng mục mới chỉ báo kết quả được khi đã được phép làm

export function SupplementaryItemDialog({
  visit,
  open,
  onClose,
}: {
  visit: TechnicianVisitView
  open: boolean
  onClose: () => void
}) {
  const add = useSupplementaryItemMutation()
  return (
    <ModalDialog
      open={open}
      onOpenChange={(next) => !next && !add.isPending && onClose()}
      dismissible={!add.isPending}
      aria-label="Báo hạng mục phát sinh"
    >
      {/* Chỉ dựng form khi mở để mỗi lần mở là một form trống */}
      {open && <SupplementaryForm visit={visit} onClose={onClose} add={add} />}
    </ModalDialog>
  )
}

function SupplementaryForm({
  visit,
  onClose,
  add,
}: {
  visit: TechnicianVisitView
  onClose: () => void
  add: ReturnType<typeof useSupplementaryItemMutation>
}) {
  const [draft, setDraft] = useState<ItemDraft>(emptyItemDraft)
  const [errors, setErrors] = useState<SupplementaryErrors>({})
  const [error, setError] = useState<string | null>(null)
  const set = (change: Partial<ItemDraft>) => {
    setDraft((current) => ({ ...current, ...change }))
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(change)) delete next[key as keyof SupplementaryErrors]
      return next
    })
  }

  async function submit() {
    setError(null)
    const found = supplementaryErrors(draft)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    try {
      await add.mutateAsync({ visitId: visit.visitId, body: supplementaryBody(draft) })
      toast.success('Đã báo hạng mục phát sinh. Quản lý sẽ quyết định chi phí trước khi bạn làm hạng mục này.')
      onClose()
    } catch (e) {
      // Buổi không còn là buổi sửa đang làm: đóng form, trang đã tải lại trạng thái mới
      if (isApiError(e) && e.code === 'AFTER_SALES_INVALID_STATE') {
        toast.error('Chỉ báo hạng mục phát sinh được khi đang sửa. Trang đã tải lại trạng thái mới.')
        onClose()
        return
      }
      setError(rateLimitedMessage(e))
    }
  }

  const pending = add.isPending
  return (
    <>
      <DialogTitle>Báo hạng mục phát sinh</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        Lỗi khác bạn thấy khi đang sửa. Quản lý quyết định chi phí; nếu khách phải trả, kinh doanh gửi báo giá bổ sung.
        Việc đã được duyệt vẫn làm tiếp bình thường.
      </p>
      <div className="mt-4 grid gap-4">
        <Field
          label="Tên hạng mục"
          htmlFor="supplementary-description"
          required
          error={errors.description}
          hint="Vd: Đầu nối MC4 chuỗi 2 bị cháy"
        >
          <Input
            id="supplementary-description"
            maxLength={ITEM_DESCRIPTION_MAX}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={fieldMessageId('supplementary-description')}
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>
        <Field label="Thiết bị" htmlFor="supplementary-asset">
          <Select id="supplementary-asset" value={draft.assetId} onChange={(e) => set({ assetId: e.target.value })}>
            <option value="">Không gắn thiết bị</option>
            {visit.assets.map((asset) => (
              <option key={asset.assetId} value={asset.assetId}>
                {assetName(asset)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Chẩn đoán" htmlFor="supplementary-diagnosis" required error={errors.diagnosis}>
          <Textarea
            id="supplementary-diagnosis"
            rows={3}
            maxLength={ITEM_DIAGNOSIS_MAX}
            aria-invalid={errors.diagnosis ? true : undefined}
            aria-describedby={fieldMessageId('supplementary-diagnosis')}
            value={draft.diagnosis}
            onChange={(e) => set({ diagnosis: e.target.value })}
          />
        </Field>
        <Field
          label="Vật tư cần"
          htmlFor="supplementary-parts"
          error={errors.requiredParts}
          hint="Không bắt buộc. Ghi tên, số lượng."
        >
          <Input
            id="supplementary-parts"
            maxLength={ITEM_PARTS_MAX}
            aria-describedby={fieldMessageId('supplementary-parts')}
            value={draft.requiredParts}
            onChange={(e) => set({ requiredParts: e.target.value })}
          />
        </Field>
      </div>
      {error && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      <DialogFooter>
        <Button icon="close" variant="secondary" disabled={pending} onClick={onClose}>
          Đóng
        </Button>
        <Button icon="send" variant="primary" disabled={pending} onClick={() => void submit()}>
          {pending ? 'Đang gửi…' : 'Gửi hạng mục'}
        </Button>
      </DialogFooter>
    </>
  )
}
