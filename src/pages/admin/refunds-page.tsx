import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox, DateField, Field, Input, TimeSelect } from '@/components/common/ui/field'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { EmptyState, ErrorState, Skeleton, UnavailableState } from '@/components/common/ui/states'
import { REFUND_REFERENCE_MAX, refundedAtError, refundedAtValue } from '@/features/after-sales/adminAfterSalesRules'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatMoment, todayVn } from '@/features/scheduling/schedulingDisplay'
import { useRecordRefundMutation } from '@/hooks/useAdminAfterSales'
import { useRefundsQuery } from '@/hooks/useManagerAfterSales'
import { errorMessage, isApiError, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import { ROUTES, withId } from '@/routes/paths'
import type { RefundView } from '@/types/res/managerAfterSalesRes'
import { formatMoney } from '@/utils/format'

// Hoàn tiền làm tay: quản lý duyệt ở cổng quản lý, quản trị ghi nhận ở đây sau khi đã chuyển tiền ngoài hệ thống.
// Không có lệnh hoàn qua PayOS. Ngày đã chuyển tiền quyết định khoản này thuộc kỳ nào trên báo cáo sau bán

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

const STATUS_BADGE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string; icon: string }
> = {
  APPROVED: {
    label: 'Chờ ghi nhận',
    bg: 'bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    icon: 'hourglass_empty',
  },
  PENDING_APPROVAL: {
    label: 'Chờ quản lý duyệt',
    bg: 'bg-blue-500/15',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
    icon: 'pending',
  },
  REFUNDED: {
    label: 'Đã hoàn tiền',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    icon: 'check_circle',
  },
  REJECTED: {
    label: 'Từ chối hoàn',
    bg: 'bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
    icon: 'cancel',
  },
}

const vnd = (amount: number | null) => formatMoney(amount, 'VND')

function sourceLabel(r: RefundView) {
  if (r.subscriptionId) return `Hủy gói dịch vụ ${shortCode(r.subscriptionId)}`
  if (r.requestId) return `Yêu cầu bảo hành, sửa chữa ${shortCode(r.requestId)}`
  if (r.quotationId) return `Báo giá ${shortCode(r.quotationId)}`
  return 'Khoản thanh toán'
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
              { k: 'Khoản', v: sourceLabel(refund) },
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

export function AdminRefundsPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('nhom')
  const group: Group = raw && raw in GROUP_LABELS ? (raw as Group) : 'approved'
  const query = useRefundsQuery()
  const [recording, setRecording] = useState<RefundView | null>(null)

  const all = query.data ?? []
  const count = (g: Group) => (g === 'all' ? all.length : all.filter((r) => r.status === GROUP_STATUS[g]).length)
  const items = group === 'all' ? all : all.filter((r) => r.status === GROUP_STATUS[group])
  const unavailable = query.isError && isFeatureUnavailable(query.error)

  const setGroup = (next: Group) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'approved') p.delete('nhom')
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
          chips={(['approved', 'pending', 'refunded', 'rejected', 'all'] as const).map((g) => ({
            value: g,
            label: GROUP_LABELS[g],
            count: count(g),
          }))}
          value={group}
          onChange={setGroup}
        />
      )}

      {/* Thanh chú thích trạng thái & tổng hợp */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-container border border-line bg-surface-1 px-4 py-2.5 text-meta shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-fg-2">Chú thích trạng thái:</span>
          {Object.entries(STATUS_BADGE_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot}`} />
              <span className="text-fg-2">{cfg.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 text-fg-3">
          <span>
            Hiển thị: <strong className="text-fg-1 font-semibold">{items.length}</strong> khoản
          </span>
          {group === 'approved' && items.length > 0 && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Cần ghi nhận: {vnd(items.reduce((sum, r) => sum + (r.approvedAmount ?? 0), 0))}
            </span>
          )}
        </div>
      </div>

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
                : `Không có khoản nào: ${GROUP_LABELS[group].toLowerCase()}`
            }
            description={group === 'approved' ? 'Khoản quản lý đã duyệt sẽ hiện ở đây.' : undefined}
          />
        ) : (
          <div className="overflow-hidden rounded-container border border-line bg-surface-1 shadow-sm">
            <Table stack>
              <thead>
                <tr>
                  <Th className="border-r border-line">Khoản hoàn tiền</Th>
                  <Th className="border-r border-line text-right">Số tiền</Th>
                  <Th className="border-r border-line">Trạng thái</Th>
                  <Th className="border-r border-line">Thời gian & Tham chiếu</Th>
                  <Th className="text-right">
                    <span>Thao tác</span>
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {items.map((r) => {
                  const cfg = STATUS_BADGE_CONFIG[r.status] ?? {
                    label: r.status,
                    bg: 'bg-surface-2',
                    text: 'text-fg-2',
                    border: 'border-line',
                    dot: 'bg-fg-3',
                    icon: 'help_outline',
                  }
                  return (
                    <Tr key={r.refundId} className="hover:bg-surface-2/60 transition-colors">
                      <Td label="Khoản" className="border-r border-line">
                        <p className="font-semibold text-fg">
                          {r.requestId ? (
                            <Link to={withId(ROUTES.admin.afterSalesRequest, r.requestId)} className="ui-link font-medium">
                              {sourceLabel(r)}
                            </Link>
                          ) : (
                            sourceLabel(r)
                          )}
                        </p>
                        <p className="mt-0.5 line-clamp-2 max-w-[56ch] text-meta text-fg-3">{r.reason}</p>
                        {r.decisionNote && (
                          <p className="mt-0.5 max-w-[56ch] text-meta text-fg-2 italic">Quản lý: {r.decisionNote}</p>
                        )}
                      </Td>
                      <Td label="Số tiền" className="border-r border-line tnum text-right whitespace-nowrap">
                        <span className="font-semibold text-fg">
                          {r.approvedAmount != null ? vnd(r.approvedAmount) : vnd(r.originalAmount)}
                        </span>
                        {r.approvedAmount != null && r.approvedAmount !== r.originalAmount && (
                          <p className="text-meta text-fg-3 line-through">Gốc {vnd(r.originalAmount)}</p>
                        )}
                      </Td>
                      <Td label="Trạng thái" className="border-r border-line whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-meta font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          <Icon name={cfg.icon} className="text-[16px]" aria-hidden />
                          <span>{cfg.label}</span>
                        </span>
                      </Td>
                      <Td label="Thời gian" className="border-r border-line tnum text-meta whitespace-nowrap text-fg-2">
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
                        {r.status === 'APPROVED' && (
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
            <div className="border-t border-line bg-surface-2/40 px-4 py-2 text-meta text-fg-3 flex items-center justify-between">
              <span>Đang hiển thị {items.length} trên tổng {all.length} khoản hoàn tiền</span>
              <span className="tnum">Cổng quản trị SmartSolar</span>
            </div>
          </div>
        )}
      </section>

      <RecordDialog
        key={recording?.refundId ?? 'closed'}
        refund={recording}
        onOpenChange={(open) => !open && setRecording(null)}
      />
    </>
  )
}
