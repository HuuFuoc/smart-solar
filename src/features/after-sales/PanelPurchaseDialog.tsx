import { useState } from 'react'
import { PURCHASE_METHODS } from '@/common/afterSales'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox, Field, Input, Select } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Segmented } from '@/components/common/ui/segmented'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { PackageFacts } from '@/features/after-sales/PackageList'
import {
  hasSelectionErrors,
  kindCapacity,
  panelAvailable,
  panelHeld,
  panelPurchaseBody,
  purchaseBlock,
  selectionErrors,
  selectionUnits,
  type PanelSelection,
} from '@/features/after-sales/panelCoverageRules'
import {
  bundledKindLabel,
  formatUnitPrice,
  panelLabel,
  panelPurchaseErrorMessage,
  purchaseBlockText,
} from '@/features/after-sales/servicePackageDisplay'
import { contractStatusLabel } from '@/features/contracts/contractDisplay'
import { usePanelCoverageQuery, usePurchaseMutation } from '@/hooks/useCustomerAfterSales'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { isApiError } from '@/services/api/errors'
import type { PackageView, PanelAssetView, PaymentAttemptView } from '@/types/res/customerAfterSalesRes'

// Mua gói tính theo tấm pin sau bàn giao (backend 763cb0b): chọn hợp đồng, chọn tấm pin cần bảo vệ, chọn cách trả. Loại gói và gói đã
// chọn ở thẻ gói. Tấm còn mua được, lý do chưa mua được là số backend trả (GET …/panel-coverage); FE chỉ cộng số tấm đã chọn. Trả
// 100% trước bằng một link riêng, không gộp với hợp đồng; gói chỉ được ghi nhận khi backend báo đã nhận tiền

type Method = (typeof PURCHASE_METHODS)[number]['value']

// Tấm pin vừa có người mua / không còn hợp lệ: danh sách tấm pin đã tải lại, bỏ lựa chọn cũ để khách chọn lại theo số mới
const RESELECT_ON = new Set(['SERVICE_SUBSCRIPTION_OVERLAP', 'SERVICE_PANEL_SELECTION_VALIDATION_FAILED'])

function PanelRow({
  panel,
  kind,
  units,
  error,
  disabled,
  onChange,
}: {
  panel: PanelAssetView
  kind: string
  units: number
  error: string | undefined
  disabled: boolean
  onChange: (units: number) => void
}) {
  const available = panelAvailable(panel, kind)
  const held = panelHeld(panel, kind)
  const status =
    available === 0
      ? held > 0
        ? 'Đã có gói loại này'
        : 'Không mua thêm được'
      : panel.isLot
        ? `Còn ${available}/${panel.quantity} tấm mua được${held > 0 ? `, ${held} tấm đã có gói` : ''}`
        : 'Chưa có gói loại này'
  const inputId = `panel-${panel.assetId}`
  return (
    <li className="py-3">
      {panel.isLot ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body text-fg">{panelLabel(panel)}</p>
            <p className="text-meta text-fg-3">{status}</p>
          </div>
          <Field label="Số tấm bảo vệ" htmlFor={inputId} className="w-36">
            <Input
              id={inputId}
              type="number"
              inputMode="numeric"
              min={0}
              max={available}
              step={1}
              className="tnum"
              value={units === 0 ? '' : String(units)}
              placeholder="0"
              disabled={disabled || available === 0}
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                const value = e.target.value.trim()
                onChange(value === '' ? 0 : Number(value))
              }}
            />
          </Field>
        </div>
      ) : (
        <Checkbox
          checked={units > 0}
          disabled={disabled || available === 0}
          onChange={(e) => onChange(e.target.checked ? 1 : 0)}
          label={panelLabel(panel)}
          description={status}
        />
      )}
      {error && (
        <p className="mt-1 text-meta text-danger" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}

export function PanelPurchaseDialog({
  pkg,
  onClose,
  onPurchased,
}: {
  /** Gói PER_PANEL; null: hộp thoại đóng */
  pkg: PackageView | null
  onClose: () => void
  onPurchased: (checkout: PaymentAttemptView) => void
}) {
  const contracts = useMyContractsQuery({ enabled: pkg !== null })
  const purchase = usePurchaseMutation()
  const [picked, setPicked] = useState('')
  const [selection, setSelection] = useState<PanelSelection>({})
  const [method, setMethod] = useState<Method>('ONLINE')
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Bản cũ đã bị thay (phụ lục) không mua gói được
  const options = (contracts.data ?? []).filter((c) => c.status !== 'SUPERSEDED')
  const contractId = picked || (options.length === 1 ? options[0]!.contractId : '')
  const coverage = usePanelCoverageQuery(contractId || null, { enabled: pkg !== null })
  const view = coverage.data && coverage.data.contractId === contractId ? coverage.data : undefined
  const kind = pkg?.kind ?? ''
  const block = view ? purchaseBlock(view, kind) : null
  const errors = view ? selectionErrors(view, kind, selection) : { rows: {}, total: null }
  const units = selectionUnits(selection)
  const busy = purchase.isPending

  function reset() {
    setPicked('')
    setSelection({})
    setMethod('ONLINE')
    setChecked(false)
    setError(null)
  }

  function close() {
    if (busy) return
    reset()
    onClose()
  }

  async function confirm() {
    if (!pkg || !view || busy || block) return
    setChecked(true)
    setError(null)
    if (hasSelectionErrors(errors)) return
    try {
      const result = await purchase.mutateAsync(
        panelPurchaseBody({ contractId, kind, packageId: pkg.packageId, selection, paymentMethod: method }),
      )
      reset()
      onPurchased(result.checkout)
    } catch (e) {
      setError(panelPurchaseErrorMessage(e))
      if (isApiError(e) && e.code && RESELECT_ON.has(e.code)) setSelection({})
    }
  }

  const capacity = view ? kindCapacity(view, kind) : null

  return (
    <ModalDialog
      open={pkg !== null}
      onOpenChange={(open) => !open && close()}
      dismissible={!busy}
      aria-label={pkg ? `Mua ${pkg.name}` : undefined}
      className="max-w-2xl"
    >
      {pkg && (
        <>
          <DialogTitle>Mua {pkg.name}</DialogTitle>
          <p className="mt-2 text-body text-fg-2">
            {bundledKindLabel(kind)} tính theo tấm pin: {formatUnitPrice(pkg.price, 'PER_PANEL')}. Chọn tấm pin cần bảo
            vệ; trả trước toàn bộ, không gộp với hợp đồng lắp đặt.
          </p>
          <PackageFacts pkg={pkg} className="mt-4" />

          <div className="mt-4 space-y-4">
            {contracts.isPending ? (
              <Skeleton className="h-16" />
            ) : contracts.data === undefined ? (
              <ErrorState
                title="Không tải được hợp đồng của bạn."
                message={contracts.error?.message}
                onRetry={() => void contracts.refetch()}
              />
            ) : options.length === 0 ? (
              <Notice tone="warn" title="Chưa có hợp đồng lắp đặt">
                Gói theo tấm pin mua cho công trình đã lắp đặt và bàn giao.
              </Notice>
            ) : (
              <Field label="Hợp đồng" htmlFor="panel-purchase-contract" required>
                <Select
                  id="panel-purchase-contract"
                  aria-required
                  value={contractId}
                  disabled={busy}
                  onChange={(e) => {
                    setPicked(e.target.value)
                    setSelection({})
                    setChecked(false)
                    setError(null)
                  }}
                >
                  {!contractId && <option value="">Chọn hợp đồng</option>}
                  {options.map((c) => (
                    <option key={c.contractId} value={c.contractId}>
                      Hợp đồng {c.contractNumber} ({contractStatusLabel(c.status).toLowerCase()})
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {contractId &&
              (coverage.isPending || (coverage.isFetching && !view) ? (
                <Skeleton className="h-32" />
              ) : !view ? (
                <ErrorState
                  title="Không tải được tấm pin của công trình."
                  message={panelPurchaseErrorMessage(coverage.error)}
                  onRetry={() => void coverage.refetch()}
                />
              ) : block ? (
                <Notice tone="warn" title="Chưa mua được gói này cho công trình">
                  {purchaseBlockText(block, kind)}
                </Notice>
              ) : (
                <fieldset>
                  <legend className="text-body font-medium text-fg">Tấm pin cần bảo vệ</legend>
                  <p className="tnum mt-1 text-meta text-fg-2">
                    Còn mua được {capacity?.availableUnits ?? 0}/{capacity?.activePanelUnits ?? 0} tấm. Đã chọn {units}{' '}
                    tấm.
                  </p>
                  <ul className="mt-2 divide-y divide-line border-y border-line">
                    {view.panels.map((panel) => (
                      <PanelRow
                        key={panel.assetId}
                        panel={panel}
                        kind={kind}
                        units={selection[panel.assetId] ?? 0}
                        error={checked ? errors.rows[panel.assetId] : undefined}
                        disabled={busy}
                        onChange={(next) => setSelection((s) => ({ ...s, [panel.assetId]: next }))}
                      />
                    ))}
                  </ul>
                  {checked && errors.total && (
                    <p className="mt-2 text-meta text-danger" role="alert">
                      {errors.total}
                    </p>
                  )}
                </fieldset>
              ))}

            {view && !block && (
              <Field label="Cách trả">
                <Segmented
                  label="Cách trả"
                  options={[...PURCHASE_METHODS]}
                  value={method}
                  onChange={setMethod}
                  className="w-fit"
                />
              </Field>
            )}
            {view && !block && method === 'CASH' && (
              <p className="text-body text-fg-2">
                Bạn trả tiền mặt cho nhân viên Smart Solar. Gói chỉ được ghi nhận khi Smart Solar xác nhận đã thu tiền.
              </p>
            )}
          </div>

          {error && (
            <div role="alert" className="mt-4">
              <Notice tone="danger">{error}</Notice>
            </div>
          )}

          <DialogFooter>
            <Button icon="close" variant="secondary" disabled={busy} onClick={close}>
              Huỷ
            </Button>
            <Button
              icon="payments"
              variant="primary"
              disabled={!view || Boolean(block) || busy}
              onClick={() => void confirm()}
            >
              {busy
                ? 'Đang gửi…'
                : method === 'CASH'
                  ? `Mua ${units} tấm, trả tiền mặt`
                  : `Mua ${units} tấm và thanh toán`}
            </Button>
          </DialogFooter>
        </>
      )}
    </ModalDialog>
  )
}
