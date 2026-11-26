import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { subscriptionStatusMeta } from '@/features/after-sales/afterSalesDisplay'
import { bundledKindLabel, bundledStatusMeta, formatUnitPrice } from '@/features/after-sales/servicePackageDisplay'
import { bundledReasonText } from '@/features/payment-plan/bundledContractRules'
import { readContractSnapshot } from '@/features/payment-plan/contractSnapshot'
import { formatVnd } from '@/features/payment-plan/paymentPlanDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useContractQuery } from '@/hooks/useContracts'
import { useReconcileBundledPackageMutation } from '@/hooks/useManagerAfterSales'
import { errorMessage } from '@/services/api/errors'
import type { BundledPackageView } from '@/types/res/managerAfterSalesRes'

// Chi tiết một gói đi kèm hợp đồng và đối soát lại (quản lý, quản trị). Đối soát chỉ thử lại việc tạo gói sau khi sổ thiết bị đã
// lắp được sửa: không đổi số tiền nào, không tự coi là thành công. Kết quả hiện đúng trạng thái backend trả về (có thể vẫn chờ đối
// soát với lý do mới)

export function BundledPackageDialog({
  item,
  contractHref,
  onClose,
}: {
  /** null: hộp thoại đóng */
  item: BundledPackageView | null
  contractHref: (contractId: string) => string
  onClose: () => void
}) {
  const reconcile = useReconcileBundledPackageMutation()
  // Danh sách chỉ có mã hợp đồng: mở hộp thì đọc một hợp đồng (GET /contracts/{id}, quản lý / quản trị đọc được) để có số hợp đồng
  // thật và khách; đọc lỗi thì vẫn dùng mã rút gọn
  const contract = useContractQuery(item?.contractId)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Bản backend trả sau khi đối soát (thay bản của danh sách cho tới khi đóng)
  const [result, setResult] = useState<BundledPackageView | null>(null)
  const p = result && item && result.commitmentId === item.commitmentId ? result : item
  const busy = reconcile.isPending

  function close() {
    if (busy) return
    setConfirming(false)
    setError(null)
    setResult(null)
    onClose()
  }

  async function run() {
    if (!p || busy) return
    setError(null)
    try {
      const view = await reconcile.mutateAsync(p.commitmentId)
      setResult(view)
      setConfirming(false)
      if (view.status === 'PROVISIONED') toast.success(`Đã đối soát, gói ${view.packageName} đã được tạo.`)
      else
        toast.warning('Đối soát xong nhưng gói vẫn chưa được tạo.', {
          description: bundledReasonText(view.statusReason) ?? view.statusReason ?? undefined,
        })
    } catch (e) {
      setError(errorMessage(e))
      setConfirming(false)
    }
  }

  const status = p ? bundledStatusMeta(p.status, 'staff') : null
  const c = contract.data && p && contract.data.contractId === p.contractId ? contract.data : null
  const customerName = c ? readContractSnapshot(c.pricingSnapshot, c.customerSnapshot).customer.name : null
  const reason = p ? (bundledReasonText(p.statusReason) ?? p.statusReason) : null

  return (
    <ModalDialog
      open={item !== null}
      onOpenChange={(open) => !open && close()}
      dismissible={!busy}
      aria-label={p ? `Gói ${p.packageName}` : undefined}
      className="max-w-2xl"
    >
      {p && status && (
        <>
          <DialogTitle>{p.packageName}</DialogTitle>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-body text-fg-2">
            {bundledKindLabel(p.kind)}, hợp đồng{' '}
            <span className="tnum">{c?.contractNumber ?? shortCode(p.contractId)}</span>
            {customerName && `, ${customerName}`}
            <Badge tone={status.tone}>{status.label}</Badge>
          </p>
          <KeyValueList
            columns={2}
            className="mt-4"
            items={[
              ...(c
                ? [{ k: 'Tổng giá trị hợp đồng', v: <span className="tnum">{formatVnd(c.totalAmount)}</span> }]
                : []),
              { k: 'Đơn giá', v: <span className="tnum">{formatUnitPrice(p.unitPrice, 'PER_PANEL')}</span> },
              { k: 'Số tấm pin', v: <span className="tnum">{p.quantity.toLocaleString('vi-VN')} tấm</span> },
              { k: 'Thành tiền', v: <span className="tnum font-semibold">{formatVnd(p.totalAmount)}</span> },
              { k: 'Trong thanh toán đợt 1', v: <span className="tnum">{formatVnd(p.depositAllocation)}</span> },
              { k: 'Trong thanh toán đợt 2', v: <span className="tnum">{formatVnd(p.balanceAllocation)}</span> },
              {
                k: 'Gói đã tạo',
                v: p.subscriptionStatus ? subscriptionStatusMeta(p.subscriptionStatus).label : 'Chưa tạo',
              },
              { k: 'Thời hạn', v: p.startsAt ? `${formatMoment(p.startsAt)} đến ${formatMoment(p.endsAt)}` : '—' },
              { k: 'Bảo vệ từ', v: p.coverageStartsAt ? formatMoment(p.coverageStartsAt) : '—' },
              { k: 'Đổi trạng thái lúc', v: p.statusChangedAt ? formatMoment(p.statusChangedAt) : '—' },
            ]}
          />
          {reason && (
            <p className="mt-4 text-body text-fg">
              <span className="font-medium">Lý do: </span>
              {reason}
            </p>
          )}

          {p.status === 'RECONCILIATION_REQUIRED' && (
            <Notice tone="warn" title="Sửa sổ thiết bị đã lắp trước khi đối soát lại" className="mt-4">
              Số tấm pin đang hoạt động của công trình phải bằng số trong hợp đồng thì gói mới được tạo. Mở hợp đồng để
              sang công trình và sửa thiết bị đã lắp, rồi đối soát lại. Đối soát không đổi số tiền nào.
              <span className="mt-3 flex flex-wrap gap-3">
                <ButtonLink to={contractHref(p.contractId)} size="sm" variant="info" icon="history_edu">
                  Mở hợp đồng
                </ButtonLink>
              </span>
            </Notice>
          )}

          {confirming && (
            <div role="alertdialog" aria-label="Xác nhận đối soát lại" className="mt-4">
              <Notice tone="info" title="Thực hiện đối soát lại?">
                Hệ thống kiểm tra lại số tấm pin đang hoạt động của công trình. Khớp hợp đồng thì tạo gói cho khách;
                chưa khớp thì gói vẫn chờ đối soát với lý do mới.
              </Notice>
            </div>
          )}

          {error && (
            <div role="alert" className="mt-4">
              <Notice tone="danger">{error}</Notice>
            </div>
          )}

          <DialogFooter>
            <Button
              icon="close"
              variant="secondary"
              disabled={busy}
              onClick={confirming ? () => setConfirming(false) : close}
            >
              {confirming ? 'Quay lại' : 'Đóng'}
            </Button>
            {p.status === 'RECONCILIATION_REQUIRED' &&
              (confirming ? (
                <Button icon="fact_check" variant="primary" disabled={busy} onClick={() => void run()}>
                  {busy ? 'Đang đối soát…' : 'Xác nhận đối soát lại'}
                </Button>
              ) : (
                <Button icon="fact_check" variant="primary" disabled={busy} onClick={() => setConfirming(true)}>
                  Thực hiện đối soát lại
                </Button>
              ))}
          </DialogFooter>
        </>
      )}
    </ModalDialog>
  )
}
