import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ErrorState, UnavailableState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { Facts } from '@/features/pre-surveys/Facts'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  contractStatusLabel,
  paymentEventLabel,
  paymentSourceLabel,
  paymentStatusMeta,
} from '@/features/contracts/contractDisplay'
import {
  hasPaymentStage,
  isAwaitingPayment,
  paymentsNeedingAttention,
  type ContractViewer,
} from '@/features/contracts/contractRules'
import { contractKeys, useContractPaymentsQuery } from '@/hooks/useContracts'
import { errorMessage, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { ContractPaymentView } from '@/types/res/staffPaymentsRes'
import { formatMoney } from '@/utils/format'

// Trạng thái thanh toán của hợp đồng phía nhân viên (GET /contracts/{id}/payments). Chỉ đọc: hệ thống xác nhận đã nhận
// tiền qua PayOS, nhân viên không tự đánh dấu. Lần thanh toán cần xử lý tay (số tiền lệch, trả hai lần) tô đỏ

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
            Khách thanh toán 100% qua PayOS sau khi bản ký được duyệt. Hiện chưa tới bước này.
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
  const paid = view.contractStatus === 'PAID'
  return (
    <>
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
      {paid ? (
        <Notice tone="ok" title={`Đã thanh toán đủ lúc ${formatMoment(view.current?.paidAt ?? contract.paidAt)}`}>
          {viewer === 'sales' ? (
            'Quản lý tạo dự án thi công từ hợp đồng này.'
          ) : (
            <>
              Tạo dự án thi công ở mục Thi công.
              {installationsPath && (
                <span className="mt-3 flex">
                  <ButtonLink to={installationsPath} size="sm" variant="info" icon="construction">
                    Hợp đồng chờ tạo dự án
                  </ButtonLink>
                </span>
              )}
            </>
          )}
        </Notice>
      ) : (
        view.current === null &&
        view.contractStatus === 'SIGNED' && <p className="text-body text-fg-2">Khách chưa mở link thanh toán nào.</p>
      )}
      <Facts
        items={[
          { k: 'Số tiền phải trả', v: formatMoney(view.amount, view.currency) },
          { k: 'Trạng thái hợp đồng', v: contractStatusLabel(view.contractStatus) },
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
          ...(view.current?.providerReference ? [{ k: 'Mã giao dịch', v: view.current.providerReference }] : []),
        ]}
      />
      {view.attempts.length > 0 && (
        <Table stack>
          <thead>
            <tr>
              <Th>Mã đơn</Th>
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
                    {a.paidAt ? `Trả ${formatMoment(a.paidAt)}` : `Hết hạn ${formatMoment(a.expiresAt)}`}
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
    </>
  )
}
