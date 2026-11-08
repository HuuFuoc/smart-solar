import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox, DateField, Field, Input, TimeSelect } from '@/components/common/ui/field'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { EmptyState, ErrorState, Skeleton, UnavailableState } from '@/components/common/ui/states'
import { RefundDecisionDialog } from '@/features/after-sales/RefundDecisionDialog'
import { REFUND_REFERENCE_MAX, refundedAtError, refundedAtValue } from '@/features/after-sales/adminAfterSalesRules'
import { refundSourceLabel, refundStatusMeta } from '@/features/after-sales/managerAfterSalesDisplay'
import { canDecideRefund, refundReasonText } from '@/features/after-sales/managerAfterSalesRules'
import { formatMoment, todayVn } from '@/features/scheduling/schedulingDisplay'
import { useRecordRefundMutation } from '@/hooks/useAdminAfterSales'
import { useRefundsQuery } from '@/hooks/useManagerAfterSales'
import { errorMessage, isApiError, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import { ROUTES, withId } from '@/routes/paths'
import type { RefundView } from '@/types/res/managerAfterSalesRes'
import { formatMoney } from '@/utils/format'

// Hoàn tiền làm tay, quản lý và quản trị dùng chung: khoản chờ duyệt thì quản lý (backend cho cả quản trị) duyệt số tiền
// hoặc từ chối; khoản đã duyệt thì quản trị ghi nhận sau khi đã chuyển tiền ngoài hệ thống. Không có lệnh hoàn qua PayOS.
// Ngày đã chuyển tiền quyết định khoản này thuộc kỳ nào trên báo cáo sau bán. Khoản do huỷ gói, dừng việc, không thực
// hiện được đã được duyệt sẵn khi quản lý quyết định, nên không xét lần hai

type Group = 'approved' | 'pending' | 'refunded' | 'rejected' | 'all'

const GROUP_STATUS: Record<Exclude<Group, 'all'>, string> = {
  approved: 'APPROVED',
  pending: 'PENDING_APPROVAL',
  refunded: 'REFUNDED',
  rejected: 'REJECTED',
}

const GROUP_LABELS: Record<Group, string> = {
  approved: 'Chờ ghi nhận',
  pending: 'Chờ quản lý duyệt',
  refunded: 'Đã hoàn',
  rejected: 'Không hoàn',
  all: 'Tất cả',
}

const vnd = (amount: number | null) => formatMoney(amount, 'VND')

type Viewer = 'manager' | 'admin'

// Quản lý mở trang ở nhóm chờ mình duyệt, quản trị ở nhóm chờ mình ghi nhận
const GROUP_ORDER: Record<Viewer, Group[]> = {
  manager: ['pending', 'approved', 'refunded', 'rejected', 'all'],
  admin: ['approved', 'pending', 'refunded', 'rejected', 'all'],
}

const REQUEST_PATTERN: Record<Viewer, string> = {
  manager: ROUTES.manage.afterSalesRequest,
  admin: ROUTES.admin.afterSalesRequest,
}

/** Giờ hiện tại làm tròn xuống 15 phút, theo giờ Việt Nam */
function nowQuarter() {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date())
  const [h, m] = time.split(':').map(Number) as [number, number]
  return `${String(h).padStart(2, '0')}:${String(Math.floor(m / 15) * 15).padStart(2, '0')}`
}

function RecordDialog({ refund, onOpenChange }: { refund: RefundView | null; onOpenChange: (open: boolean) => void }) {
  const record = useRecordRefundMutation()
  const [date, setDate] = useState(todayVn)
  const [time, setTime] = useState(nowQuarter)
  const [reference, setReference] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const atError = checked ? refundedAtError(date, time) : undefined

  async function submit() {
    if (!refund || record.isPending) return
    setChecked(true)
    setError(null)
    if (refundedAtError(date, time) || !confirmed) return
    try {
      await record.mutateAsync({
        refundId: refund.refundId,
        body: { refundedAt: refundedAtValue(date, time), reference: reference.trim() || null },
      })
      toast.success(`Đã ghi nhận hoàn ${vnd(refund.approvedAmount)}`)
      onOpenChange(false)
    } catch (e) {
      if (isApiError(e) && (e.code === 'AFTER_SALES_INVALID_STATE' || e.code === 'REFUND_NOT_FOUND')) {
        toast.error(errorMessage(e))
        onOpenChange(false)
        return
      }
      setError(errorMessage(e))
    }
  }

  return (
    <ModalDialog
      open={Boolean(refund)}
      onOpenChange={onOpenChange}
      dismissible={!record.isPending}
      aria-label="Ghi nhận đã hoàn tiền"
    >
      {refund && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <DialogTitle>Ghi nhận đã hoàn tiền</DialogTitle>
          <KeyValueList
            className="mt-4"
            items={[
              { k: 'Khoản', v: refundSourceLabel(refund) },
              { k: 'Số tiền đã duyệt', v: <span className="tnum font-semibold">{vnd(refund.approvedAmount)}</span> },
              { k: 'Quản lý duyệt lúc', v: formatMoment(refund.approvedAt) },
            ]}
          />
          <Notice tone="warn" className="mt-4">
            Chỉ ghi nhận khi tiền đã thực sự chuyển cho khách. Ghi nhận rồi thì không sửa được; khách nhận thông báo đã
            được hoàn tiền.
          </Notice>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Ngày đã chuyển tiền" required htmlFor="refund-date" error={atError}>
              <DateField
                id="refund-date"
                value={date}
                max={todayVn()}
                onChange={setDate}
                aria-invalid={atError ? true : undefined}
              />
            </Field>
            <Field
              label="Giờ"
              required
              htmlFor="refund-time"
              hint="Giờ Việt Nam. Quyết định khoản này thuộc kỳ báo cáo nào."
            >
              <TimeSelect id="refund-time" value={time} step={15} onChange={setTime} />
            </Field>
            <Field
              label="Mã giao dịch"
              htmlFor="refund-reference"
              hint={`Mã chuyển khoản hoặc ghi chú để đối chiếu, tối đa ${REFUND_REFERENCE_MAX} ký tự.`}
              className="sm:col-span-2"
            >
              <Input
                id="refund-reference"
                value={reference}
                maxLength={REFUND_REFERENCE_MAX}
                onChange={(e) => setReference(e.target.value)}
              />
            </Field>
          </div>
          <Checkbox
            className="mt-4"
            label={`Tôi xác nhận đã chuyển ${vnd(refund.approvedAmount)} cho khách`}
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          {checked && !confirmed && (
            <p className="mt-2 text-meta text-danger" role="alert">
              Đánh dấu xác nhận trước khi ghi nhận.
            </p>
          )}
          {error && (
            <div role="alert" className="mt-4">
              <Notice tone="danger">{error}</Notice>
            </div>
          )}
          <DialogFooter>
            <Button icon="close" variant="secondary" disabled={record.isPending} onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button icon="task_alt" type="submit" variant="primary" disabled={record.isPending}>
              {record.isPending ? 'Đang ghi nhận…' : 'Ghi nhận đã hoàn'}
            </Button>
          </DialogFooter>
        </form>
      )}
    </ModalDialog>
  )
}

function RefundsPage({ viewer }: { viewer: Viewer }) {
  const [params, setParams] = useSearchParams()
  const raw = params.get('nhom')
  const order = GROUP_ORDER[viewer]
  const start = order[0]!
  const group: Group = raw && raw in GROUP_LABELS ? (raw as Group) : start
  const query = useRefundsQuery()
  const [recording, setRecording] = useState<RefundView | null>(null)
  const [deciding, setDeciding] = useState<RefundView | null>(null)

  const all = query.data ?? []
  const count = (g: Group) => (g === 'all' ? all.length : all.filter((r) => r.status === GROUP_STATUS[g]).length)
  const items = group === 'all' ? all : all.filter((r) => r.status === GROUP_STATUS[group])
  const unavailable = query.isError && isFeatureUnavailable(query.error)

  const setGroup = (next: Group) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === start) p.delete('nhom')
        else p.set('nhom', next)
        return p
      },
      { replace: true },
    )

  return (
    <>
      <PageHeader
        title="Hoàn tiền"
        description="Tiền được hoàn ngoài hệ thống (chuyển khoản…). Quản lý duyệt số tiền, quản trị ghi nhận khi đã chuyển xong."
      />

      {query.data && (
        <FilterChips
          label="Nhóm khoản hoàn tiền"
          className="mb-4"
          chips={order.map((g) => ({
            value: g,
            label: GROUP_LABELS[g],
            count: count(g),
          }))}
          value={group}
          onChange={setGroup}
        />
      )}

      {group === 'approved' && items.length > 0 && (
        <p className="mb-4 text-body text-fg-2">
          Tổng chờ ghi nhận:{' '}
          <span className="tnum font-semibold text-fg">
            {vnd(items.reduce((sum, r) => sum + (r.approvedAmount ?? 0), 0))}
          </span>
        </p>
      )}

      <section aria-label={GROUP_LABELS[group]} aria-busy={query.isFetching}>
        {query.isPending ? (
          <div aria-label="Đang tải" className="space-y-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : unavailable ? (
          <UnavailableState
            title="Hoàn tiền chưa sẵn sàng."
            message={errorMessage(query.error)}
            pendingMigrations={pendingMigrationsOf(query.error)}
          />
        ) : query.isError ? (
          <ErrorState
            message={errorMessage(query.error, 'Không tải được danh sách hoàn tiền.')}
            onRetry={() => void query.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title={
              group === 'approved'
                ? 'Không có khoản nào chờ ghi nhận'
                : group === 'pending'
                  ? 'Không có khoản nào chờ duyệt'
                  : `Không có khoản nào: ${GROUP_LABELS[group].toLowerCase()}`
            }
            description={
              group === 'approved'
                ? 'Khoản quản lý đã duyệt sẽ hiện ở đây.'
                : group === 'pending'
                  ? 'Khoản hệ thống tự tạo (khách trả tiền nhưng không áp dụng được, công trình bị huỷ trước khi bàn giao) hiện ở đây.'
                  : undefined
            }
          />
        ) : (
          <div>
            <Table stack>
              <thead>
                <tr>
                  <Th>Khoản hoàn tiền</Th>
                  <Th className="text-right">Số tiền</Th>
                  <Th>Trạng thái</Th>
                  <Th>Thời gian & Tham chiếu</Th>
                  <Th className="text-right">
                    <span className="sr-only">Thao tác</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  return (
                    <Tr key={r.refundId}>
                      <Td label="Khoản">
                        <p className="font-semibold text-fg">
                          {r.requestId ? (
                            <Link to={withId(REQUEST_PATTERN[viewer], r.requestId)} className="ui-link font-medium">
                              {refundSourceLabel(r)}
                            </Link>
                          ) : (
                            refundSourceLabel(r)
                          )}
                        </p>
                        <p className="mt-0.5 line-clamp-2 max-w-[56ch] text-meta text-fg-3">
                          {refundReasonText(r.reason)}
                        </p>
                        {r.decisionNote && (
                          <p className="mt-0.5 max-w-[56ch] text-meta text-fg-2 italic">
                            Quản lý ghi: {r.decisionNote}
                          </p>
                        )}
                      </Td>
                      <Td label="Số tiền" className="tnum text-right whitespace-nowrap">
                        <span className="font-semibold text-fg">
                          {r.approvedAmount != null ? vnd(r.approvedAmount) : vnd(r.originalAmount)}
                        </span>
                        {r.approvedAmount != null && r.approvedAmount !== r.originalAmount && (
                          <p className="text-meta text-fg-3 line-through">Gốc {vnd(r.originalAmount)}</p>
                        )}
                      </Td>
                      <Td label="Trạng thái" className="whitespace-nowrap">
                        <Badge tone={refundStatusMeta(r.status).tone}>{refundStatusMeta(r.status).label}</Badge>
                      </Td>
                      <Td label="Thời gian" className="tnum text-meta whitespace-nowrap text-fg-2">
                        {r.refundedAt ? (
                          <>
                            <div className="font-medium text-fg">Hoàn lúc {formatMoment(r.refundedAt)}</div>
                            {r.refundReference && <p className="text-fg-3">Mã GD: {r.refundReference}</p>}
                          </>
                        ) : r.approvedAt ? (
                          <div className="font-medium text-fg">Duyệt lúc {formatMoment(r.approvedAt)}</div>
                        ) : (
                          <div className="text-fg-3">Tạo lúc {formatMoment(r.createdAt)}</div>
                        )}
                      </Td>
                      <Td label="Thao tác" className="text-right whitespace-nowrap">
                        {canDecideRefund(r) && (
                          <Button size="sm" variant="info" icon="gavel" onClick={() => setDeciding(r)}>
                            Xét hoàn tiền
                          </Button>
                        )}
                        {viewer === 'admin' && r.status === 'APPROVED' && (
                          <Button size="sm" variant="soft" icon="task_alt" onClick={() => setRecording(r)}>
                            Ghi nhận đã hoàn
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
          </div>
        )}
      </section>

      {viewer === 'admin' && (
        <RecordDialog
          key={recording?.refundId ?? 'closed'}
          refund={recording}
          onOpenChange={(open) => !open && setRecording(null)}
        />
      )}
      <RefundDecisionDialog refund={deciding} onClose={() => setDeciding(null)} />
    </>
  )
}

export function ManageRefundsPage() {
  return <RefundsPage viewer="manager" />
}

export function AdminRefundsPage() {
  return <RefundsPage viewer="admin" />
}
