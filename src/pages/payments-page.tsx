import { useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  PAYMENT_DESK_METHODS,
  PAYMENT_DESK_STATUSES,
  PAYMENT_ITEM_STATUSES,
  PAYMENT_ITEM_TYPES,
  UNAPPLIED_FILTERS,
  UNAPPLIED_STATUSES,
} from '@/common/paymentDesk'
import { PAYMENT_METHODS } from '@/common/contract'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { DateField, Field, Select } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { ListPager } from '@/components/common/ui/pagination'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { paymentStatusMeta } from '@/features/after-sales/afterSalesDisplay'
import { receiptDetailPath } from '@/features/cash-receipts/cashReceiptRoutes'
import { CashConfirmDialog } from '@/features/contracts/CashConfirmDialog'
import { unappliedReasonText } from '@/features/payments/paymentDeskDisplay'
import { formatMoment, vnTimestamp } from '@/features/scheduling/schedulingDisplay'
import { useCashReceiptQueueQuery } from '@/hooks/useCashReceipts'
import {
  useConfirmAttemptCashMutation,
  usePaymentDeskQuery,
  usePendingCashCount,
  useUnappliedMoneyQuery,
} from '@/hooks/usePaymentDesk'
import { ROUTES, withId } from '@/routes/paths'
import type { StaffPaymentAttemptView } from '@/types/res/staffPaymentsRes'
import { formatMoney } from '@/utils/format'

// Bàn thu tiền (quản lý và quản trị dùng chung): mặc định là các lần khách chọn trả tiền mặt đang chờ thu. Xác nhận đã thu
// theo từng lần thanh toán (hợp đồng, gói, báo giá sửa chữa); số tiền phải đúng bằng số cần thu. Tab "Tiền chưa áp" là sổ chỉ
// đọc các khoản tiền đã nhận mà không áp vào khoản nào: không duyệt hay hoàn tiền trên web. Mọi danh sách phân trang ở backend.
// Lần trả tiền mặt có phiếu thu kỹ thuật viên đã gửi đang chờ thì xét duyệt phiếu thu, không xác nhận trực tiếp (backend trả 409)

const PAGE_SIZE = 20

type Tab = '' | 'tien-chua-ap'
const TABS: { value: Tab; label: string }[] = [
  { value: '', label: 'Lần thanh toán' },
  { value: 'tien-chua-ap', label: 'Tiền chưa áp' },
]

type Viewer = 'manager' | 'admin'
const CONTRACT_PATTERN = { manager: ROUTES.manage.contract, admin: ROUTES.admin.contract }
const CONTRACTS = { manager: ROUTES.manage.contracts, admin: ROUTES.admin.contracts }

/** Lần thanh toán một khoản của hợp đồng 30/70: số tiền là của khoản đó, không phải cả hợp đồng */
const isInstallment = (row: StaffPaymentAttemptView) => row.lines.some((l) => l.itemType === 'CONTRACT_INSTALLMENT')

const pageOf = (raw: string | null) => Math.max(1, Number.parseInt(raw ?? '1', 10) || 1)

/** Phiếu thu đang chờ, theo lần thanh toán (tối đa 100 phiếu mới nhất; máy chủ chưa có phiếu thu thì rỗng) */
const RECEIPTS_UNDER_REVIEW = { status: 'SUBMITTED', page: 1, pageSize: 100 } as const

function Lines({ row }: { row: StaffPaymentAttemptView }) {
  if (row.lines.length === 0) return <span className="text-fg-2">Hợp đồng lắp đặt</span>
  return (
    <ul className="space-y-1">
      {row.lines.map((l, i) => {
        const status = PAYMENT_ITEM_STATUSES[l.status]
        return (
          <li key={i} className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-fg">{PAYMENT_ITEM_TYPES[l.itemType] ?? l.itemType}</span>
            <span className="tnum text-fg-2">{formatMoney(l.amount, row.attempt.currency)}</span>
            {status && <Badge tone={status.tone}>{status.label}</Badge>}
          </li>
        )
      })}
    </ul>
  )
}

function PaymentsTab({ viewer }: { viewer: Viewer }) {
  const [params, setParams] = useSearchParams()
  const method = params.get('cach') ?? 'CASH'
  const status = params.get('trang-thai') ?? 'PENDING'
  const fromDate = params.get('tu') ?? ''
  const toDate = params.get('den') ?? ''
  const page = pageOf(params.get('trang'))
  const query = usePaymentDeskQuery({
    method: method || null,
    status: status || null,
    from: fromDate ? vnTimestamp(fromDate, '00:00') : null,
    to: toDate ? vnTimestamp(toDate, '23:59') : null,
    page,
    pageSize: PAGE_SIZE,
  })
  const confirm = useConfirmAttemptCashMutation()
  const [confirming, setConfirming] = useState<StaffPaymentAttemptView | null>(null)
  const reviewQueue = useCashReceiptQueueQuery(RECEIPTS_UNDER_REVIEW)
  const underReview = new Map((reviewQueue.data?.items ?? []).map((r) => [r.receipt.paymentAttemptId, r.receipt]))

  // Đổi bộ lọc thì về trang 1
  const set = (key: string, value: string) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set(key, value)
        p.delete('trang')
        return p
      },
      { replace: true },
    )
  const goPage = (next: number) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      p.set('trang', String(next))
      return p
    })

  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Cách trả" htmlFor="desk-method">
          <Select id="desk-method" value={method} active={method !== ''} onChange={(e) => set('cach', e.target.value)}>
            {PAYMENT_DESK_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Trạng thái" htmlFor="desk-status">
          <Select
            id="desk-status"
            value={status}
            active={status !== ''}
            onChange={(e) => set('trang-thai', e.target.value)}
          >
            {PAYMENT_DESK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tạo từ ngày" htmlFor="desk-from">
          <DateField id="desk-from" value={fromDate} max={toDate || undefined} onChange={(v) => set('tu', v)} />
        </Field>
        <Field label="Đến ngày" htmlFor="desk-to">
          <DateField id="desk-to" value={toDate} min={fromDate || undefined} onChange={(v) => set('den', v)} />
        </Field>
      </div>

      <QueryBoundary query={query}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState
              title={
                method === 'CASH' && status === 'PENDING'
                  ? 'Không có lần trả tiền mặt nào chờ thu'
                  : 'Không có lần thanh toán nào'
              }
            />
          ) : (
            <>
              <Table stack="xl">
                <thead>
                  <tr>
                    <Th>Lần thanh toán</Th>
                    <Th>Khoản</Th>
                    <Th>Trạng thái</Th>
                    <Th className="text-right">Số tiền</Th>
                    <Th>
                      <span className="sr-only">Thao tác</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => {
                    const a = row.attempt
                    const meta = paymentStatusMeta(a.status, a.method)
                    const contractId = a.contractId ?? row.lines.find((l) => l.contractId)?.contractId ?? null
                    const installment = isInstallment(row)
                    const cashPending = a.method === 'CASH' && a.status === 'PENDING'
                    const receipt = cashPending ? underReview.get(a.paymentAttemptId) : undefined
                    return (
                      <Tr key={a.paymentAttemptId}>
                        <Td label="Lần thanh toán">
                          <p className="tnum text-fg">#{a.orderCode}</p>
                          <p className="tnum text-meta text-fg-2">
                            {PAYMENT_METHODS[a.method] ?? a.method}, tạo {formatMoment(a.createdAt)}
                          </p>
                        </Td>
                        <Td label="Khoản">
                          <Lines row={row} />
                        </Td>
                        <Td label="Trạng thái">
                          <Badge tone={cashPending ? 'danger' : meta.tone}>{meta.label}</Badge>
                          {a.paidAt && <p className="tnum text-meta text-fg-2">Trả lúc {formatMoment(a.paidAt)}</p>}
                          {a.providerReference && a.method === 'CASH' && (
                            <p className="text-meta text-fg-2">Phiếu thu {a.providerReference}</p>
                          )}
                          {receipt && (
                            <p className="text-meta text-fg-2">
                              Kỹ thuật viên đã gửi phiếu thu {receipt.receiptNumber}
                            </p>
                          )}
                        </Td>
                        <Td label="Số tiền" className="tnum xl:text-right">
                          {formatMoney(a.amount, a.currency)}
                        </Td>
                        <Td>
                          <div className="flex flex-wrap gap-2 xl:justify-end">
                            {receipt ? (
                              <ButtonLink
                                size="sm"
                                icon="fact_check"
                                variant="soft"
                                to={receiptDetailPath(viewer, receipt.cashReceiptId)}
                              >
                                Xét duyệt phiếu thu
                              </ButtonLink>
                            ) : (
                              cashPending && (
                                <Button size="sm" icon="task_alt" variant="soft" onClick={() => setConfirming(row)}>
                                  Xác nhận đã thu
                                </Button>
                              )
                            )}
                            {contractId && (
                              <ButtonLink
                                size="sm"
                                icon="history_edu"
                                variant="info"
                                to={withId(CONTRACT_PATTERN[viewer], contractId)}
                              >
                                Mở hợp đồng
                              </ButtonLink>
                            )}
                            {/* Dòng của một khoản 30/70 không có mã hợp đồng: mở danh sách hợp đồng của khách đó */}
                            {!contractId && installment && (
                              <ButtonLink
                                size="sm"
                                icon="history_edu"
                                variant="info"
                                to={`${CONTRACTS[viewer]}?khach=${encodeURIComponent(row.customerUserId)}`}
                              >
                                Hợp đồng của khách
                              </ButtonLink>
                            )}
                          </div>
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
              <ListPager
                page={data.page}
                pages={data.totalPages}
                from={(data.page - 1) * data.pageSize + 1}
                to={(data.page - 1) * data.pageSize + data.items.length}
                total={data.totalItems}
                noun="lần thanh toán"
                onChange={goPage}
              />
            </>
          )
        }
      </QueryBoundary>

      {confirming && (
        <CashConfirmDialog
          target={{
            title: `Lần thanh toán #${confirming.attempt.orderCode} (${
              confirming.lines.map((l) => PAYMENT_ITEM_TYPES[l.itemType] ?? l.itemType).join(', ') || 'Hợp đồng lắp đặt'
            })`,
            // Một khoản 30/70: số phải thu đúng bằng khoản đó (backend ghi trong `amount` của lần thanh toán)
            amount: confirming.attempt.amount,
            currency: confirming.attempt.currency,
            successText: confirming.lines.some((l) => l.itemType === 'INSTALLATION_QUOTATION')
              ? 'Đã ghi nhận khách trả tiền mặt. Hợp đồng được lập từ báo giá đã thanh toán.'
              : isInstallment(confirming)
                ? 'Đã ghi nhận khách trả tiền mặt cho khoản này của hợp đồng 30/70.'
                : 'Đã ghi nhận khách trả tiền mặt.',
            confirm: (body) => confirm.mutateAsync({ attemptId: confirming.attempt.paymentAttemptId, body }),
          }}
          onClose={() => setConfirming(null)}
        />
      )}
    </>
  )
}

function UnappliedTab() {
  const [params, setParams] = useSearchParams()
  const status = params.get('loai') ?? ''
  const page = pageOf(params.get('trang'))
  const query = useUnappliedMoneyQuery(status || null, page, PAGE_SIZE)
  const setStatus = (next: string) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.set('loai', next)
        p.delete('trang')
        return p
      },
      { replace: true },
    )

  return (
    <>
      <Notice className="mb-4">
        Tiền đã nhận nhưng không áp vào khoản nào (trả trùng, sai số tiền, trả sau hạn). Không tính vào doanh thu. Việc
        trả lại khách do kế toán làm ngoài hệ thống.
      </Notice>
      <Field label="Trạng thái" htmlFor="unapplied-status" className="mb-4 max-w-xs">
        <Select id="unapplied-status" value={status} active={status !== ''} onChange={(e) => setStatus(e.target.value)}>
          {UNAPPLIED_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </Field>
      <QueryBoundary query={query}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState title="Không có khoản tiền chưa áp nào" />
          ) : (
            <>
              <Table stack>
                <thead>
                  <tr>
                    <Th>Ghi nhận lúc</Th>
                    <Th>Lý do</Th>
                    <Th>Trạng thái</Th>
                    <Th className="text-right">Số tiền</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r) => {
                    const meta = UNAPPLIED_STATUSES[r.status] ?? { label: r.status, tone: 'neutral' as const }
                    return (
                      <Tr key={r.recordId}>
                        <Td label="Ghi nhận lúc" className="tnum">
                          {formatMoment(r.createdAt)}
                        </Td>
                        <Td label="Lý do">{unappliedReasonText(r.reason)}</Td>
                        <Td label="Trạng thái">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                          {r.refundedAt && (
                            <p className="tnum text-meta text-fg-2">Trả lại lúc {formatMoment(r.refundedAt)}</p>
                          )}
                        </Td>
                        <Td label="Số tiền" className="tnum lg:text-right">
                          {formatMoney(r.amount, 'VND')}
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
              <ListPager
                page={data.page}
                pages={data.totalPages}
                from={(data.page - 1) * data.pageSize + 1}
                to={(data.page - 1) * data.pageSize + data.items.length}
                total={data.totalItems}
                noun="khoản"
                onChange={(next) =>
                  setParams((prev) => {
                    const p = new URLSearchParams(prev)
                    p.set('trang', String(next))
                    return p
                  })
                }
              />
            </>
          )
        }
      </QueryBoundary>
    </>
  )
}

function PaymentsPage({ viewer }: { viewer: Viewer }) {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('muc') === 'tien-chua-ap' ? 'tien-chua-ap' : ''
  const pending = usePendingCashCount().data

  return (
    <div>
      <PageHeader
        title="Thu tiền"
        description={pending ? <span className="text-danger">{pending} lần trả tiền mặt chờ xác nhận</span> : undefined}
      />
      <FilterChips
        className="mb-4"
        label="Mục"
        chips={TABS}
        value={tab}
        onChange={(next) => setParams(next ? { muc: next } : {}, { replace: true })}
      />
      {tab === 'tien-chua-ap' ? <UnappliedTab /> : <PaymentsTab viewer={viewer} />}
    </div>
  )
}

export function ManagePaymentsPage() {
  return <PaymentsPage viewer="manager" />
}

export function AdminPaymentsPage() {
  return <PaymentsPage viewer="admin" />
}
