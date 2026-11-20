import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { CONTRACT_STATUSES } from '@/common/contract'
import { PAYMENT_PLAN_FILTERS } from '@/common/paymentPlan'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge, type Tone } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Field, Input, SearchInput, Select, fieldMessageId } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { ListPager } from '@/components/common/ui/pagination'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, ErrorState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { ContractKpiTile } from '@/features/contracts/ContractKpiTile'
import { ContractTermsDialog } from '@/features/contracts/ContractTermsDialog'
import { ContractVersionList } from '@/features/contracts/ContractVersionList'
import { compactVnd, contractStatusMeta, shareText } from '@/features/contracts/contractDisplay'
import { acceptedQuotation, canCreateContract, extractId } from '@/features/contracts/contractRules'
import { formatVnd, stageMeta } from '@/features/payment-plan/paymentPlanDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useSurveyRequestContractsQuery } from '@/hooks/useContracts'
import { useContractDirectoryQuery, useContractDirectorySummaryQuery } from '@/hooks/usePaymentPlan'
import { useQuotationsQuery } from '@/hooks/useSalesQuotations'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { ContractDirectoryQuery } from '@/types/req/paymentPlanReq'
import type { ContractDirectoryItem } from '@/types/res/paymentPlanRes'

// Danh sách mọi hợp đồng cho kinh doanh, kỹ thuật viên, quản lý, quản trị (chỉ đọc; backend 7d27054). Tìm, lọc và phân trang ở
// server, bộ lọc nằm trên địa chỉ. Tách rõ đã trả 30% và đã trả đủ: hợp đồng đã ký chưa chắc đã trả đủ. Quản lý / quản trị còn
// đường khôi phục của luồng cũ: mở theo mã yêu cầu khảo sát rồi "Lập hợp đồng" khi đã có thanh toán đã xác minh.
// Giao diện theo thiết kế người dùng gửi ngày 19/11/2026 (kiểu .ct-* ở contract-detail.css): ô số liệu, bộ lọc một hàng, bảng
// trong thẻ. Ô số liệu và tệp xuất đọc mọi hợp đồng khớp bộ lọc (useContractDirectorySummaryQuery), không chỉ trang đang xem

type Viewer = 'sales' | 'technician' | 'manager' | 'admin'

const DETAIL: Record<Viewer, string> = {
  sales: ROUTES.ops.contract,
  technician: ROUTES.tech.contract,
  manager: ROUTES.manage.contract,
  admin: ROUTES.admin.contract,
}

const PAGE_SIZE = 20

/** Hợp đồng cũ còn ở bước nháp / ký (chưa ký xong) */
const LEGACY_PENDING = ['DRAFT', 'ISSUED', 'AWAITING_SIGNATURE', 'UNDER_REVIEW', 'SIGNATURE_REJECTED']
/** Hợp đồng 30/70 chưa trả 30% hoặc đã trả 30% mà chưa ký giấy */
const PLAN_PENDING = ['DRAFT_CREATED', 'DEPOSIT_VERIFIED']

function queryFrom(params: URLSearchParams): ContractDirectoryQuery {
  const plan = params.get('goi')
  return {
    page: Math.max(1, Number(params.get('trang')) || 1),
    pageSize: PAGE_SIZE,
    search: params.get('q') || undefined,
    status: params.get('trang-thai') || undefined,
    paymentPlan: plan === 'DEPOSIT_30_BALANCE_70' || plan === 'LEGACY' ? plan : undefined,
    overdue: params.get('qua-han') === '1' ? true : undefined,
    customerId: params.get('khach') || undefined,
    surveyRequestId: params.get('yeu-cau') || undefined,
  }
}

/** Bản đã huỷ hoặc đã có phụ lục thay: không tính vào giá trị, không còn việc */
const isClosed = (item: ContractDirectoryItem) =>
  item.status === 'SUPERSEDED' || item.status === 'DISCARDED' || item.stage === 'DISCARDED'

const isPending = (item: ContractDirectoryItem) =>
  !isClosed(item) &&
  (item.paymentPlan !== null ? PLAN_PENDING.includes(item.stage) : LEGACY_PENDING.includes(item.status))

/** Nhãn trạng thái trong bảng: đã trả đủ tô xanh, bản nháp cũ tô cam để nổi lên giữa danh sách */
function rowStatus(item: ContractDirectoryItem): { label: string; tone: Tone } {
  if (item.overdue) return { label: 'Quá hạn', tone: 'danger' }
  if (item.paymentPlan !== null) {
    const meta = stageMeta(item.stage)
    return item.stage === 'FULLY_PAID' ? { ...meta, tone: 'ok' } : meta
  }
  const meta = contractStatusMeta(item.status)
  return item.status === 'DRAFT' ? { ...meta, tone: 'warn' } : meta
}

const csvCell = (value: string | number | null | undefined) => {
  const text = value == null ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Tệp CSV có BOM để Excel đọc đúng tiếng Việt; tiền là số nguyên VND */
function exportCsv(items: ContractDirectoryItem[]) {
  const header = [
    'Số hợp đồng',
    'Phiên bản',
    'Ngày lập',
    'Khách hàng',
    'Số điện thoại',
    'Công trình',
    'Cách trả',
    'Tình hình',
    'Giá trị (VND)',
    'Đã trả (VND)',
    'Còn lại (VND)',
    'Hạn gần nhất',
  ]
  const rows = items.map((item) => [
    item.contractNumber,
    item.version,
    formatMoment(item.createdAt),
    item.customerName,
    item.customerPhone,
    item.propertyName,
    item.paymentPlan !== null ? 'Trả 30/70' : 'Trả 100% (cách cũ)',
    rowStatus(item).label,
    item.totalAmount,
    item.paid,
    item.outstanding,
    item.nextDueAt ? formatMoment(item.nextDueAt) : '',
  ])
  const csv = '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `hop-dong_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function Kpis({
  items,
  totalItems,
  partial,
}: {
  items: ContractDirectoryItem[]
  totalItems: number
  partial: boolean
}) {
  const live = items.filter((i) => !isClosed(i))
  const planCount = items.filter((i) => i.paymentPlan !== null).length
  const done = live.filter((i) => i.fullyPaid).length
  const pending = items.filter(isPending).length
  const overdue = live.filter((i) => i.overdue).length
  const value = live.reduce((sum, i) => sum + i.totalAmount, 0)
  const paid = live.reduce((sum, i) => sum + i.paid, 0)
  const [valueText, valueUnit] = compactVnd(value)
  const [paidText, paidUnit] = compactVnd(paid)
  const share = shareText(done, live.length)

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <ContractKpiTile
        label="Tổng hợp đồng"
        value={totalItems}
        unit="hồ sơ"
        icon="description"
        tone="accent"
        note={
          partial
            ? `Số liệu tính trên ${items.length} hợp đồng mới nhất`
            : `${planCount} trả 30/70, ${items.length - planCount} trả 100% (cách cũ)`
        }
      />
      <ContractKpiTile
        label="Đã hoàn tất / đã trả đủ"
        value={done}
        unit="hồ sơ"
        icon="check"
        tone="ok"
        valueTone="ok"
        note={share ? `Chiếm ${share} hợp đồng còn hiệu lực` : 'Chưa có hợp đồng còn hiệu lực'}
      />
      <ContractKpiTile
        label="Bản nháp & chờ ký"
        value={pending}
        unit="hồ sơ"
        icon="error"
        tone="warn"
        valueTone={pending > 0 ? 'warn' : undefined}
        noteTone={overdue > 0 ? 'danger' : 'warn'}
        note={
          overdue > 0
            ? `${overdue} hợp đồng có khoản quá hạn`
            : pending > 0
              ? 'Cần theo dõi ký và thu tiền đợt'
              : 'Không có hồ sơ đang chờ'
        }
      />
      <ContractKpiTile
        label="Tổng giá trị hợp đồng"
        value={valueText}
        unit={valueUnit}
        icon="payments"
        tone="info"
        noteTone="neutral"
        note={`Đã thu ${paidText} ${paidUnit}, không tính bản đã huỷ / đã thay`}
      />
    </div>
  )
}

function DirectoryRow({ item, detail }: { item: ContractDirectoryItem; detail: string }) {
  const plan = item.paymentPlan !== null
  const status = rowStatus(item)
  const to = withId(detail, item.contractId)
  return (
    <Tr>
      <Td label="Hợp đồng">
        <div className="flex items-start gap-2">
          <span className="ct-dot mt-[7px] max-lg:hidden" data-tone={status.tone} aria-hidden />
          <div className="min-w-0">
            <Link
              className={
                status.tone === 'neutral' || status.tone === 'warn'
                  ? 'ui-link font-semibold text-fg'
                  : 'ui-link font-semibold'
              }
              to={to}
            >
              {item.contractNumber}
            </Link>
            <p className="tnum text-meta text-fg-2">
              Phiên bản {item.version}, lập {formatMoment(item.createdAt)}
            </p>
          </div>
        </div>
      </Td>
      <Td label="Khách hàng / công trình">
        <span className="font-medium text-fg">{item.customerName}</span>
        {item.customerPhone && <p className="tnum text-meta text-fg-2">{item.customerPhone}</p>}
        {item.propertyName && (
          <span className="ct-chip" title={item.propertyName}>
            {item.propertyName}
          </span>
        )}
      </Td>
      <Td label="Tình hình & tiến độ">
        <Badge tone={status.tone}>
          <span className="ct-dot size-1.5!" data-tone={status.tone} aria-hidden />
          {status.label}
        </Badge>
        <p className="mt-1 text-meta text-fg-2">{plan ? 'Trả 30/70' : 'Trả 100% (cách cũ)'}</p>
      </Td>
      <Td label="Giá trị hợp đồng" className="tnum">
        <span className="font-semibold text-fg">{formatVnd(item.totalAmount)}</span>
        {isClosed(item) ? (
          <p className="text-meta text-fg-2">Không còn hiệu lực</p>
        ) : item.fullyPaid ? (
          <p className="text-meta text-ok">Đã trả {formatVnd(item.paid)} (đủ)</p>
        ) : (
          <p className={item.overdue ? 'text-meta text-danger' : 'text-meta text-warn'}>
            Đã trả {formatVnd(item.paid)}
            {item.outstanding > 0 && `, còn ${formatVnd(item.outstanding)}`}
          </p>
        )}
        {plan && !item.fullyPaid && !isClosed(item) && (
          <p className="text-meta text-fg-2">{item.depositPaid ? 'Đã trả 30%' : 'Chưa trả 30%'}</p>
        )}
      </Td>
      <Td label="Hạn gần nhất" className="tnum lg:text-center">
        {item.nextDueAt ? (
          <span className={item.overdue ? 'text-danger' : 'text-fg'}>{formatMoment(item.nextDueAt)}</span>
        ) : (
          <span className="text-fg-3">—</span>
        )}
      </Td>
      <Td className="lg:text-right">
        <ButtonLink to={to} size="sm" variant="secondary" icon="visibility" className="max-lg:w-full">
          Xem chi tiết
        </ButtonLink>
      </Td>
    </Tr>
  )
}

function RequestContracts({
  surveyRequestId,
  contractPattern,
  viewer,
}: {
  surveyRequestId: string
  contractPattern: string
  viewer: 'manager' | 'admin'
}) {
  const navigate = useNavigate()
  const contracts = useSurveyRequestContractsQuery(surveyRequestId)
  const quotations = useQuotationsQuery(surveyRequestId)
  const [creating, setCreating] = useState(false)
  const accepted = acceptedQuotation(quotations.data ?? [])
  const creatable = contracts.data !== undefined && canCreateContract(accepted, contracts.data)

  return (
    <Panel>
      <PanelHeader title="Hợp đồng của yêu cầu (khôi phục luồng cũ)" />
      <PanelBody className="space-y-4">
        {contracts.isPending ? (
          <p className="text-body text-fg-2">Đang tải…</p>
        ) : contracts.data === undefined ? (
          <ErrorState
            title="Không mở được yêu cầu này."
            message={errorMessage(contracts.error)}
            onRetry={() => void contracts.refetch()}
          />
        ) : contracts.data.length === 0 ? (
          <EmptyState
            title="Yêu cầu chưa có hợp đồng"
            description={
              creatable
                ? `Báo giá ${accepted!.quoteNumber} đã được đồng ý theo cách cũ. Chỉ lập tay khi đã có thanh toán đã xác minh mà hợp đồng chưa có.`
                : 'Hợp đồng 30/70 được lập ngay khi kỹ thuật viên ghi khách đồng ý báo giá.'
            }
            action={
              creatable ? (
                <Button icon="add" variant="soft" onClick={() => setCreating(true)}>
                  Lập hợp đồng
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ContractVersionList versions={contracts.data} detailPattern={contractPattern} />
        )}
        {quotations.isError && (
          <Notice tone="warn">Không đọc được báo giá của yêu cầu ({errorMessage(quotations.error)}).</Notice>
        )}
      </PanelBody>
      {creating && accepted && (
        <ContractTermsDialog
          target={{ mode: 'create', quotation: accepted }}
          viewer={viewer}
          onClose={() => setCreating(false)}
          onDone={(view) => void navigate(withId(contractPattern, view.contractId))}
        />
      )}
    </Panel>
  )
}

function ContractsPage({ viewer }: { viewer: Viewer }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const query = queryFrom(params)
  const directory = useContractDirectoryQuery(query)
  const summary = useContractDirectorySummaryQuery({
    search: query.search,
    status: query.status,
    paymentPlan: query.paymentPlan,
    overdue: query.overdue,
    customerId: query.customerId,
    surveyRequestId: query.surveyRequestId,
  })
  const [text, setText] = useState(query.search ?? '')
  const [lookup, setLookup] = useState('')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const staffWriter = viewer === 'manager' || viewer === 'admin'

  function update(change: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(change)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('trang' in change)) next.delete('trang')
    setParams(next, { replace: true })
  }

  function search(e: FormEvent) {
    e.preventDefault()
    update({ q: text.trim() || null })
  }

  function open(e: FormEvent) {
    e.preventDefault()
    const id = extractId(lookup)
    if (!id) return setLookupError('Dán mã hợp đồng đầy đủ (dạng 8-4-4-4-12 ký tự) hoặc đường dẫn có mã đó.')
    setLookupError(null)
    void navigate(withId(DETAIL[viewer], id))
  }

  const filtered = Boolean(query.search || query.status || query.paymentPlan || query.overdue || query.customerId)
  const refreshing = directory.isFetching || summary.isFetching
  const syncedAt = directory.dataUpdatedAt > 0 ? formatMoment(new Date(directory.dataUpdatedAt).toISOString()) : null

  return (
    <div className="ct-page space-y-6">
      <div data-page-header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-figure font-bold">Hợp đồng</h1>
          <p className="mt-1 text-body text-fg-2">
            Danh sách theo dõi hợp đồng, thanh toán theo đợt và tiến độ ký của mọi công trình.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              icon="refresh"
              disabled={refreshing}
              onClick={() => {
                void directory.refetch()
                void summary.refetch()
              }}
            >
              {refreshing ? 'Đang tải…' : 'Làm mới'}
            </Button>
            <Button
              icon="file_save"
              disabled={!summary.data || summary.data.items.length === 0}
              onClick={() => summary.data && exportCsv(summary.data.items)}
              title="Tải tệp CSV mở bằng Excel, gồm mọi hợp đồng khớp bộ lọc"
            >
              Xuất Excel
            </Button>
          </div>
          {syncedAt && (
            <p className="flex items-center gap-1.5 text-meta text-fg-2">
              <Icon name="check_circle" className="text-[16px] text-ok" />
              <span className="tnum">Dữ liệu đồng bộ lúc: {syncedAt}</span>
            </p>
          )}
        </div>
      </div>

      {summary.data ? (
        <Kpis items={summary.data.items} totalItems={summary.data.totalItems} partial={summary.data.partial} />
      ) : summary.isError ? (
        <Notice tone="warn">Không tải được số liệu tổng ({errorMessage(summary.error)}).</Notice>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="ct-card h-32 animate-pulse" />
          ))}
        </div>
      )}

      <div className="ct-card p-3! sm:p-4!">
        <div className="flex flex-wrap items-center gap-3">
          <form noValidate onSubmit={search} className="flex min-w-72 flex-[2] items-center gap-2">
            <SearchInput
              className="min-w-0 flex-1"
              aria-label="Tìm theo số hợp đồng, tên, số điện thoại hoặc email của khách"
              placeholder="Số hợp đồng, tên, số điện thoại, email"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onClear={() => {
                setText('')
                update({ q: null })
              }}
            />
            <Button type="submit" icon="search" variant="primary">
              Tìm
            </Button>
          </form>
          <Select
            className="min-w-40 flex-1"
            aria-label="Cách trả"
            active={Boolean(query.paymentPlan)}
            value={query.paymentPlan ?? ''}
            onChange={(e) => update({ goi: e.target.value || null })}
          >
            <option value="">Mọi cách trả</option>
            {Object.entries(PAYMENT_PLAN_FILTERS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            className="min-w-48 flex-1"
            aria-label="Trạng thái hợp đồng"
            active={Boolean(query.status)}
            value={query.status ?? ''}
            onChange={(e) => update({ 'trang-thai': e.target.value || null })}
          >
            <option value="">Mọi trạng thái hợp đồng</option>
            {Object.entries(CONTRACT_STATUSES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.staff}
              </option>
            ))}
          </Select>
          <Select
            className="min-w-40 flex-1"
            aria-label="Quá hạn"
            active={query.overdue === true}
            value={query.overdue ? '1' : ''}
            onChange={(e) => update({ 'qua-han': e.target.value || null })}
          >
            <option value="">Mọi thời hạn</option>
            <option value="1">Chỉ khoản quá hạn</option>
          </Select>
          {filtered && (
            <Button
              variant="ghost"
              bleed={false}
              icon="filter_alt_off"
              onClick={() => {
                setText('')
                setParams(new URLSearchParams(), { replace: true })
              }}
            >
              Bỏ lọc
            </Button>
          )}
        </div>
      </div>

      <QueryBoundary query={directory}>
        {(data) =>
          data.items.length === 0 ? (
            <div className="ct-card">
              <EmptyState
                title={filtered ? 'Không có hợp đồng khớp bộ lọc' : 'Chưa có hợp đồng'}
                description={
                  filtered
                    ? undefined
                    : 'Hợp đồng 30/70 được lập khi kỹ thuật viên ghi khách đồng ý báo giá tại công trình.'
                }
              />
            </div>
          ) : (
            <div className="ct-card p-0!">
              <div className="ct-table rounded-[14px]! border-0!">
                <Table stack>
                  <thead>
                    <tr>
                      <Th>Hợp đồng & phiên bản</Th>
                      <Th>Khách hàng / công trình</Th>
                      <Th>Tình hình & tiến độ</Th>
                      <Th>Giá trị hợp đồng</Th>
                      <Th className="lg:text-center">Hạn gần nhất</Th>
                      <Th className="lg:text-right">Thao tác</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <DirectoryRow key={item.contractId} item={item} detail={DETAIL[viewer]} />
                    ))}
                  </tbody>
                </Table>
              </div>
              {data.totalPages > 1 && (
                <div className="border-t border-line px-4 py-3">
                  <ListPager
                    page={data.page}
                    pages={data.totalPages}
                    from={(data.page - 1) * data.pageSize + 1}
                    to={(data.page - 1) * data.pageSize + data.items.length}
                    total={data.totalItems}
                    noun="hợp đồng"
                    onChange={(page) => update({ trang: page > 1 ? String(page) : null })}
                  />
                </div>
              )}
            </div>
          )
        }
      </QueryBoundary>

      <div className="ct-card">
        <h2 className="text-body font-bold">Mở theo mã hợp đồng</h2>
        <form noValidate onSubmit={open} className="mt-3 flex flex-wrap items-end gap-3">
          <Field
            label="Mã hợp đồng"
            htmlFor="contract-lookup"
            error={lookupError ?? undefined}
            className="min-w-64 flex-1"
          >
            <Input
              id="contract-lookup"
              value={lookup}
              aria-invalid={Boolean(lookupError) || undefined}
              aria-describedby={fieldMessageId('contract-lookup')}
              onChange={(e) => setLookup(e.target.value)}
            />
          </Field>
          <Button type="submit" icon="open_in_new" variant="info">
            Mở
          </Button>
        </form>
      </div>

      {staffWriter && query.surveyRequestId && (
        <RequestContracts
          surveyRequestId={query.surveyRequestId}
          contractPattern={DETAIL[viewer]}
          viewer={viewer as 'manager' | 'admin'}
        />
      )}
    </div>
  )
}

export function OpsContractsPage() {
  return <ContractsPage viewer="sales" />
}

export function TechContractsPage() {
  return <ContractsPage viewer="technician" />
}

export function ManageContractsPage() {
  return <ContractsPage viewer="manager" />
}

export function AdminContractsPage() {
  return <ContractsPage viewer="admin" />
}
