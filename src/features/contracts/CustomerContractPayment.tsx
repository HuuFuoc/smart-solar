import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink, buttonClass } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, Skeleton, UnavailableState } from '@/components/common/ui/states'
import { paymentStatusMeta } from '@/features/after-sales/afterSalesDisplay'
import { ContractConfirmDialog } from '@/features/contracts/ContractConfirmDialog'
import { customerContractError } from '@/features/contracts/customerContractDisplay'
import {
  attemptsNeedingStaff,
  canCancelPayment,
  canCreatePayment,
  canSelectCash,
  formatCountdown,
  isCashAttempt,
  isCombinedCheckout,
  liveAttempt,
  secondsLeft,
} from '@/features/contracts/customerContractRules'
import { PAYMENT_METHODS } from '@/common/contract'
import { Facts } from '@/features/pre-surveys/Facts'
import { isCheckoutUrl, rememberCheckout } from '@/features/payments/payosReturn'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  useCancelContractPaymentMutation,
  useContractPaymentsQuery,
  useCreateContractPaymentMutation,
  useSelectCashPaymentMutation,
} from '@/hooks/useCustomerContracts'
import { useCheckoutRedirect } from '@/hooks/useCheckoutRedirect'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage, isApiError, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import type { PaymentAttemptView } from '@/types/res/customerAfterSalesRes'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { ContractPaymentView } from '@/types/res/staffPaymentsRes'
import { formatMoney } from '@/utils/format'

// Thanh toán 100% hợp đồng đã duyệt bản ký: qua PayOS hoặc trả tiền mặt (hai cách loại trừ nhau, backend chỉ giữ một lần thanh
// toán mở). Số tiền do hệ thống quyết định. Link chỉ tạo khi khách bấm; hệ thống trả lại link còn sống nếu có. Đang có link chờ
// thì hỏi lại trạng thái mỗi 5 giây, chờ tiền mặt thì mỗi phút (hook); đồng hồ đếm ngược theo giờ máy chỉ để hiện. Chỉ báo đã
// thanh toán khi hệ thống xác nhận (hợp đồng PAID): chọn tiền mặt chưa phải đã trả

/** Đồng hồ giây, chỉ chạy khi cần */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

function LiveLink({
  attempt,
  view,
  contractPath,
  checking,
  onCheck,
  onCancel,
}: {
  attempt: PaymentAttemptView
  view: ContractPaymentView
  contractPath: string
  checking: boolean
  onCheck: () => void
  onCancel: (() => void) | null
}) {
  const now = useNow(true)
  const left = secondsLeft(attempt.expiresAt, now) ?? 0
  const combined = isCombinedCheckout(attempt, view)
  // Hết giờ theo máy: hỏi lại một lần, hệ thống quyết định link đã hết hạn hay chưa
  const askedAtZero = useRef(false)
  useEffect(() => {
    if (left > 0) askedAtZero.current = false
    else if (!askedAtZero.current) {
      askedAtZero.current = true
      onCheck()
    }
  }, [left, onCheck])

  return (
    <div className="space-y-4">
      {combined && (
        <Notice tone="info" title="Link này gồm cả tiền gói dịch vụ">
          Link được tạo khi bạn mua gói kèm hợp đồng, tổng{' '}
          <span className="tnum">{formatMoney(attempt.amount, attempt.currency)}</span>. Thanh toán link này, hoặc huỷ
          đơn gói ở mục Gói dịch vụ nếu chỉ muốn trả tiền hợp đồng.
          <span className="mt-3 flex">
            <ButtonLink to={ROUTES.customer.packages} size="sm" variant="info" icon="shield">
              Mở Gói dịch vụ
            </ButtonLink>
          </span>
        </Notice>
      )}
      <Facts
        items={[
          { k: 'Số tiền của link', v: formatMoney(attempt.amount, attempt.currency) },
          { k: 'Mã đơn PayOS', v: attempt.orderCode },
          {
            k: 'Hạn thanh toán',
            v: (
              <>
                {formatMoment(attempt.expiresAt)}
                <span className="text-fg-2">
                  {left > 0 ? `, còn ${formatCountdown(left)}` : ', đã tới hạn, đang kiểm tra lại'}
                </span>
              </>
            ),
          },
          {
            k: 'Trạng thái',
            v: <Badge tone={paymentStatusMeta(attempt.status).tone}>{paymentStatusMeta(attempt.status).label}</Badge>,
          },
        ]}
      />
      {attempt.checkoutUrl ? (
        <p className="text-body text-fg-2">
          Trả tiền trên trang PayOS (có mã QR để quét bằng ứng dụng ngân hàng) rồi quay lại đây. Trạng thái tự kiểm tra
          lại vài giây một lần và chỉ đổi khi PayOS xác nhận đã nhận tiền.
        </p>
      ) : (
        <Notice tone="warn">PayOS chưa trả link cho lần thanh toán này. Bấm Kiểm tra lại sau ít phút.</Notice>
      )}
      <div className="flex flex-wrap gap-3">
        {isCheckoutUrl(attempt.checkoutUrl) && (
          <a
            href={attempt.checkoutUrl}
            className={buttonClass('primary')}
            onClick={() => rememberCheckout(attempt.orderCode, contractPath)}
          >
            Mở trang thanh toán PayOS
          </a>
        )}
        <Button variant="secondary" icon="refresh" disabled={checking} onClick={onCheck}>
          {checking ? 'Đang kiểm tra…' : 'Kiểm tra lại'}
        </Button>
        {onCancel && (
          <Button variant="danger" icon="cancel" onClick={onCancel}>
            Huỷ link
          </Button>
        )}
      </div>
    </div>
  )
}

function CashPending({
  attempt,
  checking,
  onCheck,
  onCancel,
}: {
  attempt: PaymentAttemptView
  checking: boolean
  onCheck: () => void
  onCancel: (() => void) | null
}) {
  return (
    <div className="space-y-4">
      <Notice tone="info" title="Bạn đã chọn trả tiền mặt">
        Hợp đồng chưa được tính là đã thanh toán. Trả đúng{' '}
        <span className="tnum">{formatMoney(attempt.amount, attempt.currency)}</span> cho Smart Solar và giữ phiếu thu;
        trang này đổi sang đã thanh toán khi Smart Solar xác nhận đã nhận tiền.
      </Notice>
      <Facts
        items={[
          { k: 'Số tiền', v: formatMoney(attempt.amount, attempt.currency) },
          { k: 'Chọn lúc', v: formatMoment(attempt.createdAt) },
          {
            k: 'Trạng thái',
            v: <Badge tone="info">Chờ Smart Solar xác nhận</Badge>,
          },
        ]}
      />
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" icon="refresh" disabled={checking} onClick={onCheck}>
          {checking ? 'Đang kiểm tra…' : 'Kiểm tra lại'}
        </Button>
        {onCancel && (
          <Button variant="danger" icon="cancel" onClick={onCancel}>
            Bỏ chọn tiền mặt
          </Button>
        )}
      </div>
    </div>
  )
}

export function CustomerContractPayment({
  contract,
  returned,
}: {
  contract: ContractView
  /** Khách vừa quay về từ trang PayOS (trả tiền hoặc bấm huỷ): chỉ để hiện câu "đang kiểm tra" */
  returned: 'return' | 'cancel' | null
}) {
  const enabled = contract.status === 'SIGNED' || contract.status === 'PAID'
  const query = useContractPaymentsQuery(contract.contractId, { enabled })
  const create = useCreateContractPaymentMutation()
  const cash = useSelectCashPaymentMutation()
  const cancel = useCancelContractPaymentMutation()
  const [createError, setCreateError] = useState<string | null>(null)
  const checkout = useCheckoutRedirect()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmCash, setConfirmCash] = useState(false)
  const contractPath = withId(ROUTES.customer.contract, contract.contractId)
  const view = query.data
  const live = liveAttempt(view)
  const liveCash = isCashAttempt(live)
  const paid = view?.contractStatus === 'PAID' || contract.status === 'PAID'
  const attention = view ? attemptsNeedingStaff(view.attempts) : []
  const choosing = create.isPending || cash.isPending || checkout.leaving

  // Có link là sang ngay trang PayOS trong tab này; PayOS chưa trả link thì ở lại, khối dưới hiện trạng thái để kiểm tra lại
  async function createLink() {
    setCreateError(null)
    try {
      const attempt = await create.mutateAsync(contract.contractId)
      if (!checkout.go(attempt, contractPath)) rememberCheckout(attempt.orderCode, contractPath)
    } catch (e) {
      setCreateError(customerContractError(e))
    }
  }

  if (!enabled)
    return (
      <Panel id="contract-payment" className="scroll-mt-6">
        <PanelHeader title="Thanh toán" />
        <PanelBody>
          <p className="text-body text-fg-2">
            {contract.status === 'SUPERSEDED'
              ? 'Phiên bản này đã có bản mới thay, thanh toán trên bản mới.'
              : `Thanh toán một lần ${formatMoney(contract.totalAmount, contract.currency)} qua PayOS hoặc tiền mặt sau khi Smart Solar duyệt bản ký.`}
          </p>
        </PanelBody>
      </Panel>
    )

  return (
    <Panel id="contract-payment" className="scroll-mt-6">
      <PanelHeader title="Thanh toán" />
      <PanelBody className="space-y-4">
        {returned && !paid && (
          <div role="status">
            <Notice tone="info">
              {returned === 'cancel'
                ? 'Bạn đã rời trang PayOS. Link vẫn dùng được tới hạn nếu chưa bị huỷ; trạng thái dưới đây do hệ thống kiểm tra.'
                : 'Bạn vừa quay lại từ PayOS. Hệ thống đang kiểm tra với PayOS, trạng thái dưới đây tự cập nhật.'}
            </Notice>
          </div>
        )}

        {query.isPending ? (
          <Skeleton className="h-32" />
        ) : view === undefined ? (
          isFeatureUnavailable(query.error) ? (
            <UnavailableState
              message="Chưa xem được trạng thái thanh toán."
              pendingMigrations={pendingMigrationsOf(query.error)}
            />
          ) : (
            <ErrorState
              title="Không tải được trạng thái thanh toán."
              message={
                isApiError(query.error) && query.error.status === 429
                  ? customerContractError(query.error)
                  : errorMessage(query.error)
              }
              onRetry={() => void query.refetch()}
            />
          )
        ) : (
          <>
            {query.isError && (
              <Notice tone="warn">
                Không kiểm tra lại được trạng thái ({customerContractError(query.error)}). Đang hiện kết quả lần trước.
              </Notice>
            )}
            {attention.length > 0 && (
              <Notice tone="warn" title="Smart Solar đang xử lý một khoản tiền của bạn">
                <ul className="list-disc pl-5">
                  {attention.map((a) => (
                    <li key={a.paymentAttemptId} className="tnum">
                      Mã đơn {a.orderCode}, {formatMoney(a.amount, a.currency)}:{' '}
                      {a.status === 'REFUND_REQUIRED'
                        ? 'hợp đồng đã được thanh toán bằng lần khác, khoản này sẽ được hoàn lại.'
                        : 'số tiền nhận được không khớp hợp đồng, nhân viên sẽ đối soát và liên hệ bạn.'}
                    </li>
                  ))}
                </ul>
              </Notice>
            )}

            {paid ? (
              <Notice tone="ok" title={`Đã thanh toán đủ lúc ${formatMoment(view.current?.paidAt ?? contract.paidAt)}`}>
                {isCashAttempt(view.current)
                  ? `Smart Solar đã xác nhận nhận tiền mặt${view.current?.providerReference ? ` (phiếu thu ${view.current.providerReference})` : ''}.`
                  : `PayOS đã xác nhận nhận tiền${view.current?.providerReference ? ` (mã giao dịch ${view.current.providerReference})` : ''}.`}{' '}
                Lịch thi công đã hẹn được xác nhận tự động; tiến độ lắp đặt xem ở mục Lắp đặt.
              </Notice>
            ) : live && liveCash ? (
              <CashPending
                attempt={live}
                checking={query.isFetching}
                onCheck={() => void query.refetch()}
                onCancel={canCancelPayment(view) ? () => setConfirmCancel(true) : null}
              />
            ) : live ? (
              <LiveLink
                attempt={live}
                view={view}
                contractPath={contractPath}
                checking={query.isFetching}
                onCheck={() => void query.refetch()}
                onCancel={canCancelPayment(view) ? () => setConfirmCancel(true) : null}
              />
            ) : (
              <div className="space-y-4">
                <Facts items={[{ k: 'Số tiền phải trả', v: formatMoney(view.amount, view.currency) }]} />
                <p className="text-body text-fg-2">
                  Thanh toán một lần toàn bộ giá trị hợp đồng, chọn một trong hai cách. PayOS: link dùng được 15 phút,
                  hết hạn thì tạo link mới. Tiền mặt: trả cho Smart Solar, hợp đồng được tính là đã thanh toán khi Smart
                  Solar xác nhận đã nhận tiền.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    icon="payments"
                    variant="primary"
                    disabled={!canCreatePayment(view) || choosing}
                    onClick={() => void createLink()}
                  >
                    {create.isPending || checkout.leaving ? 'Đang mở PayOS…' : 'Thanh toán qua PayOS'}
                  </Button>
                  <Button
                    icon="money"
                    variant="soft"
                    disabled={!canSelectCash(view) || choosing}
                    onClick={() => setConfirmCash(true)}
                  >
                    Trả tiền mặt
                  </Button>
                </div>
                {createError && (
                  <div role="alert">
                    <Notice tone="danger">{createError}</Notice>
                  </div>
                )}
              </div>
            )}

            {view.attempts.length > 0 && (
              <details className="border-t border-line pt-4">
                <summary className="tap cursor-pointer text-body font-medium text-fg">
                  Các lần thanh toán ({view.attempts.length})
                </summary>
                <ul className="mt-3 space-y-2">
                  {view.attempts.map((a) => (
                    <li key={a.paymentAttemptId} className="tnum text-body text-fg-2">
                      <span className="text-fg">
                        {PAYMENT_METHODS[a.method] ?? a.method}, mã {a.orderCode}
                      </span>
                      , {formatMoney(a.amount, a.currency)}, tạo {formatMoment(a.createdAt)}:{' '}
                      {isCashAttempt(a) && a.status === 'PENDING' ? 'Chờ xác nhận' : paymentStatusMeta(a.status).label}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </PanelBody>

      {confirmCancel && (
        <ContractConfirmDialog
          title={liveCash ? 'Bỏ chọn trả tiền mặt?' : 'Huỷ link thanh toán?'}
          confirmLabel={liveCash ? 'Bỏ chọn tiền mặt' : 'Huỷ link'}
          icon="cancel"
          variant="danger-solid"
          successText={liveCash ? 'Đã bỏ chọn tiền mặt.' : 'Đã gửi lệnh huỷ link. Trạng thái đã được tải lại.'}
          formatError={customerContractError}
          run={() => cancel.mutateAsync(contract.contractId)}
          onClose={() => setConfirmCancel(false)}
        >
          {liveCash ? (
            <p>
              Sau đó bạn chọn lại cách thanh toán (PayOS hoặc tiền mặt). Nếu Smart Solar vừa xác nhận đã nhận tiền thì
              hợp đồng vẫn là đã thanh toán.
            </p>
          ) : (
            <>
              <p>
                Link PayOS hiện tại không dùng được nữa. Nếu PayOS đã nhận tiền thì hệ thống ghi nhận thanh toán thay vì
                huỷ.
              </p>
              <p>Mỗi hợp đồng tạo được tối đa 5 link trong 10 phút.</p>
            </>
          )}
        </ContractConfirmDialog>
      )}
      {confirmCash && (
        <ContractConfirmDialog
          title="Trả tiền mặt?"
          confirmLabel="Chọn tiền mặt"
          icon="money"
          successText="Đã ghi nhận bạn trả tiền mặt. Smart Solar sẽ liên hệ để nhận tiền."
          formatError={customerContractError}
          run={() => cash.mutateAsync(contract.contractId)}
          onClose={() => setConfirmCash(false)}
        >
          <p>
            Bạn trả đúng <span className="tnum">{formatMoney(contract.totalAmount, contract.currency)}</span> bằng tiền
            mặt cho Smart Solar. Hợp đồng chỉ được tính là đã thanh toán khi Smart Solar xác nhận đã nhận tiền và giao
            phiếu thu.
          </p>
          <p>Trong lúc chờ, không tạo được link PayOS; muốn trả qua PayOS thì bỏ chọn tiền mặt trước.</p>
        </ContractConfirmDialog>
      )}
    </Panel>
  )
}
