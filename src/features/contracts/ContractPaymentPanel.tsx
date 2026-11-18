import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CONTRACT_PAYMENT_STATES, PAYMENT_METHODS } from '@/common/contract'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, UnavailableState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { CashConfirmDialog } from '@/features/contracts/CashConfirmDialog'
import { FileInfo } from '@/features/files/FileInfo'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  contractStatusLabel,
  paymentEventLabel,
  paymentSourceLabel,
  paymentStatusMeta,
} from '@/features/contracts/contractDisplay'
import {
  canConfirmCash,
  hasPaymentStage,
  isAwaitingPayment,
  isPrepaidContract,
  paymentsNeedingAttention,
  type ContractViewer,
} from '@/features/contracts/contractRules'
import { contractKeys, useConfirmCashPaymentMutation, useContractPaymentsQuery } from '@/hooks/useContracts'
import { contractTitle } from '@/features/contracts/contractDisplay'
import { errorMessage, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { ContractPaymentView } from '@/types/res/staffPaymentsRes'
import { formatMoney } from '@/utils/format'

// Trạng thái thanh toán của hợp đồng phía quản lý / quản trị (GET /contracts/{id}/payments; kinh doanh bị 403 nên trang của
// kinh doanh không vẽ khối này). Hợp đồng lập từ báo giá đã trả tiền tại công trình: tiền đã xác minh trước khi có hợp đồng,
// trạng thái hợp đồng và trạng thái thanh toán hiện riêng, không thu lại. Hợp đồng cũ: PayOS hệ thống tự xác nhận; tiền mặt khách
// chọn trên cổng khách hàng, quản lý / quản trị ghi nhận kèm phiếu thu. Lần thanh toán cần xử lý tay (số tiền lệch, trả hai lần) tô đỏ

export function ContractPaymentPanel({
  contract,
  viewer,
  installationsPath,
}: {
  contract: ContractView
  viewer: ContractViewer
  /** Danh sách hợp đồng chờ tạo dự án thi công của quản lý / quản trị */
  installationsPath?: string
}) {
  const queryClient = useQueryClient()
  const enabled = hasPaymentStage(contract)
  const query = useContractPaymentsQuery(contract.contractId, { enabled, waiting: isAwaitingPayment(contract) })
  const reportedStatus = query.data?.contractStatus

  // Thanh toán xác nhận xong thì hợp đồng đã thành PAID: tải lại hợp đồng cho khớp
  useEffect(() => {
    if (reportedStatus && reportedStatus !== contract.status)
      void queryClient.invalidateQueries({ queryKey: contractKeys.all })
  }, [reportedStatus, contract.status, queryClient])

  return (
    <Panel>
      <PanelHeader
        title="Thanh toán"
        action={
          enabled && query.data ? (
            <Button
              size="sm"
              variant="secondary"
              icon="refresh"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              {query.isFetching ? 'Đang tải…' : 'Tải lại'}
            </Button>
          ) : undefined
        }
      />
      <PanelBody className="space-y-4">
        {!enabled ? (
          <p className="text-body text-fg-2">
            Khách thanh toán 100% qua PayOS hoặc tiền mặt sau khi bản ký được duyệt. Hiện chưa tới bước này.
          </p>
        ) : query.isPending ? (
          <p className="text-body text-fg-2">Đang tải trạng thái thanh toán…</p>
        ) : query.data === undefined ? (
          isFeatureUnavailable(query.error) ? (
            <UnavailableState
              message="Chưa xem được trạng thái thanh toán."
              pendingMigrations={pendingMigrationsOf(query.error)}
            />
          ) : (
            <ErrorState
              title="Không tải được trạng thái thanh toán."
              message={errorMessage(query.error)}
              onRetry={() => void query.refetch()}
            />
          )
        ) : (
          <PaymentBody view={query.data} contract={contract} viewer={viewer} installationsPath={installationsPath} />
        )}
      </PanelBody>
    </Panel>
  )
}

function PaymentBody({
  view,
  contract,
  viewer,
  installationsPath,
}: {
  view: ContractPaymentView
  contract: ContractView
  viewer: ContractViewer
  installationsPath?: string
}) {
  const attention = paymentsNeedingAttention(view.attempts)
  const prepaid = isPrepaidContract(contract)
  const paid = view.contractStatus === 'PAID'
  const [confirming, setConfirming] = useState(false)
  const confirmCash = useConfirmCashPaymentMutation()
  const cashToConfirm = canConfirmCash(view, viewer)
  const state = CONTRACT_PAYMENT_STATES[view.paymentState]
  const paidCash = paid && view.current?.method === 'CASH' ? view.current : null
  return (
    <>
      {cashToConfirm && (
        <Notice tone="danger" title="Khách chọn trả tiền mặt, chờ bạn xác nhận">
          Nhận đúng {formatMoney(view.amount, view.currency)} và giao phiếu thu cho khách, rồi ghi nhận ở đây kèm ảnh /
          PDF phiếu thu. Khách chọn lúc {formatMoment(view.current?.createdAt)}.
          <span className="mt-3 flex">
            <Button size="sm" variant="primary" icon="task_alt" onClick={() => setConfirming(true)}>
              Xác nhận đã nhận tiền
            </Button>
          </span>
        </Notice>
      )}
      {attention.length > 0 && (
        <Notice tone="danger" title={`${attention.length} lần thanh toán cần xử lý tay`}>
          <ul className="list-disc pl-5">
            {attention.map((a) => (
              <li key={a.paymentAttemptId} className="tnum">
                Mã đơn {a.orderCode}, {formatMoney(a.amount, a.currency)}: {paymentStatusMeta(a.status).label}.
              </li>
            ))}
          </ul>
        </Notice>
      )}
      {prepaid && !paid && (
        <Notice
          tone="ok"
          title={`Đã thanh toán trước khi lập hợp đồng, lúc ${formatMoment(contract.paymentConfirmedAt)}`}
        >
          Khách đã trả {formatMoney(contract.totalAmount, contract.currency)} cho báo giá đã đồng ý tại công trình.
          Duyệt bản ký xong là hợp đồng thành đã thanh toán, không thu lần hai.
        </Notice>
      )}
      {paid ? (
        <Notice tone="ok" title={`Đã thanh toán đủ lúc ${formatMoment(view.current?.paidAt ?? contract.paidAt)}`}>
          {paidCash ? 'Tiền mặt đã được ghi nhận. ' : ''}Lịch thi công kỹ thuật viên đã hẹn được hệ thống tự xác nhận;
          hợp đồng chưa có lịch thì tạo dự án ở mục Thi công.
          {installationsPath && (
            <span className="mt-3 flex">
              <ButtonLink to={installationsPath} size="sm" variant="info" icon="construction">
                Hợp đồng chờ tạo dự án
              </ButtonLink>
            </span>
          )}
        </Notice>
      ) : (
        view.current === null &&
        view.contractStatus === 'SIGNED' && (
          <p className="text-body text-fg-2">Khách chưa chọn cách thanh toán (PayOS hoặc tiền mặt).</p>
        )
      )}
      <Facts
        items={[
          { k: 'Số tiền phải trả', v: formatMoney(view.amount, view.currency) },
          { k: 'Trạng thái hợp đồng', v: contractStatusLabel(view.contractStatus) },
          ...(prepaid && !paid
            ? [{ k: 'Thanh toán', v: <Badge tone="ok">Đã nhận đủ</Badge> }]
            : state
              ? [{ k: 'Thanh toán', v: <Badge tone={state.tone}>{state.staff}</Badge> }]
              : []),
          ...(view.current
            ? [
                {
                  k: 'Lần thanh toán hiện tại',
                  v: (
                    <Badge tone={paymentStatusMeta(view.current.status).tone}>
                      {paymentStatusMeta(view.current.status).label}
                    </Badge>
                  ),
                },
              ]
            : []),
          ...(view.current?.providerReference
            ? [
                {
                  k: view.current.method === 'CASH' ? 'Số phiếu thu' : 'Mã giao dịch',
                  v: view.current.providerReference,
                },
              ]
            : []),
          ...(paidCash?.evidenceFileId ? [{ k: 'Phiếu thu', v: <FileInfo fileId={paidCash.evidenceFileId} /> }] : []),
          ...(paidCash?.confirmationNote ? [{ k: 'Ghi chú xác nhận', v: paidCash.confirmationNote }] : []),
        ]}
      />
      {view.attempts.length > 0 && (
        <Table stack>
          <thead>
            <tr>
              <Th>Mã đơn</Th>
              <Th>Cách trả</Th>
              <Th className="text-right">Số tiền</Th>
              <Th>Trạng thái</Th>
              <Th>Tạo lúc</Th>
              <Th>Hết hạn / trả lúc</Th>
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
                  <Td label="Cách trả">{PAYMENT_METHODS[a.method] ?? a.method}</Td>
                  <Td label="Số tiền" className="tnum lg:text-right">
                    {formatMoney(a.amount, a.currency)}
                  </Td>
                  <Td label="Trạng thái">
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </Td>
                  <Td label="Tạo lúc" className="tnum">
                    {formatMoment(a.createdAt)}
                  </Td>
                  <Td label="Hết hạn / trả lúc" className="tnum">
                    {a.paidAt
                      ? `Trả ${formatMoment(a.paidAt)}`
                      : a.expiresAt
                        ? `Hết hạn ${formatMoment(a.expiresAt)}`
                        : 'Không có hạn'}
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      )}
      {view.history && view.history.length > 0 && (
        <details className="border-t border-line pt-4">
          <summary className="tap cursor-pointer text-body font-medium text-fg">
            Lịch sử thanh toán ({view.history.length})
          </summary>
          <ol className="mt-3 space-y-2">
            {view.history.map((e, i) => (
              <li key={`${e.paymentAttemptId}-${i}`} className="text-body text-fg-2">
                <span className="tnum text-fg">{formatMoment(e.createdAt)}</span> {paymentEventLabel(e.eventType)}
                {e.toStatus ? `: ${paymentStatusMeta(e.toStatus).label}` : ''} ({paymentSourceLabel(e.source)})
              </li>
            ))}
          </ol>
        </details>
      )}
      {confirming && (
        <CashConfirmDialog
          target={{
            title: contractTitle(contract),
            amount: contract.totalAmount,
            currency: contract.currency,
            successText: 'Đã ghi nhận khách trả tiền mặt. Hợp đồng đã thanh toán.',
            confirm: (body) => confirmCash.mutateAsync({ contractId: contract.contractId, body }),
          }}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  )
}
