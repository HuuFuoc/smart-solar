import { useState } from 'react'
import { PURCHASE_METHODS } from '@/common/afterSales'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Select } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Segmented } from '@/components/common/ui/segmented'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { formatDurationMonths } from '@/features/after-sales/afterSalesDisplay'
import { isRenewable, perPanelPackagesOfKind, renewalBody } from '@/features/after-sales/panelCoverageRules'
import {
  bundledKindLabel,
  coveredPanelLabel,
  formatUnitPrice,
  panelPurchaseErrorMessage,
} from '@/features/after-sales/servicePackageDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { usePanelCoverageQuery, usePurchaseMutation } from '@/hooks/useCustomerAfterSales'
import type { PaymentAttemptView, SubscriptionView } from '@/types/res/customerAfterSalesRes'

// Gia hạn một kỳ gói theo tấm pin (backend 763cb0b, `renewsSubscriptionId`): kỳ mới bảo vệ đúng các tấm của kỳ cũ, bắt đầu khi kỳ cũ
// hết (liền kỳ, không chờ lại). Gia hạn được hay không theo `renewableSubscriptionIds` của backend, không tự suy theo ngày. Trả 100%
// trước bằng một link riêng; số tiền là số của link backend trả về

type Method = (typeof PURCHASE_METHODS)[number]['value']

export function RenewalDialog({
  subscription: s,
  onClose,
  onPurchased,
}: {
  /** Kỳ PANEL cần gia hạn; null: hộp thoại đóng */
  subscription: SubscriptionView | null
  onClose: () => void
  onPurchased: (checkout: PaymentAttemptView) => void
}) {
  const coverage = usePanelCoverageQuery(s?.contractId ?? null, { enabled: s !== null })
  const purchase = usePurchaseMutation()
  const [packageId, setPackageId] = useState('')
  const [method, setMethod] = useState<Method>('ONLINE')
  const [error, setError] = useState<string | null>(null)
  const view = coverage.data && s && coverage.data.contractId === s.contractId ? coverage.data : undefined
  const packages = view && s ? perPanelPackagesOfKind(view, s.kind) : []
  // Mặc định là gói cùng tên với kỳ đang gia hạn nếu vẫn còn bán
  const chosen =
    packages.find((p) => p.packageId === packageId) ??
    packages.find((p) => p.name === s?.packageName) ??
    (packages.length === 1 ? packages[0] : undefined)
  const renewable = view && s ? isRenewable(view, s.kind, s.subscriptionId) : false
  const busy = purchase.isPending

  function close() {
    if (busy) return
    setPackageId('')
    setMethod('ONLINE')
    setError(null)
    onClose()
  }

  async function confirm() {
    if (!s || !chosen || !renewable || busy) return
    setError(null)
    try {
      const result = await purchase.mutateAsync(
        renewalBody({
          contractId: s.contractId,
          kind: s.kind,
          packageId: chosen.packageId,
          renewsSubscriptionId: s.subscriptionId,
          paymentMethod: method,
        }),
      )
      setPackageId('')
      setMethod('ONLINE')
      onPurchased(result.checkout)
    } catch (e) {
      setError(panelPurchaseErrorMessage(e))
    }
  }

  // Backend gia hạn các tấm còn hoạt động của kỳ cũ; tấm đã thay chỉ còn là lịch sử nên không liệt kê
  const panels = (s?.coveredPanels ?? []).filter((a) => a.assetStatus === 'ACTIVE')
  const units = panels.reduce((sum, a) => sum + a.unitCount, 0)
  const dropped = (s?.coveredPanels ?? []).length - panels.length

  return (
    <ModalDialog
      open={s !== null}
      onOpenChange={(open) => !open && close()}
      dismissible={!busy}
      aria-label={s ? `Gia hạn ${s.packageName}` : undefined}
      className="max-w-xl"
    >
      {s && (
        <>
          <DialogTitle>Gia hạn {s.packageName}</DialogTitle>
          <p className="mt-2 text-body text-fg-2">
            {bundledKindLabel(s.kind)} cho <span className="tnum">{units}</span> tấm pin còn hoạt động của kỳ hiện tại.
            Kỳ mới bắt đầu khi kỳ này hết{s.endsAt ? ` (${formatMoment(s.endsAt)})` : ''}.
            {dropped > 0 && ' Tấm đã thay không được gia hạn theo kỳ này; mua gói riêng cho tấm thay mới.'}
          </p>
          {panels.length > 0 && (
            <ul className="mt-3 space-y-1 text-meta text-fg">
              {panels.map((a) => (
                <li key={a.allocationId}>{coveredPanelLabel(a)}</li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-4">
            {coverage.isPending ? (
              <Skeleton className="h-24" />
            ) : !view ? (
              <ErrorState
                title="Không tải được thông tin gia hạn."
                message={panelPurchaseErrorMessage(coverage.error)}
                onRetry={() => void coverage.refetch()}
              />
            ) : !renewable ? (
              <Notice tone="warn" title="Kỳ này chưa gia hạn được">
                Kỳ đã có kỳ gia hạn đang chờ, đã hết hiệu lực, hoặc loại gói này đang tạm dừng bán cho công trình.
              </Notice>
            ) : packages.length === 0 ? (
              <Notice tone="warn" title="Chưa có gói theo tấm pin đang bán">
                Smart Solar chưa bán gói {bundledKindLabel(s.kind).toLowerCase()} theo tấm pin nào để gia hạn.
              </Notice>
            ) : (
              <>
                <Field label="Gói gia hạn" htmlFor="renewal-package" required>
                  <Select
                    id="renewal-package"
                    aria-required
                    value={chosen?.packageId ?? ''}
                    disabled={busy}
                    onChange={(e) => setPackageId(e.target.value)}
                  >
                    {!chosen && <option value="">Chọn gói</option>}
                    {packages.map((p) => (
                      <option key={p.packageId} value={p.packageId}>
                        {p.name}, {formatUnitPrice(p.price, 'PER_PANEL')}, {formatDurationMonths(p.durationMonths)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Cách trả">
                  <Segmented
                    label="Cách trả"
                    options={[...PURCHASE_METHODS]}
                    value={method}
                    onChange={setMethod}
                    className="w-fit"
                  />
                </Field>
              </>
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
              icon="autorenew"
              variant="primary"
              disabled={!renewable || !chosen || busy}
              onClick={() => void confirm()}
            >
              {busy ? 'Đang gửi…' : method === 'CASH' ? 'Gia hạn, trả tiền mặt' : 'Gia hạn và thanh toán'}
            </Button>
          </DialogFooter>
        </>
      )}
    </ModalDialog>
  )
}
