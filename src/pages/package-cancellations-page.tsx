import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Field, Input, Radio, Textarea } from '@/components/common/ui/field'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, ErrorState, Skeleton, UnavailableState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { usePageCrumb } from '@/components/layout/page-crumb'
import {
  formatDurationMonths,
  packageKindLabel,
  subscriptionStatusMeta,
} from '@/features/after-sales/afterSalesDisplay'
import { managerActionError } from '@/features/after-sales/managerAfterSalesDisplay'
import {
  PACKAGE_CANCELLATION_NOTE_MAX,
  canDecidePackageCancellation,
  packageCancellationBody,
  packageCancellationErrors,
  type PackageCancellationInput,
} from '@/features/after-sales/managerAfterSalesRules'
import { formatVnd } from '@/features/after-sales/serviceDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  useDecidePackageCancellationMutation,
  useManagerSubscriptionQuery,
  usePackageCancellationsQuery,
} from '@/hooks/useManagerAfterSales'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage, isApiError, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import type { ManagerSubscriptionView } from '@/types/res/managerAfterSalesRes'

// Gói khách đã trả tiền nhưng xin huỷ trước khi bắt đầu kỳ (CANCELLATION_REQUESTED). Quản lý xem hàng chờ, mở từng gói rồi duyệt
// hoặc từ chối. Duyệt: gói bị huỷ và backend tạo khoản hoàn "đã duyệt" với số quản lý nhập (mặc định cả giá gói); tiền chưa được
// chuyển, quản trị chuyển ngoài hệ thống rồi ghi nhận ở "Hoàn tiền". Từ chối: gói về "Đã thanh toán". Không có revision: hai người
// cùng quyết định thì người sau nhận AFTER_SALES_INVALID_STATE

const customerOf = (s: ManagerSubscriptionView) => s.customerName || 'Khách chưa có họ tên'

export function ManagePackageCancellationsPage() {
  const query = usePackageCancellationsQuery()
  const items = query.data ?? []
  const unavailable = query.isError && isFeatureUnavailable(query.error)
  return (
    <>
      <PageHeader
        title="Huỷ gói"
        description={
          items.length > 0 ? (
            <Badge tone="danger">{items.length} gói chờ xét huỷ</Badge>
          ) : (
            'Gói khách đã trả tiền và xin huỷ trước khi bắt đầu kỳ.'
          )
        }
      />
      <section aria-label="Gói chờ xét huỷ" aria-busy={query.isFetching}>
        {query.isPending ? (
          <div aria-label="Đang tải" className="space-y-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : unavailable ? (
          <UnavailableState
            title="Hàng chờ huỷ gói chưa sẵn sàng."
            message={errorMessage(query.error)}
            pendingMigrations={pendingMigrationsOf(query.error)}
          />
        ) : query.isError ? (
          <ErrorState
            message={errorMessage(query.error, 'Không tải được gói chờ xét huỷ.')}
            onRetry={() => void query.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="Không có gói nào chờ xét huỷ"
            description="Khi khách xin huỷ một gói đã trả tiền mà chưa bắt đầu kỳ, gói hiện ở đây."
          />
        ) : (
          <Table stack>
            <thead>
              <tr>
                <Th>Gói</Th>
                <Th>Khách</Th>
                <Th className="text-right">Giá đã trả</Th>
                <Th>Xin huỷ lúc</Th>
                <Th className="text-right">
                  <span className="sr-only">Thao tác</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const s = item.subscription
                return (
                  <Tr key={s.subscriptionId}>
                    <Td label="Gói">
                      <p className="font-medium text-fg">{s.packageName}</p>
                      <p className="text-meta text-fg-2">{packageKindLabel(s.kind)}</p>
                    </Td>
                    <Td label="Khách">{customerOf(item)}</Td>
                    <Td label="Giá đã trả" className="tnum text-right">
                      {formatVnd(s.price)}
                    </Td>
                    <Td label="Xin huỷ lúc" className="tnum">
                      {formatMoment(s.cancellationRequestedAt)}
                    </Td>
                    <Td className="text-right">
                      <ButtonLink
                        to={withId(ROUTES.manage.packageCancellation, s.subscriptionId)}
                        size="sm"
                        variant="info"
                        icon="fact_check"
                      >
                        Xét huỷ
                      </ButtonLink>
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </section>
    </>
  )
}

function DecisionPanel({ item }: { item: ManagerSubscriptionView }) {
  const s = item.subscription
  const decide = useDecidePackageCancellationMutation()
  const [input, setInput] = useState<PackageCancellationInput>({ approve: true, amount: String(s.price), note: '' })
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const priceText = formatVnd(s.price)
  const errors = checked ? packageCancellationErrors(s.price, input, priceText) : {}

  async function submit() {
    if (decide.isPending) return
    setChecked(true)
    setError(null)
    if (Object.keys(packageCancellationErrors(s.price, input, priceText)).length > 0) return
    try {
      const result = await decide.mutateAsync({
        subscriptionId: s.subscriptionId,
        body: packageCancellationBody(input),
      })
      toast.success(
        result.status === 'CANCELLED'
          ? 'Đã duyệt huỷ gói. Khoản hoàn đã duyệt, chờ quản trị chuyển tiền và ghi nhận.'
          : 'Đã từ chối huỷ gói. Gói giữ nguyên như đã thanh toán.',
      )
    } catch (e) {
      // Người khác vừa quyết định: dữ liệu đã tải lại, câu báo theo lỗi của backend
      if (isApiError(e) && e.code === 'AFTER_SALES_INVALID_STATE') toast.error(managerActionError(e))
      else setError(managerActionError(e))
    }
  }

  return (
    <Panel>
      <PanelHeader title="Quyết định" />
      <PanelBody>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
          className="space-y-4"
        >
          <fieldset className="space-y-2">
            <legend className="text-body font-medium text-fg">Xét yêu cầu huỷ</legend>
            <Radio
              name="package-cancellation"
              label="Đồng ý huỷ gói và hoàn tiền"
              checked={input.approve}
              disabled={decide.isPending}
              onChange={() => setInput((v) => ({ ...v, approve: true }))}
            />
            <Radio
              name="package-cancellation"
              label="Không đồng ý huỷ"
              checked={!input.approve}
              disabled={decide.isPending}
              onChange={() => setInput((v) => ({ ...v, approve: false }))}
            />
          </fieldset>
          {input.approve ? (
            <Field
              label="Số tiền hoàn (VND)"
              htmlFor="package-refund"
              required
              hint={`Từ 0 đến ${priceText} (giá khách đã trả).`}
              error={errors.amount}
            >
              <Input
                id="package-refund"
                inputMode="numeric"
                className="w-full sm:w-56"
                value={input.amount}
                aria-required
                aria-invalid={errors.amount ? true : undefined}
                disabled={decide.isPending}
                onChange={(e) => setInput((v) => ({ ...v, amount: e.target.value }))}
              />
            </Field>
          ) : (
            <Field
              label="Ghi chú"
              htmlFor="package-note"
              hint={`Không bắt buộc, tối đa ${PACKAGE_CANCELLATION_NOTE_MAX} ký tự. Lưu vào lịch sử của gói.`}
              error={errors.note}
            >
              <Textarea
                id="package-note"
                rows={2}
                maxLength={PACKAGE_CANCELLATION_NOTE_MAX}
                value={input.note}
                aria-invalid={errors.note ? true : undefined}
                disabled={decide.isPending}
                onChange={(e) => setInput((v) => ({ ...v, note: e.target.value }))}
              />
            </Field>
          )}
          {input.approve && (
            <Notice tone="neutral">
              Duyệt chưa phải đã hoàn tiền. Gói bị huỷ ngay; quản trị chuyển tiền cho khách ngoài hệ thống rồi ghi nhận
              ở mục Hoàn tiền.
            </Notice>
          )}
          {error && (
            <div role="alert">
              <Notice tone="danger">{error}</Notice>
            </div>
          )}
          <Button
            type="submit"
            icon={input.approve ? 'check_circle' : 'block'}
            variant={input.approve ? 'primary' : 'danger'}
            disabled={decide.isPending}
          >
            {decide.isPending ? 'Đang gửi…' : input.approve ? 'Duyệt huỷ gói' : 'Từ chối huỷ'}
          </Button>
        </form>
      </PanelBody>
    </Panel>
  )
}

export function ManagePackageCancellationPage() {
  const { id } = useParams()
  const query = useManagerSubscriptionQuery(id)
  usePageCrumb(query.data ? query.data.subscription.packageName : null)
  return (
    <QueryBoundary query={query}>
      {(item) => {
        const s = item.subscription
        const status = subscriptionStatusMeta(s.status)
        return (
          <>
            <PageHeader
              meta={<Badge tone={status.tone}>{status.label}</Badge>}
              title={s.packageName}
              description={`${packageKindLabel(s.kind)}, ${formatDurationMonths(s.durationMonths)}.`}
            />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-4 lg:col-span-2">
                {canDecidePackageCancellation(s) ? (
                  <DecisionPanel key={s.status} item={item} />
                ) : s.status === 'CANCELLED' ? (
                  <Notice tone="ok" title="Gói đã huỷ">
                    Huỷ lúc {formatMoment(item.cancelledAt)}. Khoản hoàn tiền nằm ở{' '}
                    <Link className="ui-link" to={`${ROUTES.manage.refunds}?nhom=approved`}>
                      Hoàn tiền
                    </Link>
                    , chờ quản trị chuyển tiền và ghi nhận.
                  </Notice>
                ) : (
                  <Notice tone="neutral">Gói không còn chờ xét huỷ ({status.label.toLowerCase()}).</Notice>
                )}
              </div>
              <Panel>
                <PanelHeader title="Thông tin" />
                <PanelBody>
                  <KeyValueList
                    items={[
                      { k: 'Khách', v: customerOf(item) },
                      { k: 'Giá đã trả', v: <span className="tnum font-semibold">{formatVnd(s.price)}</span> },
                      { k: 'Thanh toán lúc', v: formatMoment(s.paidAt) },
                      { k: 'Xin huỷ lúc', v: formatMoment(s.cancellationRequestedAt) },
                      { k: 'Lý do của khách', v: item.cancellationReason || '—' },
                      {
                        k: 'Hợp đồng',
                        v: (
                          <Link className="ui-link" to={withId(ROUTES.manage.contract, s.contractId)}>
                            Xem hợp đồng
                          </Link>
                        ),
                      },
                    ]}
                  />
                </PanelBody>
              </Panel>
            </div>
          </>
        )
      }}
    </QueryBoundary>
  )
}
