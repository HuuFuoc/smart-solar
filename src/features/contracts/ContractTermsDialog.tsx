import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Select, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { ErrorLine } from '@/features/installation-projects/formParts'
import { contractErrorMessage, contractTitle, warrantyText } from '@/features/contracts/contractDisplay'
import {
  activeWarrantyOptions,
  CONTRACT_TERMS_MAX,
  defaultWarrantyOption,
  termsError,
  warrantyMonthsToSend,
} from '@/features/contracts/contractRules'
import {
  useCreateAmendmentMutation,
  useCreateContractMutation,
  useUpdateContractDraftMutation,
} from '@/hooks/useContracts'
import { useInstallationWarrantyOptionsQuery } from '@/hooks/useSalesAfterSales'
import { isFeatureUnavailable } from '@/services/api/errors'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { QuotationView } from '@/types/res/quotationsRes'

// Lập hợp đồng từ báo giá đã đồng ý, sửa bản nháp, hoặc lập phụ lục. Giá do backend chép từ báo giá nên ở đây chỉ có
// điều khoản và thời hạn bảo hành lắp đặt (chọn trong các tuỳ chọn quản trị đang bật, không tự đặt số)

export type TermsTarget =
  | { mode: 'create'; quotation: QuotationView }
  | { mode: 'edit'; contract: ContractView }
  | { mode: 'amend'; contract: ContractView }

const TITLES = { create: 'Lập hợp đồng', edit: 'Sửa bản nháp hợp đồng', amend: 'Lập phụ lục' } as const

export function ContractTermsDialog({
  target,
  onClose,
  onDone,
}: {
  target: TermsTarget
  onClose: () => void
  /** Chạy sau khi lưu xong, với phiên bản backend trả về */
  onDone?: (view: ContractView) => void
}) {
  const create = useCreateContractMutation()
  const update = useUpdateContractDraftMutation()
  const amend = useCreateAmendmentMutation()
  const options = useInstallationWarrantyOptionsQuery()
  const busy = create.isPending || update.isPending || amend.isPending
  const initialTerms = target.mode === 'create' ? (target.quotation.terms ?? '') : (target.contract.terms ?? '')
  const [terms, setTerms] = useState(initialTerms)
  const [warranty, setWarranty] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const active = activeWarrantyOptions(options.data ?? [])
  const fallback = defaultWarrantyOption(options.data ?? [])
  const current = target.mode === 'create' ? null : target.contract.warrantyMonths
  const keepLabel =
    target.mode === 'create'
      ? fallback
        ? `Theo mặc định (${warrantyText(fallback.months)})`
        : 'Chưa chọn'
      : current != null
        ? `Giữ ${warrantyText(current)}`
        : target.mode === 'amend' && fallback
          ? `Theo mặc định (${warrantyText(fallback.months)})`
          : 'Chưa chọn'
  const unchanged = target.mode === 'edit' && warranty === '' && terms.trim() === (target.contract.terms ?? '').trim()

  async function submit() {
    setError(null)
    const problem = termsError(terms)
    setFieldError(problem)
    if (problem) return
    const warrantyMonths = warrantyMonthsToSend(warranty, options.data ?? [])
    if (warrantyMonths === 'invalid') return setError('Thời hạn bảo hành đã chọn không còn được dùng. Chọn lại.')
    try {
      const view =
        target.mode === 'create'
          ? await create.mutateAsync({
              quotationId: target.quotation.quotationId,
              body: { terms: terms.trim() || null, warrantyMonths },
            })
          : target.mode === 'edit'
            ? await update.mutateAsync({
                contractId: target.contract.contractId,
                body: { revision: target.contract.revision, terms: terms.trim() || null, warrantyMonths },
              })
            : await amend.mutateAsync({
                contractId: target.contract.contractId,
                body: { terms: terms.trim() || null, warrantyMonths },
              })
      toast.success(
        target.mode === 'create'
          ? `Đã lập bản nháp hợp đồng ${view.contractNumber}.`
          : target.mode === 'edit'
            ? 'Đã lưu bản nháp.'
            : `Đã lập phụ lục nháp (phiên bản ${view.version}).`,
      )
      onClose()
      onDone?.(view)
    } catch (e) {
      setError(contractErrorMessage(e))
    }
  }

  return (
    <ModalDialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      dismissible={!busy}
      className="max-w-2xl"
      aria-label={TITLES[target.mode]}
    >
      <DialogTitle>{TITLES[target.mode]}</DialogTitle>
      <p className="mt-2 text-body text-fg-2">
        {target.mode === 'create'
          ? `Giá và dòng hàng lấy đúng theo báo giá ${target.quotation.quoteNumber} khách đã đồng ý, không sửa ở đây.`
          : target.mode === 'edit'
            ? `${contractTitle(target.contract)}. Giá giữ theo báo giá đã đồng ý.`
            : `Phụ lục là phiên bản mới của ${contractTitle(target.contract)}, cùng giá. Phiên bản hiện tại vẫn có hiệu lực tới khi phụ lục được phát hành.`}
      </p>

      <div className="mt-4 space-y-4">
        <Field
          label="Thời hạn bảo hành lắp đặt"
          htmlFor="contract-warranty"
          hint={
            options.isError
              ? undefined
              : 'Chọn trong các thời hạn quản trị đang dùng. Thời hạn được chép vào hợp đồng lúc phát hành.'
          }
        >
          <Select
            id="contract-warranty"
            value={warranty}
            disabled={busy || options.isPending}
            onChange={(e) => setWarranty(e.target.value)}
          >
            <option value="">{options.isPending ? 'Đang tải thời hạn…' : keepLabel}</option>
            {active.map((o) => (
              <option key={o.optionId} value={String(o.months)}>
                {warrantyText(o.months)}
                {o.isDefault ? ' (mặc định)' : ''}
              </option>
            ))}
          </Select>
        </Field>
        {options.isError ? (
          <Notice tone="warn">
            {isFeatureUnavailable(options.error)
              ? 'Chưa đọc được danh sách thời hạn bảo hành vì chức năng chưa sẵn sàng.'
              : 'Không đọc được danh sách thời hạn bảo hành.'}{' '}
            Vẫn lưu được với lựa chọn đầu tiên; thời hạn chọn sau ở bản nháp.
          </Notice>
        ) : (
          options.data &&
          active.length === 0 && (
            <Notice tone="warn" title="Chưa có thời hạn bảo hành lắp đặt nào">
              Vẫn lập được bản nháp, nhưng chưa phát hành được. Nhờ quản trị thêm thời hạn bảo hành lắp đặt.
            </Notice>
          )
        )}

        <Field
          label="Điều khoản"
          htmlFor="contract-terms"
          error={fieldError ?? undefined}
          hint={
            target.mode === 'edit'
              ? `Tối đa ${CONTRACT_TERMS_MAX} ký tự. Để trống là hợp đồng không có điều khoản.`
              : `Tối đa ${CONTRACT_TERMS_MAX} ký tự. Để trống thì dùng điều khoản của ${target.mode === 'create' ? 'báo giá' : 'phiên bản hiện tại'}.`
          }
        >
          <Textarea
            id="contract-terms"
            rows={8}
            maxLength={CONTRACT_TERMS_MAX}
            value={terms}
            disabled={busy}
            aria-invalid={fieldError ? true : undefined}
            onChange={(e) => setTerms(e.target.value)}
          />
        </Field>
      </div>

      <DialogFooter className="items-center">
        <ErrorLine message={error} />
        <Button icon="close" variant="secondary" disabled={busy} onClick={onClose}>
          Huỷ
        </Button>
        <Button
          icon={target.mode === 'edit' ? 'save' : 'add'}
          variant="primary"
          disabled={busy || unchanged}
          onClick={() => void submit()}
        >
          {busy ? 'Đang lưu…' : target.mode === 'edit' ? 'Lưu bản nháp' : TITLES[target.mode]}
        </Button>
      </DialogFooter>
    </ModalDialog>
  )
}
