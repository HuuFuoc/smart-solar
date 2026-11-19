import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, buttonClass } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Notice } from '@/components/common/ui/lists'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { CashConfirmDialog } from '@/features/contracts/CashConfirmDialog'
import { paymentStatusMeta } from '@/features/contracts/contractDisplay'
import { formatCountdown, secondsLeft } from '@/features/contracts/customerContractRules'
import {
  dueText,
  formatVnd,
  installmentName,
  installmentPaymentStateMeta,
  paymentPlanErrorMessage,
} from '@/features/payment-plan/paymentPlanDisplay'
import {
  canCancelInstallment,
  canOpenInstallment,
  isVerifiedInstallmentPaid,
} from '@/features/payment-plan/paymentPlanRules'
import { PaymentQr } from '@/features/payments/PaymentQr'
import { isCheckoutUrl } from '@/features/payments/payosReturn'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useConfirmAttemptCashMutation } from '@/hooks/usePaymentDesk'
import {
  useCancelInstallmentPaymentMutation,
  useInstallmentPaymentQuery,
  useRefreshContractWorld,
  useStartInstallmentPaymentMutation,
} from '@/hooks/usePaymentPlan'
import type { InstallmentActor } from '@/services/installmentService'
import type { InstallmentPaymentView } from '@/types/res/paymentPlanRes'

// Thanh toán một khoản của hợp đồng 30/70. Kỹ thuật viên (tại công trình) và khách (trong ứng dụng) mở QR PayOS hoặc ghi trả
// tiền mặt; nhân viên khác chỉ đọc, quản lý / quản trị xác nhận tiền mặt đúng số của khoản. "Đã trả" chỉ hiện khi backend trả
// PAID; trang PayOS chuyển về hay khách nói đã quét đều không đủ. Mở / huỷ bị giới hạn số lần nên chỉ gọi khi bấm

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

function QrBlock({
  view,
  actor,
  checking,
  onCheck,
}: {
  view: InstallmentPaymentView
  actor: InstallmentActor
  checking: boolean
  onCheck: () => void
}) {
  const attempt = view.current
  const now = useNow(Boolean(attempt?.expiresAt))
  if (!attempt) return null
  const left = secondsLeft(attempt.expiresAt, now)
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] sm:items-start">
      {attempt.qrCode ? (
        <PaymentQr
          value={attempt.qrCode}
          label={`Mã QR thanh toán ${formatVnd(attempt.amount)}`}
          className="w-full max-w-64 rounded-control border border-line"
        />
      ) : (
        <p className="text-body text-fg-2">Chưa có mã QR. Mở trang thanh toán bằng nút bên cạnh.</p>
      )}
      <div className="space-y-3">
        <p className="text-body text-fg">
          {actor === 'customer'
            ? 'Quét mã bằng ứng dụng ngân hàng, hoặc mở trang thanh toán.'
            : 'Khách quét mã bằng ứng dụng ngân hàng, không cần đăng nhập Smart Solar.'}
        </p>
        <Facts
          column
          items={[
            { k: 'Số tiền', v: <span className="tnum">{formatVnd(attempt.amount)}</span> },
            { k: 'Mã đơn', v: <span className="tnum">{attempt.orderCode}</span> },
            {
              k: 'Hết hạn',
              v: (
                <span className="tnum">
                  {formatMoment(attempt.expiresAt)}
                  {left !== null && left > 0 && `, còn ${formatCountdown(left)}`}
                </span>
              ),
            },
          ]}
        />
        <div className="flex flex-wrap gap-3">
          {isCheckoutUrl(attempt.checkoutUrl) && (
            <a href={attempt.checkoutUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('info')}>
              Mở trang thanh toán
            </a>
          )}
          <Button icon="refresh" variant="secondary" disabled={checking} onClick={onCheck}>
            {checking ? 'Đang kiểm tra…' : 'Kiểm tra lại'}
          </Button>
        </div>
        <p className="text-meta text-fg-2">Trạng thái tự cập nhật vài giây một lần.</p>
      </div>
    </div>
  )
}

function Attempts({ view }: { view: InstallmentPaymentView }) {
  if (view.attempts.length === 0) return null
  return (
    <details className="rounded-control border border-line px-3 py-2">
      <summary className="cursor-pointer text-body font-medium text-fg">
        Các lần thanh toán ({view.attempts.length})
      </summary>
      <Table stack className="mt-2">
        <thead>
          <tr>
            <Th>Mã đơn</Th>
            <Th>Cách trả</Th>
            <Th>Trạng thái</Th>
            <Th>Tạo lúc</Th>
            <Th className="text-right">Số tiền</Th>
          </tr>
        </thead>
        <tbody>
          {view.attempts.map((a) => {
            const status = paymentStatusMeta(a.status)
            return (
              <Tr key={a.paymentAttemptId}>
                <Td label="Mã đơn" className="tnum">
                  {a.orderCode}
                </Td>
                <Td label="Cách trả">{a.method === 'CASH' ? 'Tiền mặt' : 'PayOS'}</Td>
                <Td label="Trạng thái">
                  <Badge tone={status.tone}>{status.label}</Badge>
                  {a.paidAt && <p className="tnum text-meta text-fg-2">Trả lúc {formatMoment(a.paidAt)}</p>}
                </Td>
                <Td label="Tạo lúc" className="tnum">
                  {formatMoment(a.createdAt)}
                </Td>
                <Td label="Số tiền" className="tnum lg:text-right">
                  {formatVnd(a.amount)}
                </Td>
              </Tr>
            )
          })}
        </tbody>
      </Table>
    </details>
  )
}

/**
 * `actor`: technician / customer mở và huỷ được; staff chỉ đọc. `canConfirmCash`: quản lý / quản trị xác nhận tiền mặt ngay tại
 * đây (cùng lệnh của bàn thu tiền, số tiền đúng bằng khoản)
 */
export function InstallmentPaymentBlock({
  actor,
  contractId,
  sequence,
  canConfirmCash = false,
}: {
  actor: InstallmentActor
  contractId: string
  sequence: number
  canConfirmCash?: boolean
}) {
  const target = { contractId, sequence }
  const query = useInstallmentPaymentQuery(actor, target)
  const writer = actor === 'staff' ? null : actor
  const start = useStartInstallmentPaymentMutation(writer ?? 'customer')
  const cancel = useCancelInstallmentPaymentMutation(writer ?? 'customer')
  const confirm = useConfirmAttemptCashMutation()
  const [askCash, setAskCash] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = start.isPending || cancel.isPending
  const view = query.data
  const refreshContract = useRefreshContractWorld()
  const lastState = useRef<string | null>(null)

  // Khối này chỉ vẽ cho khoản hợp đồng còn ghi DUE. Lần hỏi lại thấy backend đã ghi PAID (PayOS xác minh, quản lý xác nhận tiền
  // mặt) thì hợp đồng đã đổi chặng: tải lại hợp đồng, lịch, dự án. Chỉ báo "đã nhận" khi chính lần xem này thấy đổi sang PAID
  const paymentState = view?.paymentState ?? null
  const paidAmount = view?.amount
  const paidName = view ? installmentName(view) : ''
  useEffect(() => {
    const before = lastState.current
    lastState.current = paymentState
    if (paymentState !== 'PAID' || before === 'PAID') return
    if (before !== null) toast.success(`Đã nhận ${paidName.toLowerCase()} (${formatVnd(paidAmount)}).`)
    void refreshContract()
  }, [paymentState, paidAmount, paidName, refreshContract])

  async function open(method: 'ONLINE' | 'CASH') {
    if (!writer || busy) return
    setError(null)
    try {
      await start.mutateAsync({ ...target, method })
      toast.success(
        method === 'CASH' ? 'Đã ghi trả tiền mặt. Chờ quản lý xác nhận đã thu.' : 'Đã tạo mã QR. Chờ PayOS xác nhận.',
      )
      setAskCash(false)
    } catch (e) {
      setError(paymentPlanErrorMessage(e))
    }
  }

  async function stop() {
    if (!writer || busy) return
    setError(null)
    try {
      await cancel.mutateAsync(target)
      toast.success('Đã huỷ lần thanh toán đang mở.')
    } catch (e) {
      setError(paymentPlanErrorMessage(e))
    }
  }

  if (query.isPending) return <Skeleton className="h-24" />
  if (!view)
    return (
      <ErrorState
        title="Không tải được trạng thái thanh toán."
        message={paymentPlanErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    )

  const state = installmentPaymentStateMeta(view.paymentState)
  const name = installmentName(view)

  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-center gap-2 text-body font-medium text-fg">
        {name}: <span className="tnum">{formatVnd(view.amount)}</span>
        <Badge tone={view.overdue ? 'danger' : state.tone}>{view.overdue ? 'Quá hạn' : state.label}</Badge>
      </p>
      {view.dueAt && view.installmentStatus !== 'PAID' && (
        <p className="tnum text-body text-fg-2">
          {dueText(view.dueAt)}
          {view.overdue && '. Vẫn trả được sau hạn; khoản trả muộn được ghi lại.'}
        </p>
      )}

      {isVerifiedInstallmentPaid(view) ? (
        <Notice tone="ok" title={`Đã nhận ${formatVnd(view.amount)}`}>
          {view.current?.method === 'CASH' ? 'Quản lý đã xác nhận tiền mặt' : 'PayOS đã xác nhận'}
          {view.paidAt ? ` lúc ${formatMoment(view.paidAt)}` : ''}
          {view.paidLate ? '. Trả sau hạn.' : '.'}
        </Notice>
      ) : view.paymentState === 'ONLINE_IN_PROGRESS' ? (
        <QrBlock view={view} actor={actor} checking={query.isFetching} onCheck={() => void query.refetch()} />
      ) : view.paymentState === 'AWAITING_CASH_CONFIRMATION' ? (
        <p className="text-body text-fg-2">
          {actor === 'customer'
            ? 'Bạn đã chọn trả tiền mặt. Khoản này chỉ được ghi đã trả khi Smart Solar xác nhận đã thu đủ.'
            : 'Chờ quản lý / quản trị xác nhận đã thu (đúng số tiền, số phiếu thu, ảnh phiếu thu).'}
        </p>
      ) : view.paymentState === 'NOT_PAYABLE' ? (
        <p className="text-body text-fg-2">
          {view.kind === 'BALANCE' && view.installmentStatus === 'PENDING'
            ? 'Khoản 70% mở khi khách nghiệm thu công trình, hạn trả tối đa 72 giờ sau đó.'
            : 'Khoản này chưa trả được lúc này.'}
        </p>
      ) : null}

      {error && (
        <div role="alert">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {writer && canOpenInstallment(view) && (
          <>
            <Button icon="qr_code_2" variant="primary" disabled={busy} onClick={() => void open('ONLINE')}>
              {start.isPending ? 'Đang tạo…' : 'Hiện mã QR'}
            </Button>
            <Button icon="payments" variant="soft" disabled={busy} onClick={() => setAskCash(true)}>
              {actor === 'customer' ? 'Trả tiền mặt' : 'Khách trả tiền mặt'}
            </Button>
          </>
        )}
        {writer && canCancelInstallment(view) && (
          <Button icon="cancel" variant="danger" disabled={busy} onClick={() => void stop()}>
            {cancel.isPending
              ? 'Đang huỷ…'
              : view.paymentState === 'AWAITING_CASH_CONFIRMATION'
                ? 'Bỏ chọn tiền mặt'
                : 'Huỷ mã QR'}
          </Button>
        )}
        {canConfirmCash && view.paymentState === 'AWAITING_CASH_CONFIRMATION' && view.current && (
          <Button icon="task_alt" variant="soft" onClick={() => setConfirming(true)}>
            Xác nhận đã thu
          </Button>
        )}
      </div>
      {writer && canCancelInstallment(view) && (
        <p className="text-meta text-fg-2">Muốn đổi cách trả thì huỷ lần đang mở trước.</p>
      )}

      <Attempts view={view} />

      {askCash && (
        <ModalDialog
          open
          onOpenChange={(o) => !o && !busy && setAskCash(false)}
          dismissible={!busy}
          aria-label="Trả tiền mặt?"
        >
          <DialogTitle>{actor === 'customer' ? 'Trả tiền mặt?' : 'Khách trả tiền mặt?'}</DialogTitle>
          <p className="mt-2 text-body text-fg-2">
            {name} {formatVnd(view.amount)}. Chọn tiền mặt chưa phải đã trả: quản lý / quản trị xác nhận đã thu (đúng số
            tiền, số phiếu thu, ảnh phiếu thu) thì khoản này mới được ghi đã trả.
          </p>
          {error && (
            <div role="alert" className="mt-4">
              <Notice tone="danger">{error}</Notice>
            </div>
          )}
          <DialogFooter>
            <Button icon="close" variant="secondary" disabled={busy} onClick={() => setAskCash(false)}>
              Đóng
            </Button>
            <Button icon="payments" variant="primary" disabled={busy} onClick={() => void open('CASH')}>
              {start.isPending ? 'Đang ghi…' : 'Ghi trả tiền mặt'}
            </Button>
          </DialogFooter>
        </ModalDialog>
      )}
      {confirming && view.current && (
        <CashConfirmDialog
          target={{
            title: `${name} của hợp đồng ${view.contractNumber}`,
            amount: view.amount,
            currency: view.currency,
            successText: `Đã ghi nhận ${name.toLowerCase()} trả tiền mặt.`,
            confirm: (body) => confirm.mutateAsync({ attemptId: view.current!.paymentAttemptId, body }),
          }}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
