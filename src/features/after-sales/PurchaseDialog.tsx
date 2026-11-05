import { useState } from 'react'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Select } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { purchasableContracts, type PurchasableContract, isMaintenance } from '@/features/after-sales/afterSalesDisplay'
import { PackageFacts } from '@/features/after-sales/PackageList'
import { usePurchaseMutation } from '@/hooks/useCustomerAfterSales'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { useMyInstallationsQuery } from '@/hooks/useCustomerInstallations'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { PackageView } from '@/types/res/customerAfterSalesRes'
import { formatMoney } from '@/utils/format'

// Backend ghi đơn mua (chờ thanh toán) trước khi gọi PayOS, nên khi PayOS không tạo được link thì đơn vẫn nằm ở danh sách
const LINK_FAILED = new Set(['PAYMENT_PROVIDER_NOT_CONFIGURED', 'PAYMENT_PROVIDER_ERROR'])

function contractLabel({ contract, includeContract }: PurchasableContract) {
  return `Hợp đồng ${contract.contractNumber} (${includeContract ? 'đã ký, chưa thanh toán' : 'đã thanh toán'})`
}

/**
 * Mua một gói (thiên tai hoặc bảo trì) cho một hợp đồng. Chỉ gửi khi khách bấm xác nhận; thành công thì trả id link thanh toán cho trang
 * mở hộp thoại thanh toán. Không tự đánh dấu đã mua: gói chỉ được ghi nhận khi PayOS xác nhận đã nhận tiền
 */
export function PurchaseDialog({
  pkg,
  onClose,
  onPurchased,
}: {
  /** null: hộp thoại đóng */
  pkg: PackageView | null
  onClose: () => void
  onPurchased: (attemptId: string) => void
}) {
  const [contractId, setContractId] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Hợp đồng đang có link thanh toán riêng (mở ở trang hợp đồng) nên không gộp vào link mua gói được
  const [busyContractId, setBusyContractId] = useState<string | null>(null)
  const purchase = usePurchaseMutation()
  const contracts = useMyContractsQuery()
  // Chỉ để bỏ hợp đồng có công trình đã huỷ; chưa tải xong hay lỗi thì backend tự từ chối
  const projects = useMyInstallationsQuery()
  const options = contracts.data ? purchasableContracts(contracts.data, projects.data) : []
  // Một hợp đồng thì chọn sẵn
  const selected =
    options.find((o) => o.contract.contractId === contractId) ?? (options.length === 1 ? options[0] : null)

  function close() {
    if (purchase.isPending) return
    setContractId('')
    setError(null)
    setBusyContractId(null)
    onClose()
  }

  async function confirm() {
    if (!pkg || !selected || purchase.isPending) return
    setError(null)
    setBusyContractId(null)
    try {
      // Mỗi loại gói một ô id; backend từ chối nếu id không đúng loại
      const maintenance = isMaintenance(pkg.kind)
      const view = await purchase.mutateAsync({
        contractId: selected.contract.contractId,
        disasterPackageId: maintenance ? null : pkg.packageId,
        maintenancePackageId: maintenance ? pkg.packageId : null,
        includeContract: selected.includeContract,
      })
      setContractId('')
      onPurchased(view.checkout.paymentAttemptId)
    } catch (e) {
      const linkFailed = isApiError(e) && e.code !== null && LINK_FAILED.has(e.code)
      if (isApiError(e) && e.code === 'PAYMENT_CHECKOUT_IN_PROGRESS' && selected.includeContract) {
        setBusyContractId(selected.contract.contractId)
        setError(
          `Hợp đồng ${selected.contract.contractNumber} đang có một link thanh toán chưa xong. Thanh toán hoặc huỷ link đó ở trang hợp đồng rồi mua gói lại.`,
        )
        return
      }
      setError(
        linkFailed
          ? `${errorMessage(e)} Đơn mua vẫn được ghi ở mục Gói của bạn với trạng thái chờ thanh toán; huỷ đơn đó trước khi mua lại.`
          : errorMessage(e),
      )
    }
  }

  return (
    <ModalDialog
      open={pkg !== null}
      onOpenChange={(open) => !open && close()}
      dismissible={!purchase.isPending}
      aria-label={pkg ? `Mua ${pkg.name}` : undefined}
      className="max-w-lg"
    >
      {pkg && (
        <>
          <DialogTitle>Mua {pkg.name}</DialogTitle>
          <PackageFacts pkg={pkg} className="mt-4" />

          <div className="mt-4">
            {contracts.isPending ? (
              <Skeleton className="h-16" />
            ) : contracts.data === undefined ? (
              <ErrorState
                title="Không tải được hợp đồng của bạn."
                message={contracts.error?.message}
                onRetry={() => void contracts.refetch()}
              />
            ) : options.length === 0 ? (
              <Notice tone="warn" title="Chưa có hợp đồng mua gói được">
                Gói được mua cho một hợp đồng lắp đặt đã ký hoặc đã thanh toán. Hợp đồng của bạn hiện ở đây khi tới bước
                đó.
              </Notice>
            ) : (
              <Field label="Hợp đồng" htmlFor="purchase-contract" required>
                <Select
                  id="purchase-contract"
                  aria-required
                  value={selected?.contract.contractId ?? ''}
                  disabled={purchase.isPending}
                  onChange={(e) => setContractId(e.target.value)}
                >
                  {!selected && <option value="">Chọn hợp đồng</option>}
                  {options.map((o) => (
                    <option key={o.contract.contractId} value={o.contract.contractId}>
                      {contractLabel(o)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          {selected?.includeContract && (
            <Notice tone="info" title="Thanh toán cùng hợp đồng" className="mt-4">
              Hợp đồng {selected.contract.contractNumber} chưa thanh toán, nên link PayOS gồm cả tiền hợp đồng (
              <span className="tnum">{formatMoney(selected.contract.totalAmount, selected.contract.currency)}</span>) và
              tiền gói (<span className="tnum">{formatMoney(pkg.price, 'VND')}</span>).
            </Notice>
          )}

          <p className="mt-4 text-body text-fg-2">
            Giá và quyền lợi của gói được giữ như lúc mua. Kỳ của gói bắt đầu khi PayOS xác nhận đã nhận tiền và công
            trình đã được bàn giao, tính từ mốc muộn hơn.
          </p>

          {error && (
            <div role="alert" className="mt-4">
              <Notice tone="danger">
                {error}
                {busyContractId && (
                  <span className="mt-3 flex">
                    <ButtonLink
                      to={withId(ROUTES.customer.contract, busyContractId)}
                      size="sm"
                      variant="info"
                      icon="history_edu"
                    >
                      Mở hợp đồng
                    </ButtonLink>
                  </span>
                )}
              </Notice>
            </div>
          )}

          <DialogFooter>
            <Button icon="close" variant="secondary" disabled={purchase.isPending} onClick={close}>
              Huỷ
            </Button>
            <Button
              icon="payments"
              variant="primary"
              disabled={!selected || purchase.isPending}
              onClick={() => void confirm()}
            >
              {purchase.isPending ? 'Đang tạo link thanh toán…' : 'Mua và thanh toán'}
            </Button>
          </DialogFooter>
        </>
      )}
    </ModalDialog>
  )
}
